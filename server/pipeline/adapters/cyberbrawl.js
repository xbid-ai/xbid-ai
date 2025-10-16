/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `CyberbrawlAdapter` fetches auction house price data from cyberbrawl.io
 * and exposes the slope (linear trendline) of the price series.
*/

const axios = require('axios');
const path = require('path');
const { Adapter } = require('.');
const { log, pick } = require('../../utils');
const { CyberbrawlSchema, validate } = require('./schemas');

const source = path.basename(__filename, '.js');

class CyberbrawlAdapter extends Adapter {
    static #dataCache;
    static async fetch(config, cache) {
        if (cache && this.#dataCache) {
            return this.#dataCache;
        }
        try {
            const provider = 'https://connect.cyberbrawl.io/listings/prices?extended=1';
            const res = await axios.get(provider, { timeout: 3000 });
            if (!res?.data) {
                throw new Error('no data');
            }

            const filter = config.strategy?.cyberbrawl || {};
            const items = Array.isArray(filter.items) && filter.items.length > 0
                ? new Set(filter.items.map((e) => `${e.code}:${e.issuer}`))
                : null;
            const markets = Array.isArray(filter.markets) && filter.markets.length > 0
                ? new Set(filter.markets.map((c) => String(c).toUpperCase()))
                : null;

            const prices = res.data;
            const data = [];
            for (const entry of prices) {
                if (items && !items.has(`${entry.asset?.code}:${entry.asset?.issuer}`)) {
                    continue;
                }
                if (markets && !markets.has(String(entry.market?.code).toUpperCase())) {
                    continue;
                }
                const row = {
                    source,
                    asset: {
                        ...pick(entry.asset, ['code', 'issuer']),
                        ...pick(entry.asset.meta || {}, ['name', 'id'])
                    },
                    market: pick(entry.market, ['code', 'issuer']),
                    prices: {
                        bid: entry.prices?.bid ? { price: Number(entry.prices.bid.price) } : undefined,
                        ask: entry.prices?.ask ? { price: Number(entry.prices.ask.price) } : undefined
                    },
                    updated: entry.updated
                };
                validate(CyberbrawlSchema, row);
                data.push(row);
            }
            this.#dataCache = data;
            return this.#dataCache;
        } catch (err) {
            log.warn('ADAPTER', 'Failed to fetch cyberbrawl data', err);
            return null;
        }
    }

    static normalize(config, input) {
        const ok = validate(CyberbrawlSchema, input);
        return {
            source: ok.source,
            asset: ok.asset,
            market: ok.market,
            prices: ok.prices,
            timestamp: Number(Date.parse(ok.updated))
        };
    }

    static distill(config, row, col) {
        return {
            source: row.source,
            asset: row.asset,
            market: row.market,
            observables: {}
        };
    }

    static get parameters() {
        return {
            observables: {
                ask: {
                    value: {
                        method: 'raw',
                        accessor: (row) => row.prices?.ask?.price
                    },
                    slope: {
                        method: 'slope',
                        accessor: (row) => row.prices?.ask?.price ?? 0
                    },
                    count: {
                        method: 'streak',
                        accessor: (row) => !!row.prices?.ask?.price
                    },
                    freshness: {
                        method: 'raw',
                        accessor: (row) => Math.max(0, Math.floor((Date.now() - row.timestamp) / 1000))
                    }
                },
                bid: {
                    value: {
                        method: 'raw',
                        accessor: (row) => row.prices?.bid?.price
                    },
                    slope: {
                        method: 'slope',
                        accessor: (row) => row.prices?.bid?.price ?? 0
                    },
                    count: {
                        method: 'streak',
                        accessor: (row) => !!row.prices?.bid?.price
                    },
                    freshness: {
                        method: 'raw',
                        accessor: (row) => Math.max(0, Math.floor((Date.now() - row.timestamp) / 1000))
                    }
                }
            },
            dimensions: {
                rows: {
                    predicate: (row) => {
                        return (e) => e.source === 'cyberbrawl'
                            && e.asset?.code === row.asset?.code
                            && e.asset?.issuer === row.asset?.issuer
                            && e.market?.code === row.market?.code
                            && e.market?.issuer === row.market?.issuer;
                    }
                }
            }
        };
    }
}

module.exports = { CyberbrawlAdapter };
