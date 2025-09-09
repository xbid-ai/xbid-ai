/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { Signal } = require('../../..');
const { config } = require('../../../../../config');
const { validPrice, pick } = require('../../../../../utils');
const { Asset } = require('@stellar/stellar-sdk');

const TradeSide = Object.freeze({ None: 0, Buy: 1, Sell: 2 });

class BuySellSignal extends Signal {
    static async emit(input, env) {
        const { balances, reinforcement } = env;
        const strategyConfig = config.strategy || {};

        const keyOf = (a) => a.issuer ? `${a.code}:${a.issuer}` : a.code;
        const balanceOf = (a) => {
            return parseFloat(balances[typeof a === 'string' ? a : keyOf(a)] || 0);
        };

        const pairs = new Map();
        for (const pair of (strategyConfig?.spot?.pairs || [])) {
            pairs.set(new Asset(pair.base.code, pair.base.issuer).contractId(config.network.passphrase), { ...pair });
        }

        const output = [];
        for (const it of input) {
            const pair = pairs.get(it?.assetId);
            if (!pair || it?.source !== 'reflector') {
                continue;
            }

            if (!validPrice(it.observables?.price?.value)
                || !Number.isFinite(it.observables.price.slope)
                || !Number.isFinite(it.observables.price.freshness)
                || it.observables.price.freshness > (pair.maxFreshness || 120)) {
                continue;
            }

            const hysteresis = pair.hysteresis ?? 0;
            const side = it.observables.price.slope >= ((pair.slopeUp ?? 0) + hysteresis)
                ? TradeSide.Buy
                : it.observables.price.slope <= -((pair.slopeDown ?? 0) + hysteresis)
                    ? TradeSide.Sell
                    : TradeSide.None;
            const baseBalance = balanceOf(pair.base);
            const quoteBalance = balanceOf(pair.quote);
            if (side === TradeSide.Buy && baseBalance >= (pair.maxExposure ?? 0)) {
                continue;
            }

            const amount = side === TradeSide.Buy
                ? Math.max(pair.minOrderQuote ?? 1e-7, Math.min(quoteBalance * (pair.buyRatio ?? 0), pair.maxOrderQuote ?? 0))
                : side === TradeSide.Sell
                    ? Math.min(baseBalance, pair.maxOrderBase ?? Number.POSITIVE_INFINITY, Math.max((pair.minOrderBase ?? 1e-7), baseBalance * (pair.sellRatio ?? 1)))
                    : 0;
            if (!amount) {
                continue;
            }

            output.push({
                kind: side === TradeSide.Buy ? 'buy-asset' : 'sell-asset',
                reasons: [{
                    heuristic: `asset price trending ${side === TradeSide.Buy ? 'up' : 'down'}`,
                    details: { ...it.observables.price }
                }],
                data: {
                    pair: { ...pick(pair, ['quote', 'base']) },
                    amount: amount.toFixed(7),
                    price: it.observables.price.value
                },
                reinforcement: reinforcement ? reinforcement(it) : {}
            });
        }
        return output;
    }
}

module.exports = { BuySellSignal };
