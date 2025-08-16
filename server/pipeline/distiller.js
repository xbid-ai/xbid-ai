/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Distiller` transforms normalized snapshots from the `Ingester` to be consumed
 * by strategies. It applies various methods including compounded returns, slope,
 * time-weighted averages, and more to your adapter observables series (see distill).
 */

const { config } = require('../config');
const { Ingester } = require('./ingester');
const { Methods } = require('./methods');
const { getClass, log } = require('../utils');

class Observables {
    static extract(input, accessor, predicates) {
        const series = input.periods.map(min => {
            const row = input.data[min.toString()]?.find(predicates.row);
            if (!row) {
                return null;
            }
            const col = predicates.col ? predicates.col(row) : null;
            return accessor(row, col);
        }).filter(v => v != null);
        if (series.length === 1) {
            series.push(series[0]);
        }
        return series;
    }

    static compute(input, row, observables, predicates) {
        for (const [category, fieldMap] of Object.entries(observables)) {
            const target = row.observables[category] ||= {};
            for (const [fieldKey, { method, accessor }] of Object.entries(fieldMap)) {
                const fn = Methods.map[method];
                if (!fn) {
                    throw new Error(`Unknown method: ${method}`);
                }
                target[fieldKey] = Methods.map[method](
                    Observables.extract(input, accessor, predicates));
            }
        }
        return row;
    }
}

class Distiller {
    static transform(input) {
        const reference = input.data['0'] || [];
        const output = [];
        const sources = config.ingester.sources;
        for (const [key, module] of Object.entries(sources)) {
            const { parameters = {}, distill } = module[getClass(key, 'adapter')];
            const rows = reference.filter(e => e.source === key);
            for (const row of rows) {
                const rowKey = parameters.dimensions?.cols?.key;
                const columns = rowKey ? row[rowKey] : [null];
                for (const col of columns) {
                    let rpred;
                    let cpred;
                    if (typeof parameters.dimensions
                        ?.rows?.predicate === 'function') {
                        rpred = parameters.dimensions.rows.predicate(row);
                    }
                    if (typeof parameters.dimensions
                        ?.cols?.predicate === 'function') {
                        cpred = parameters.dimensions.cols.predicate(col);
                    }
                    output.push(Observables.compute(
                        input,
                        distill(config, row, col),
                        parameters.observables || {}, {
                            row: (rpred || (e => e.source === key)),
                            col: (cpred ? e => rowKey ? e[rowKey]?.find(cpred) : null : null)
                        }));
                }
            }
        }
        return output;
    }
}

function register(app, auth, limiter) {
    // Set .env AUTH_TOKEN (opaque) to enable auth.
    const route = '/data/transformed';
    app.get(route, auth, limiter, async(req, res) => {
        try {
            if (!Ingester.ready) {
                throw new Error('Ingester not ready');
            }
            res.json({ status: 'ok', data: Distiller.transform(Ingester.get()) });
        } catch (err) {
            log.error('DISTILLER', `${route}`, err);
            res.status(500).json({ status: 'error' });
        }
    });
}

module.exports = { Distiller, register };
