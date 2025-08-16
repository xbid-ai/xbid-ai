/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `SentimentAdapter` fetches the basic Crypto Fear & Greed index from alternative.me
 * and exposes it to the pipeline.

 * IMPORTANT: This is a free, delayed index with limited accuracy. For production-grade or real-time
 * sentiment data, consider paid providers such as Santiment or Glassnode, which offer richer
 * datasets, on-chain flow metrics, funding rates, inflows/outflows, and historical coverage.
*/

const axios = require('axios');
const path = require('path');
const { Adapter } = require('.');
const { log } = require('../../utils');
const { SentimentSchema, validate } = require('./schemas');

const source = path.basename(__filename, '.js');

class SentimentAdapter extends Adapter {
    static #dataCache;

    static async fetch(config, cache) {
        if (cache && this.#dataCache) {
            return this.#dataCache;
        }
        try {
            const provider = 'https://api.alternative.me/fng/';
            const res = await axios.get(provider, { timeout: 3000 });
            if (!res?.data?.data?.[0]) {
                throw new Error('no data');
            }

            const row = {
                source,
                provider,
                data: res.data.data[0]
            };
            validate(SentimentSchema, row);
            this.#dataCache = [row];
            return this.#dataCache;
        } catch (err) {
            log.warn('ADAPTER', 'Failed to fetch sentiment data', err);
            return null;
        }
    }

    static normalize(config, input) {
        return { ...validate(SentimentSchema, input) };
    }

    static distill(config, row, col) {
        return {
            source: row.source,
            provider: row.provider,
            observables: {}
        };
    }

    static get parameters() {
        return {
            observables: {
                fearandgreed: {
                    index: {
                        method: 'raw',
                        accessor: (row, col) => Number.parseInt(row.data.value, 10)
                    },
                    trend: {
                        method: 'slope',
                        accessor: (row, col) => Number.parseInt(row.data.value, 10)
                    },
                    streak: {
                        method: 'streak',
                        accessor: (row, col) => !!Number.parseInt(row.data.value, 10)
                    },
                    classification: {
                        method: 'raw',
                        accessor: (row, col) => row.data.value_classification
                    }
                }
            }
        };
    }
}

module.exports = { SentimentAdapter };
