/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Ingester` collects raw data from all configured adapters on a fixed schedule.
 * It writes results both to a frequently updated SQLite scratchpad for near-real-time freshness
 * and to a persistent historical store for longer term analysis.
 */

const { prepare, exec } = require('../utils/database');
const { safeStringify, sleep, getClass, log } = require('../utils');
const { config } = require('../config');
const { Adapter } = require('./adapters');

const interval = Number(config.ingester.interval || 60);
const scratchpad = config.ingester.scratchpad || 1;
const SCRATCHPAD_INDEX = -1;

class Ingester {
    static #ready = false;

    static initialize() {
        exec(`
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                json TEXT NOT NULL
            );`
        );
        exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_latest ON snapshots (id) WHERE id = ${SCRATCHPAD_INDEX};`);
        exec('CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots (timestamp);');
        exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                hash TEXT NOT NULL,
                response TEXT NOT NULL,
                context TEXT NOT NULL
            );
        `);
        exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                input TEXT NOT NULL,
                response TEXT NOT NULL
            );
        `);
        exec(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                data TEXT NOT NULL
            );
        `);
        return this;
    }

    static async run() {
        log.info('INGESTER', `Running - interval '${interval}'`);
        while (true) {
            const now = Math.floor(Date.now() / 1000);
            const next = (prepare(`SELECT timestamp FROM snapshots WHERE id != ${SCRATCHPAD_INDEX} ORDER BY timestamp DESC LIMIT 1`)
                .get()?.timestamp || 0) + (interval * 60);
            const archive = now >= next;
            const sources = config.ingester.sources;
            const data = [];
            for (const [key, source] of Object.entries(sources)) {
                try {
                    const className = getClass(key, 'adapter');
                    const adapter = source[className];
                    if (!(adapter.prototype instanceof Adapter)) {
                        throw new Error(`${className} must extend Adapter class`);
                    }
                    log.info('INGESTER', `Fetching '${key}' data`);
                    data.push(...(await adapter.fetch(config, archive) || []));
                } catch (err) {
                    log.error('INGESTER', `Failed to fetch '${key}'`, err);
                }
            }

            const json = safeStringify(data);
            try {
                prepare(`
                        INSERT INTO snapshots (id, timestamp, json)
                        VALUES (${SCRATCHPAD_INDEX}, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET timestamp = excluded.timestamp, json = excluded.json;
                    `).run(now, json);
            } catch (err) {
                log.error('INGESTER', 'Failed to update', err);
            }
            log.info('INGESTER', 'Scratchpad refreshed');
            if (archive) {
                try {
                    prepare('INSERT INTO snapshots (timestamp, json) VALUES (?, ?)').run(now, json);
                    log.info('INGESTER', 'Archived snapshot');
                } catch (err) {
                    log.error('INGESTER', 'Failed to archive', err);
                }
            } else {
                log.info('INGESTER', `Next archive in ${Math.max(Math.floor((next - now) / 60), scratchpad)} min`);
            }

            this.#ready = true;
            await sleep(scratchpad * 60 * 1000);
        }
    }

    static get() {
        const periods = this.periods;
        const data = {};
        const query = prepare(`
            SELECT json FROM snapshots 
            WHERE id = CASE WHEN ? = 0 THEN ${SCRATCHPAD_INDEX} ELSE id END
            AND (? = 0 OR timestamp <= (
                SELECT MAX(timestamp) FROM snapshots WHERE id != ${SCRATCHPAD_INDEX}
            ) - (? * 60))
            ORDER BY timestamp DESC 
            LIMIT 1;
        `);

        for (const minutes of periods) {
            const row = query.get(minutes, minutes, minutes);
            let raw;
            try {
                raw = JSON.parse(row?.json);
                if (!Array.isArray(raw) || !raw.length) {
                    continue;
                }
            } catch {
                continue;
            }

            const sources = config.ingester.sources;
            data[minutes.toString()] = raw.map(entry => {
                const adapter = sources[entry.source][getClass(entry.source, 'adapter')];
                return adapter.normalize(config, entry);
            }).filter(Boolean);
        }
        return { periods, data };
    }

    static get periods() {
        return Array.from({ length: config.distiller?.periods || 24 }, (_, i) => i * interval);
    }

    static get ready() {
        return this.#ready;
    }
}

function register(app, auth, limiter) {
    Ingester.initialize().run();

    // Set .env AUTH_TOKEN (opaque) to enable auth.
    const route = '/data/raw';
    app.get(route, auth, limiter, (req, res) => {
        try {
            if (!Ingester.ready) {
                throw new Error('Ingester not ready');
            }
            res.json({ status: 'ok', data: Ingester.get() });
        } catch (err) {
            log.error('INGESTER', `${route}`, err);
            res.status(500).json({ status: 'error' });
        }
    });
}

module.exports = { Ingester, register };
