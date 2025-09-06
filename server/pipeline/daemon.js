/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Daemon` runs the pipeline loop with the selected agent. The evaluation timeframe
 * can be adaptive based on agent decision. Results (including tx hashes) are available
 * on the public `/agent/feed`. Also provides the `/agent/fees` endpoint aggregating
 * network fees over a time range.
 */

const path = require('path');
const { config } = require('../config');
const { prepare } = require('../utils/database');
const { Ingester } = require('./ingester');
const { Distiller } = require('./distiller');
const { Agent } = require('./agents');
const { shortId, sleep, getClass, validPrice, safeJson, pick, log, keypair, TokenCounter } = require('../utils');
const { calculatePnL } = require('./agents/tools/pnl');

const agentName = process.env.AGENT_NAME || 'default';
const agentClass = getClass(agentName, 'agent');
const interval = Number(config.llm.interval || 30);

class Daemon {
    static #agent;
    static #results = {};

    static async run(agent) {
        this.#agent = agent;
        log.info('DAEMON', `Running - agent '${process.env.AGENT_NAME}'`);

        try {
            TokenCounter.initialize({ config, log });
        } catch (err) {
            log.warn('DAEMON', 'Token counter failed to initialize', err);
        }

        while (true) {
            if (!Ingester.ready) {
                await sleep(1000);
                continue;
            }

            const transformed = Distiller.transform(Ingester.get());
            await this.#agent.prepare(transformed);
            const output = await this.#agent.analyze(transformed);
            const next = Math.min(
                Math.max(15, Number.parseInt(output?.inference?.nextTime || interval, 10) || interval),
                45
            );
            const wallet = keypair.publicKey();
            log.info('DAEMON', `Wallet: ${wallet}`);
            if (output) {
                const equity = await calculatePnL(1440 * 7);
                const { transactions } = await this.#agent.execute(output);
                const id = shortId(JSON.stringify(transactions));

                recordEvent({
                    id,
                    message: output.message,
                    transactions
                });
                this.#results = {
                    timestamp: Date.now(),
                    id,
                    ...output,
                    equity,
                    transactions,
                    wallet,
                    events: lastEvents(10)
                };
                log.info('DAEMON', `Results ready [${this.#results.id}]`);
            }
            log.info('DAEMON', `Next evaluation in ${next} min`);
            await sleep(next * 60 * 1000);
        }
    }

    static get results() {
        return this.#results;
    }
}

function recordEvent(data) {
    const query = prepare(`
        INSERT INTO events (timestamp, data)
        VALUES (?, ?)
    `);
    query.run(
        Date.now(),
        JSON.stringify(data)
    );
}

function lastEvents(limit = 10) {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const query = prepare(`
        SELECT timestamp, data
        FROM events
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);
    const norm = ts => {
        const n = Number(ts);
        return n >= 1e12 ? n : n * 1000;
    };
    return query.all(since, limit).map(r => ({
        timestamp: new Date(norm(r.timestamp)).toISOString(),
        ...JSON.parse(r.data)
    }));
}

function register(app, auth, limiter) {
    const agent = require(path.join(__dirname, 'agents', agentName))[agentClass];
    if (!(agent.prototype instanceof Agent)) {
        throw new Error(`${agentClass} must extend Agent class`);
    }
    Daemon.run(agent);

    app.get('/agent/feed', limiter, (req, res) => {
        try {
            res.json({
                status: 'ok',
                data: { ...pick(Daemon.results || {}, ['id', 'message', 'transactions', 'equity', 'wallet', 'events', 'extras']) }
            });
        } catch (err) {
            log.error('DAEMON', '/agent/feed', err);
            res.status(500).json({ status: 'error' });
        }
    });

    app.get('/agent/results', auth, limiter, (req, res) => {
        try {
            res.json({ status: 'ok', data: Daemon.results });
        } catch (err) {
            log.error('DAEMON', '/agent/results', err);
            res.status(500).json({ status: 'error' });
        }
    });

    app.get('/agent/fees', auth, limiter, async(req, res) => {
        try {
            const hours = Math.min(720, Math.max(1, Number.parseInt(req.query.hours ?? '1', 10) || 1));
            const to = Date.now();
            const from = to - hours * 60 * 60 * 1000;
            const rows = prepare(`
                SELECT timestamp, response
                FROM transactions
                WHERE timestamp BETWEEN ? AND ?
            `).all(from, to);

            const { hourly, totalFee, totalCount } = rows.reduce(
                (acc, { timestamp, response }) => {
                    try {
                        const data = safeJson(response);
                        const hour = new Date(timestamp).toISOString().slice(0, 13);
                        const feeCharged = Number.parseInt(data?.feeCharged, 10);
                        if (!validPrice(feeCharged)) {
                            throw new Error('Invalid data');
                        }

                        if (!acc.hourly[hour]) {
                            acc.hourly[hour] = { count: 0, feeCharged: 0 };
                        }

                        acc.hourly[hour].count += 1;
                        acc.hourly[hour].feeCharged += feeCharged;
                        acc.totalFee += feeCharged;
                        acc.totalCount += 1;
                    } catch (err) {
                        log.warn('DAEMON', 'Skipping invalid result', err);
                    }
                    return acc;
                },
                { hourly: {}, totalFee: 0, totalCount: 0 }
            );

            const feeStats = {
                summary: {
                    count: totalCount,
                    raw: totalFee,
                    total: (totalFee / 1e7).toFixed(6)
                },
                hourly: Object.fromEntries(
                    Object.entries(hourly)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([hour, { count, feeCharged }]) => [
                            hour,
                            {
                                count,
                                raw: feeCharged,
                                total: (feeCharged / 1e7).toFixed(6)
                            }
                        ])
                ),
                range: { from, to }
            };
            res.json({ status: 'ok', data: feeStats });
        } catch (err) {
            log.error('DAEMON', '/agent/fees', err);
            res.status(500).json({ status: 'error' });
        }
    });
}

module.exports = { register };
