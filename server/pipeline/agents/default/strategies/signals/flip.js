// strategies/spot/signals/item-flip.js
/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { Signal } = require('../../..');
const { config } = require('../../../../../config');
const { validPrice, pick } = require('../../../../../utils');

class FlipSignal extends Signal {
    static async emit(input, env) {
        const { balances, reinforcement } = env;
        const strategyConfig = config.strategy || {};

        const keyOf = (a) => a.issuer ? `${a.code}:${a.issuer}` : a.code;
        const balanceOf = (a) => {
            return parseFloat(balances[typeof a === 'string' ? a : keyOf(a)] || 0);
        };

        const items = new Map();
        for (const item of (strategyConfig?.spot?.items || [])) {
            items.set(`${item.base.code}:${item.base.issuer}|${item.quote.code}`, { ...item });
        }

        const output = [];
        for (const it of input) {
            if (it?.source !== 'cyberbrawl') {
                continue;
            }

            const item = items.get(`${it.asset?.code}:${it.asset?.issuer}|${it.market?.code}`);
            if (!item || !item.targetSpotPrice || typeof item.spread !== 'number') {
                continue;
            }

            const ask = it?.observables?.ask?.value;
            const bid = it?.observables?.bid?.value;
            const balance = balanceOf(it.asset);

            if (!validPrice(bid) || bid < item.targetSpotPrice + (item.targetSpotPrice * item.spread) || balance < 0.0000001) {
                continue;
            }

            const askSlope = it?.observables?.ask?.slope ?? 0;
            const bidSlope = it?.observables?.bid?.slope ?? 0;

            output.push({
                kind: 'flip-asset',
                reasons: [{
                    heuristic: `flip '${it.asset.name || it.asset.code}' to take profit`,
                    details: {
                        netProfit: `${bid - item.targetSpotPrice} ${it.market.code}`,
                        ask,
                        bid,
                        askSlope,
                        bidSlope
                    }
                }],
                data: {
                    amount: '0.0000001', // 1 stroop unit.
                    price: bid,
                    item: { ...pick(it.asset, ['code', 'issuer', 'id', 'name']) },
                    market: { ...pick(it.market, ['code', 'issuer']) }
                },
                reinforcement: reinforcement ? reinforcement(it) : {}
            });
        }
        return output;
    }
}

module.exports = { FlipSignal };
