/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { Signal } = require('../../..');
const { config } = require('../../../../../config');

class FeedbackSignal extends Signal {
    static async emit(input) {
        const rows = input.filter(x => x.source === 'feedback');
        if (!rows.length) {
            return [];
        }

        const first = rows.find(r => r && r.observables) || {};
        const xlmFee = Number(first.observables?.cost?.xlmFee || 0);
        const xlmFeeTrend = Number(first.observables?.cost?.xlmFeeTrend || 0);
        const tokenUsage = Number(first.observables?.llm?.tokenUsage || 0);
        const tokenUsageTrend = Number(first.observables?.llm?.tokenUsageTrend || 0);
        const periodMins = config.ingester.interval;
        const allocations = rows.map(r => ({
            code: r.code,
            issuer: r.issuer,
            hhiSupply: Number(r.hhiSupply || 0),
            hhiBorrow: Number(r.hhiBorrow || 0)
        }));

        return [{
            kind: 'feedback',
            reasons: [{
                heuristic: 'LLM feedback loop and telemetry'
            }],
            data: {
                periodMins,
                xlmFee,
                xlmFeeTrend,
                tokenUsage,
                tokenUsageTrend,
                portfolio: { allocations }
            }
        }];
    }
}

module.exports = { FeedbackSignal };
