/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { TransactionBuilder, Operation, Asset, getLiquidityPoolId, LiquidityPoolFeeV18, LiquidityPoolAsset, Memo } = require('@stellar/stellar-sdk');
const { config } = require('../../../config');
const { log, keypair } = require('../../../utils');
const { stellarHorizon, DEFAULT_FEE } = require('../../../utils/network');
const { submitTransaction, logError } = require('./submit');

// Slippage cap: 0%..5%, default 0.5%
const slippage = Math.min(0.05, Math.max(0, Number(config.transaction?.slippage ?? 0.005)));

function assertAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
    }
}

async function ammSupply(base, counter, amountA, amountB, env) {
    try {
        assertAmount(amountA);
        assertAmount(amountB);

        const account = await stellarHorizon.loadAccount(keypair.publicKey());
        let assetA = new Asset(base.code, base.issuer || undefined);
        let assetB = new Asset(counter.code, counter.issuer || undefined);

        // Ensure lexicographical order.
        if (Asset.compare(assetA, assetB) > 0) {
            [assetA, assetB] = [assetB, assetA];
            [amountA, amountB] = [amountB, amountA];
        }

        const poolAsset = new LiquidityPoolAsset(assetA, assetB, LiquidityPoolFeeV18);
        const poolId = getLiquidityPoolId('constant_product', { assetA, assetB, fee: LiquidityPoolFeeV18 }).toString('hex');
        const pool = await stellarHorizon.liquidityPools().liquidityPoolId(poolId).call();
        const reserve = ({ code, issuer }) => pool.reserves.find(r => {
            const [rc, ri] = r.asset.split(':');
            return (r.asset === 'native' && code === 'XLM') || (rc === code && ri === issuer);
        });

        const reserveA = reserve(assetA);
        const reserveB = reserve(assetB);
        assertAmount(reserveA?.amount);
        assertAmount(reserveB?.amount);
        const price = Number(reserveA.amount) / Number(reserveB.amount);
        const trustlines = [];
        const existingAssets = new Set(account.balances.map(b =>
            b.asset_type === 'native'
                ? 'XLM'
                : b.asset_type === 'liquidity_pool_shares' ? b.liquidity_pool_id : `${b.asset_code}:${b.asset_issuer}`
        ));

        const addTrustline = (asset) => {
            if (asset.code === 'XLM') {
                return;
            }
            const key = asset.poolId || `${asset.getCode()}:${asset.getIssuer()}`;
            if (!existingAssets.has(key)) {
                trustlines.push(Operation.changeTrust({ asset: asset.poolAsset || asset }));
            }
        };
        addTrustline({ poolId, poolAsset });

        const spread = price * slippage;
        const depositOp = Operation.liquidityPoolDeposit({
            liquidityPoolId: poolId,
            maxAmountA: amountA.toFixed(7),
            maxAmountB: amountB.toFixed(7),
            minPrice: (price - spread).toFixed(7),
            maxPrice: (price + spread).toFixed(7)
        });

        const builder = new TransactionBuilder(account, {
            fee: env.fee || DEFAULT_FEE,
            networkPassphrase: config.network.passphrase
        });

        trustlines.forEach((op) => {
            builder.addOperation(op);
        });
        builder.addOperation(depositOp);

        if (config.transaction?.memo) {
            builder.addMemo(Memo.text(config.transaction.memo));
        }
        const transaction = builder.setTimeout(config.transaction?.timeout || 60).build();
        return await submitTransaction(transaction, env);
    } catch (err) {
        logError(err);
        return null;
    }
}

