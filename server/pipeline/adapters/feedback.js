/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `FeedbackAdapter` aggregates recent LLM activity and usage from its own database (feedback loop)
* including transactions, and messages. It computes average portfolio allocations then derives
* concentration via Herfindahl–Hirschman Index. It also calculates network fees and
* token usage. Exposes fetch(), normalize(), distill(), and observables to the
* ingestion/distillation pipeline.
*
* NOTE: LLM token metrics currently count only 'openai'. TODO Anthropic, Ollama...
*/

const path = require('path');
const { prepare } = require('../../utils/database');
const source = path.basename(__filename, '.js');
const { Adapter } = require('.');
const { safeJson, log } = require('../../utils');
const { FeedbackSchema, validate } = require('./schemas');

class FeedbackAdapter extends Adapter {
    static async fetch(config, cache) {
        try {
            const interval = Math.max(1, Number(config.ingester?.interval ?? 60));
            const since = Date.now() - interval * 60 * 1000;
            const transactions = prepare(`
                SELECT timestamp, response, context
                FROM transactions
                WHERE timestamp >= ?
                ORDER BY timestamp ASC
            `).all(since);

            if (!transactions?.length) {
                return [];
            }

            const messages = prepare(`
                SELECT timestamp, provider, model, input, response
                FROM messages
                WHERE timestamp >= ?
                ORDER BY timestamp ASC
            `).all(since);

            const output = (() => {
                const tokens = { prompt: 0, completion: 0, total: 0 };
                const allocations = {};
                let timestamp = since;
                let fee = 0;

                // TODO: Add support for other LLMs.
                const openAi = messages.filter(message => message.provider === 'openai');
                for (const message of openAi) {
                    const usage = safeJson(message.response)?.usage || {};
                    const prompt = Number(usage.prompt_tokens || 0);
                    const completion = Number(usage.completion_tokens || 0);
                    const total = Number(usage.total_tokens ?? (prompt + completion));
                    tokens.prompt += prompt;
                    tokens.completion += completion;
                    tokens.total += total;
                }

                for (let i = 0; i < transactions.length; i++) {
                    const now = transactions[i].timestamp;
                    const resp = safeJson(transactions[i].response);
                    fee += Number(resp?.feeCharged || 0);
                    const alloc = safeJson(transactions[i].context)?.allocations || {};
                    for (const [key, value] of Object.entries(alloc)) {
                        if (!allocations[key]) {
                            allocations[key] = { borrow: 0, supply: 0, counter: [0, 0] };
                        }
                        if (typeof value.borrowTotalUsd === 'number'
                                && Number.isFinite(value.borrowTotalUsd)) {
                            allocations[key].borrow += value.borrowTotalUsd;
                            allocations[key].counter[0]++;
                        }
                        if (typeof value.supplyTotalUsd === 'number'
                                && Number.isFinite(value.supplyTotalUsd)) {
                            allocations[key].supply += value.supplyTotalUsd;
                            allocations[key].counter[1]++;
                        }
                    }
                    timestamp = now;
                }

                for (const [, value] of Object.entries(allocations)) {
                    value.borrow = value.counter[0] ? value.borrow / value.counter[0] : 0;
                    value.supply = value.counter[1] ? value.supply / value.counter[1] : 0;
                    delete value.counter;
                }
                const row = { source, timestamp, fee, allocations, tokens };
                validate(FeedbackSchema, row);
                return [row];
            })();
            return output;
        } catch (err) {
            log.warn('ADAPTER', 'Failed to fetch feedback data:', err);
            return null;
        }
    }

    static normalize(config, input) {
        const ok = validate(FeedbackSchema, input);
        const { tokens, fee, timestamp } = ok;
        return {
            source,
            timestamp,
            fee,
            tokens,
            allocations: Object.entries(ok.allocations)
                .map(([key, value]) => {
                    const [code, issuer] = key.split(':');
                    return { code, issuer, borrow: value.borrow, supply: value.supply };
                })
        };
    }

    static distill(config, row, col) {
        // Herfindahl-Hirschman Index.
        const supplySum = row.allocations.reduce((a, x) => a + x.supply, 0);
        const borrowSum = row.allocations.reduce((a, x) => a + x.borrow, 0);
        const cur = row.allocations.find(x => x.code === col.code && x.issuer === col.issuer)
            || { supply: 0, borrow: 0 };
        const hhiSupply = supplySum > 0 ? Math.pow(cur.supply / supplySum, 2) : 0;
        const hhiBorrow = borrowSum > 0 ? Math.pow(cur.borrow / borrowSum, 2) : 0;
        return {
            source: row.source,
            code: col.code,
            issuer: col.issuer,
            hhiSupply,
            hhiBorrow,
            observables: {}
        };
    }

    static get parameters() {
        return {
            observables: {
                cost: {
                    xlmFee: {
                        method: 'raw',
                        accessor: (row, col) => row.fee * 1e-7
                    },
                    xlmFeeTrend: {
                        method: 'slope',
                        accessor: (row, col) => row.fee * 1e-7
                    }
                },
                llm: {
                    tokenUsage: {
                        method: 'raw',
                        accessor: (row, col) => row.tokens.total
                    },
                    tokenUsageTrend: {
                        method: 'slope',
                        accessor: (row, col) => row.tokens.total
                    }
                }
            },
            dimensions: {
                rows: {
                    predicate: (row) => {
                        return (e) => e.source === 'feedback';
                    }
                },
                cols: {
                    key: 'allocations',
                    predicate: (col) => {
                        return (e) => e.code === col.code && e.issuer === col.issuer;
                    }
                }
            }
        };
    }
}

module.exports = { FeedbackAdapter };
