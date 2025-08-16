/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `AmmAdapter` collects and normalizes data from Stellar constant-product liquidity pools
 * defined in `config.strategy.amms`. It fetches recent trades, pool state and computes
 * key metrics such as VWAP, volumes, and estimated fee APR. Exposing fetch(), normalize(),
 * distill(), and observables to the ingestion/distillation pipeline.
 *
 * NOTE: Using a sample size (vs cutoff time) helps counter potential low activity pools so
 * calculations on the APR series are time-weighted using natural period length.
 */

const { Horizon, Asset, getLiquidityPoolId, LiquidityPoolFeeV18 } = require('@stellar/stellar-sdk');
const path = require('path');
const source = path.basename(__filename, '.js');
const { Adapter } = require('.');
const { pick, log } = require('../../utils');
const { AmmSchema, validate } = require('./schemas');

class AmmAdapter extends Adapter {
    static #horizon;

    static async fetch(config, cache) {
        try {
            const poolId = (pair) => {
                let assetA = new Asset(pair.assetA.code, pair.assetA.issuer || undefined);
                let assetB = new Asset(pair.assetB.code, pair.assetB.issuer || undefined);
                if (Asset.compare(assetA, assetB) > 0) {
                    [assetA, assetB] = [assetB, assetA];
                }
                return getLiquidityPoolId('constant_product', { assetA, assetB, fee: LiquidityPoolFeeV18 }).toString('hex');
            };

            const reserve = (pool, type, code, issuer) => pool.reserves.find(r => {
                const [rc, ri] = r.asset.split(':');
                return (r.asset === 'native' && type === r.asset) || (rc === code && ri === issuer);
            });

            const apr = (baseReserve, counterReserve, { fee_bp: feeBp = 30, stats }) => {
                const value = baseReserve.amount
                    + counterReserve.amount * stats.vwap;
                const year = 365 * 24 * 60 * 60 * 1000;
                const rate = feeBp / 10000;
                const span = stats.endTime - stats.startTime;
                return value > 0 && span > 0
                    ? ((stats.base * rate) / value) * (year / span)
                    : 0;
            };

            this.#horizon ||= new Horizon.Server(config.network.horizonUrl, { allowHttp: true });
            const pairs = Array.isArray(config.strategy?.amms)
                ? [...config.strategy.amms]
                : [];
            const data = [];
            for (const pair of pairs) {
                const id = poolId(pair);
                const trades = [];
                let page = await this.#horizon.trades().forLiquidityPool(id).order('desc')
                    .limit(Math.min(pair.sampleSize, 200)).call();
                while (page.records?.length && trades.length < pair.sampleSize) {
                    trades.push(...page.records.slice(0, pair.sampleSize - trades.length));
                    if (!page.next || trades.length >= pair.sampleSize) {
                        break;
                    }
                    page = await page.next();
                }

                if (!trades.length) {
                    continue;
                }

                const normalized = trades.map(t => {
                    const isBase = (base) =>
                        t.base_asset_type === 'native'
                            ? base.code === 'XLM'
                            : t.base_asset_code === base.code && t.base_asset_issuer === base.issuer;
                    if (isBase(pair.assetA)) {
                        return t;
                    }
                    return {
                        ...t,
                        base_asset_type: t.counter_asset_type,
                        base_asset_code: t.counter_asset_code,
                        base_asset_issuer: t.counter_asset_issuer,
                        base_amount: t.counter_amount,
                        counter_asset_type: t.base_asset_type,
                        counter_asset_code: t.base_asset_code,
                        counter_asset_issuer: t.base_asset_issuer,
                        counter_amount: t.base_amount,
                        price: t.price && {
                            n: t.price.d,
                            d: t.price.n
                        },
                        base_is_seller: !t.base_is_seller
                    };
                });

                const trade = normalized[0];
                const { _links, self, transactions, operations, ...pool }
                    = await this.#horizon.liquidityPools().liquidityPoolId(id).call();
                const base = reserve(pool, trade.base_asset_type, trade.base_asset_code, trade.base_asset_issuer);
                const counter = reserve(pool, trade.counter_asset_type, trade.counter_asset_code, trade.counter_asset_issuer);
                const row = {
                    source,
                    ...pool,
                    reserves: {
                        base: {
                            asset: trade.base_asset_type === 'native'
                                ? pick(trade, ['base_asset_type'])
                                : pick(trade, ['base_asset_type', 'base_asset_code', 'base_asset_issuer']),
                            amount: Number(base?.amount ?? 0)
                        },
                        counter: {
                            asset: pick(trade, ['counter_asset_type', 'counter_asset_code', 'counter_asset_issuer']),
                            amount: Number(counter?.amount ?? 0)
                        }
                    }
                };

                if (!row.reserves.base.amount || !row.reserves.counter.amount) {
                    continue;
                }

                row.stats = normalized.reduce((acc, t) => {
                    const time = new Date(t.ledger_close_time).getTime();
                    acc.base += +t.base_amount;
                    acc.counter += +t.counter_amount;
                    acc.startTime = acc.startTime === null ? time : Math.min(acc.startTime, time);
                    acc.endTime = acc.endTime === null ? time : Math.max(acc.endTime, time);
                    if (acc.counter > 0) {
                        acc.vwap = acc.base / acc.counter;
                    }
                    return acc;
                }, { vwap: 0, base: 0, counter: 0, startTime: null, endTime: null, sampleSize: normalized.length });

                row.stats.apr = apr(row.reserves.base, row.reserves.counter, row);
                validate(AmmSchema, row);
                data.push(row);
            }
            return data;
        } catch (err) {
            log.warn('ADAPTER', 'Failed to fetch AMM data:', err);
            return null;
        }
    }

    static normalize(config, input) {
        const ok = validate(AmmSchema, input);
        const { reserves, stats, fee_bp: feeBp, id, source } = ok;
        const base = (a) => a.base_asset_type === 'native'
            ? { code: 'XLM' }
            : { code: a.base_asset_code, issuer: a.base_asset_issuer };
        const counter = (a) => a.counter_asset_type === 'native'
            ? { code: 'XLM' }
            : { code: a.counter_asset_code, issuer: a.counter_asset_issuer };
        return {
            source,
            poolId: id,
            baseAsset: base(reserves.base.asset),
            counterAsset: counter(reserves.counter.asset),
            baseReserve: reserves.base.amount,
            counterReserve: reserves.counter.amount,
            feeBp,
            apr: stats.apr,
            price: stats.vwap,
            volumeBase: stats.base,
            volumeCounter: stats.counter,
            start: stats.startTime,
            end: stats.endTime,
            sampleSize: stats.sampleSize
        };
    }

    static distill(config, row, col) {
        return {
            ...pick(row, ['source', 'poolId', 'baseAsset',
                'counterAsset', 'baseReserve', 'counterReserve']),
            observables: {}
        };
    }

    static get parameters() {
        return {
            observables: {
                pool: {
                    apr: {
                        method: 'twa',
                        accessor: (row, col) => {
                            return {
                                value: row.apr,
                                start: row.start,
                                end: row.end
                            };
                        }
                    },
                    priceSlope: {
                        method: 'slope',
                        accessor: (row, col) => row.price
                    },
                    price: {
                        method: 'raw',
                        accessor: (row, col) => row.price
                    },
                    count: {
                        method: 'streak',
                        accessor: (row, col) => !!row.price
                    }
                }
            },
            dimensions: {
                rows: {
                    predicate: (row) => {
                        return (e) => e.source === 'amm' && e.poolId === row.poolId;
                    }
                }
            }
        };
    }
}

module.exports = { AmmAdapter };
