/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { Signal } = require('../../..');

class SentimentSignal extends Signal {
    static async emit(input, env) {
        const rows = input.filter(x => x.source === 'sentiment');
        const output = [];
        for (const row of rows) {
            output.push({
                kind: 'sentiment',
                reasons: [{
                    heuristic: 'Crypto market sentiment',
                    details: {
                        provider: row.provider
                    }
                }],
                data: {
                    ...row.observables
                }
            });
        }
        return output;
    }
}

module.exports = { SentimentSignal };
