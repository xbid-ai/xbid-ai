const { Asset } = require('@stellar/stellar-sdk');
const { stellarHorizon } = require('../../../utils/network');
const { prepare } = require('../../../utils/database');
const { safeJson, log } = require('../../../utils');

const USDC = new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
const cache = new Map();

const price = async(asset) => {
    const key = `${asset.getCode()}|${asset.getIssuer() || ''}`;
    if (cache.has(key)) {
        return cache.get(key);
    }
    if (asset.equals(USDC)) {
        return cache.set(key, 1).get(key);
    }
    const path = await stellarHorizon.strictSendPaths(asset, '1', [USDC]).call();
    if (path.records?.length) {
        const best = path.records.reduce((m, r) => Math.max(m, parseFloat(r.destination_amount)), 0);
        if (best > 0) {
            return cache.set(key, best).get(key);
        }
    }
    return cache.set(key, 0).get(key);
};

const poolEquity = async(id, shares) => {
    const pool = await stellarHorizon.liquidityPools().liquidityPoolId(id).call();
    const total = parseFloat(pool.total_shares) || 0;
    const w = total ? parseFloat(shares) / total : 0;
    let equity = 0;
    for (const reserve of pool.reserves) {
        const asset = reserve.asset === 'native' ? Asset.native() : new Asset(...reserve.asset.split(':'));
        equity += (parseFloat(reserve.amount) * w) * await price(asset);
    }
    return equity;
};

const equity = async context => {
    const toAsset = key => key === 'XLM'
        ? Asset.native()
        : (key.includes(':') ? new Asset(...key.split(':')) : null);
    let balances = 0;
    let supplied = 0;
    let borrowed = 0;
    if (context?.balances) {
        for (const [key, value] of Object.entries(context.balances)) {
            const asset = toAsset(key);
            balances += asset ? parseFloat(value) * await price(asset) : await poolEquity(key, value);
        }
    }
    if (context?.allocations) {
        for (const v of Object.values(context.allocations)) {
            supplied += +v?.supplyTotalUsd || 0;
            borrowed += +v?.borrowTotalUsd || 0;
        }
    }
    return balances + supplied - borrowed;
};

async function calculatePnL(minutes, clearCache) {
    try {
        if (clearCache) {
            cache.clear();
        }
        const query = prepare(`
                WITH w AS (
                SELECT timestamp, context
                FROM transactions
                WHERE timestamp >= strftime('%s','now') - ?
                ORDER BY timestamp ASC
                )
                SELECT * FROM (SELECT timestamp, context FROM w LIMIT 1)
                UNION ALL
                SELECT * FROM (SELECT timestamp, context FROM w ORDER BY timestamp DESC LIMIT 1)
            `);
        const rows = query.all(minutes);
        if (!rows?.length) {
            return null;
        }
        const [first, last] = rows.length > 1 ? rows : [rows[0], rows[0]];
        const startEquity = await equity(safeJson(first.context));
        const endEquity = await equity(safeJson(last.context));
        return {
            minutes,
            start: +first.timestamp,
            end: +last.timestamp,
            startEquity,
            endEquity,
            pnl: endEquity - startEquity,
            pnlPct: startEquity ? ((endEquity - startEquity) / startEquity) * 100 : 0
        };
    } catch (err) {
        log.warn('DAEMON', 'Could not calculate PnL', err);
        return null;
    }
}

module.exports = { calculatePnL };
