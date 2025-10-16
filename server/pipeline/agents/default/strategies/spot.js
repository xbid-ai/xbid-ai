/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* `SpotStrategy` emits buy/sell/flip signals using various asset sources (Reflector oracle, cyberbrawl.io auction house)
 * price slope with freshness gating.
 */

const { Strategy } = require('../../strategy');
const { BuySellSignal } = require('./signals/buy-sell');
const { FlipSignal } = require('./signals/flip');

class SpotStrategy extends Strategy {
    static async apply(input, env) {
        const output = [];
        output.push(...(await Promise.all([
            BuySellSignal.emit(input, env),
            FlipSignal.emit(input, env)
        ])).flat().filter(Boolean));
        return output;
    }

    static async prepare(input, env) {
        return {};
    }
}

module.exports = { SpotStrategy };
