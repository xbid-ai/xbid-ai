/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { rpc, TransactionBuilder, xdr, Memo } = require('@stellar/stellar-sdk');
const { PoolV2, PoolContractV2, RequestType } = require('@blend-capital/blend-sdk');
const { config } = require('../../../config');
const { strToBigInt, log, keypair } = require('../../../utils');
const { stellarRpc, DEFAULT_FEE } = require('../../../utils/network');
const { submitTransaction, logError } = require('./submit');

async function blendSupply(poolId, asset, amount, decimals, env) {
    return await blendRequest(
        RequestType.SupplyCollateral, poolId, asset,
        amount, decimals, env);
}

async function blendWithdraw(poolId, asset, amount, decimals, env) {
    return await blendRequest(
        RequestType.WithdrawCollateral, poolId, asset,
        amount, decimals, env);
}

async function blendRepay(poolId, asset, amount, decimals, env) {
    return await blendRequest(
        RequestType.Repay, poolId, asset, amount,
        decimals, env);
}

async function blendBorrow(poolId, asset, amount, decimals, env) {
    return await blendRequest(
        RequestType.Borrow, poolId, asset, amount,
        decimals, env);
}

async function blendClaim(poolId, env) {
    const network = {
        rpc: config.network.rpcUrl,
        horizonUrl: config.network.horizonUrl,
        passphrase: config.network.passphrase,
        opts: { allowHttp: true }
    };

    const pool = await PoolV2.load(network, poolId);
    const poolContract = new PoolContractV2(poolId);
    const user = await pool.loadUser(keypair.publicKey());
    const { emissions, claimedTokens } = user.estimateEmissions(Array.from(pool.reserves.values()));
    if (!emissions || !claimedTokens.length) {
        log.warn('AGENT', `No emissions to claim for ${poolId}`);
        return null;
    }

    const op = xdr.Operation.fromXDR(
        poolContract
            .claim({ from: keypair.publicKey(), to: keypair.publicKey(), reserve_token_ids: claimedTokens }),
        'base64');
    return await build(op, env);
}

async function blendRequest(type, poolId, asset, amount, decimals, env) {
    const pool = new PoolContractV2(poolId);
    const op = xdr.Operation.fromXDR(
        pool.submit({
            from: keypair.publicKey(),
            spender: keypair.publicKey(),
            to: keypair.publicKey(),
            requests: [
                {
                    amount: strToBigInt(amount, decimals),
                    request_type: type,
                    address: asset
                }
            ]
        }), 'base64');
    return await build(op, env);
}

async function build(op, env) {
    try {
        const builder = new TransactionBuilder(await stellarRpc.getAccount(keypair.publicKey()),
            { fee: env.fee || DEFAULT_FEE, networkPassphrase: config.network.passphrase })
            .addOperation(op);

        if (config.transaction?.memo) {
            builder.addMemo(Memo.text(config.transaction.memo));
        }

        let transaction = builder.setTimeout(config.transaction?.timeout || 60).build();
        const sim = await stellarRpc.simulateTransaction(transaction);
        if (sim.error) {
            log.warn('AGENT', 'Transaction simulation failed', sim.error);
        }
        transaction = rpc.assembleTransaction(transaction, sim).build();
        return await submitTransaction(transaction, env);
    } catch (err) {
        logError(err);
        return null;
    }
}

module.exports = { blendSupply, blendWithdraw, blendRepay, blendBorrow, blendClaim };