async function ammWithdraw(base, counter, shares, env) {
    try {
        const account = await stellarHorizon.loadAccount(keypair.publicKey());
        let assetA = new Asset(base.code, base.issuer || undefined);
        let assetB = new Asset(counter.code, counter.issuer || undefined);

        // Ensure lexicographical order.
        if (Asset.compare(assetA, assetB) > 0) {
            [assetA, assetB] = [assetB, assetA];
        }

        const poolAsset = new LiquidityPoolAsset(assetA, assetB, LiquidityPoolFeeV18);
        const poolId = getLiquidityPoolId('constant_product', { assetA, assetB, fee: LiquidityPoolFeeV18 }).toString('hex');
        const userShares = shares
            || parseFloat(account.balances
                .find(b => b.liquidity_pool_id === poolId)?.balance || '0');
        assertAmount(userShares);
        const pool = await stellarHorizon.liquidityPools().liquidityPoolId(poolId).call();
        const totalShares = parseFloat(pool.total_shares);
        assertAmount(totalShares);
        const reserve = ({ code, issuer }) => pool.reserves.find(r => {
            const [rc, ri] = r.asset.split(':');
            return (r.asset === 'native' && code === 'XLM') || (rc === code && ri === issuer);
        });

        const reserveA = reserve(assetA);
        const reserveB = reserve(assetB);
        const amountA = (parseFloat(reserveA.amount) * userShares) / totalShares;
        const amountB = (parseFloat(reserveB.amount) * userShares) / totalShares;
        assertAmount(amountA);
        assertAmount(amountB);

        const withdrawOp = Operation.liquidityPoolWithdraw({
            liquidityPoolId: poolId,
            amount: userShares.toFixed(7),
            minAmountA: (amountA * (1 - slippage)).toFixed(7),
            minAmountB: (amountB * (1 - slippage)).toFixed(7)
        });

        const builder = new TransactionBuilder(account, {
            fee: env.fee || DEFAULT_FEE,
            networkPassphrase: config.network.passphrase
        });

        builder.addOperation(withdrawOp)
            .addOperation(Operation.changeTrust({ asset: poolAsset, limit: '0' }));
        if (config.transaction?.memo) {
            builder.addMemo(Memo.text(config.transaction.memo));
        }
        const transaction = builder.setTimeout(config.transaction?.timeout || 60).build();
        // console.log(transaction.toEnvelope().toXDR('base64'));
        return await submitTransaction(transaction, env);
    } catch (err) {
        logError(err);
        return null;
    }
}

async function sdexSwap(from, to, amount, env) {
    try {
        assertAmount(amount);

        const account = await stellarHorizon.loadAccount(keypair.publicKey());
        const sendAsset = new Asset(from.code, from.issuer || undefined);
        const destAsset = new Asset(to.code, to.issuer || undefined);
        const sendAmount = Number(amount).toFixed(7);

        let trustlineOp;
        if (!destAsset.isNative() && !account.balances.some(b =>
            (b.asset_type !== 'native' && b.asset_code === to.code && b.asset_issuer === to.issuer)
        )) {
            trustlineOp = Operation.changeTrust({ asset: destAsset });
        }

        const quote = await stellarHorizon.strictSendPaths(sendAsset, sendAmount, [destAsset]).call();
        const best = quote.records?.[0];
        if (!best) {
            log.warn('AGENT', `No valid path found ${from.code}->${to.code} for amount ${sendAmount}`);
            return null;
        }

        const destMin = (parseFloat(best.destination_amount) * (1 - slippage)).toFixed(7);
        const path = (best.path || []).map(p =>
            p.asset_type === 'native' ? Asset.native() : new Asset(p.asset_code, p.asset_issuer)
        );
        const builder = new TransactionBuilder(account, {
            fee: env.fee || DEFAULT_FEE,
            networkPassphrase: config.network.passphrase
        });

        if (trustlineOp) {
            builder.addOperation(trustlineOp);
        }

        builder.addOperation(Operation.pathPaymentStrictSend({
            sendAsset,
            sendAmount,
            destination: keypair.publicKey(),
            destAsset,
            destMin,
            path
        }));

        if (config.transaction?.memo) {
            builder.addMemo(Memo.text(config.transaction.memo));
        }

        const transaction = builder.setTimeout(config.transaction?.timeout || 60).build();
        return await submitTransaction(transaction, env);
    } catch (err) {
        logError(err);
        return null;
    }
}

module.exports = { ammSupply, ammWithdraw, sdexSwap };
