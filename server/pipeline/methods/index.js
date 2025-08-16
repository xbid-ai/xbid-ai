/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Methods` class defines statistical functions (e.g. time-weighted averages,
 * logarithmic return, trends) used by the Distiller to compute observables over
 * time-series data.
 */

const { config } = require('../../config');

const interval = Number(config.ingester.interval || 60);

class Methods {
    static get map() {
        // Statistical methods map.
        return Object.fromEntries(
            Object.getOwnPropertyNames(this).filter(name => {
                if (name === 'map') {
                    return false;
                }
                return typeof Object
                    .getOwnPropertyDescriptor(this, name)?.value === 'function';
            }).map(name => [name, this[name]])
        );
    }

    static twa(series) {
        if (series.length < 1) {
            return null;
        }
        const { total, weight } = series
            .reduce((acc, { value, start, end }) => {
                const duration = end - start;
                acc.total += value * duration;
                acc.weight += duration;
                return acc;
            }, { total: 0, weight: 0 });
        return weight > 0 ? total / weight : null;
    }

    static slope(series) {
        const reversed = [...series].reverse();
        const l = reversed.length;
        if (l < 2) {
            return null;
        }
        const xm = (l - 1) / 2;
        const ym = reversed.reduce((a, b) => a + b, 0) / l;
        let n = 0;
        let d = 0;
        for (let i = 0; i < l; i++) {
            const xi = i;
            const yi = reversed[i];
            n += (xi - xm) * (yi - ym);
            d += (xi - xm) ** 2;
        }
        const raw = d === 0 ? null : n / d;
        return (raw !== null && ym !== 0) ? raw / ym : null;
    }

    static lret(series) {
        if (series.length < 2) {
            return null;
        }
        const start = series[series.length - 1];
        const end = series[0];
        return start !== 0 ? Math.log1p((end - start) / start) : null; // log(1+x)
    }

    static rate(series) {
        if (series.length < 2) {
            return null;
        }
        return (series[0] - series[series.length - 1])
            / ((interval * 60) * (series.length - 1)); // rate/sec.
    }

    static streak(series) {
        if (series.length < 2) {
            return 0;
        }
        let count = 1;
        for (let i = 1; i < series.length; i++) {
            if (series[i] !== series[0]) {
                break;
            }
            count++;
        }
        return count;
    }

    static raw(series) {
        return (series.length >= 1) ? series[0] : null;
    }

    static sum(series) {
        if (series.length < 1) {
            return null;
        }
        return series.reduce((acc, val) => acc + val, 0);
    }
}

module.exports = { Methods };
