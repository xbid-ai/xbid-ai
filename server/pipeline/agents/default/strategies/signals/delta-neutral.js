/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { Signal } = require('../../..');
const { config } = require('../../../../../config');
const { validPrice } = require('../../../../../utils');

class DeltaNeutralSignal extends Signal {
    static async emit(input, env) {
        const { allocations, balances, reinforcement } = env;
        const strategyConfig = config.strategy || {};

        const keyOf = (a) => a.issuer ? `${a.code}:${a.issuer}` : a.code;
        const balanceOf = (a) => {
            return parseFloat(balances[typeof a === 'string' ? a : keyOf(a)] || 0);
        };

        const output = [];
        const ammPools = input.filter(x => x.source === 'amm');
        for (const ammPool of ammPools) {
            const processLeg = (assetA, assetB, exit) => {
                const isBase = ammPool.baseAsset === assetA;
                const allocationA = allocations[keyOf(assetA)];
                const allocationB = allocations[keyOf(assetB)];
                const lpShares = balanceOf(ammPool.poolId);

                if (!validPrice(ammPool.observables?.pool?.price)) {
                    return;
                }
                const price = isBase ? ammPool.observables.pool.price : 1 / ammPool.observables.pool.price;
                if (!validPrice(price)) {
                    return;
                }

                if (exit
                    && (!allocationA || !allocationA.borrowTotalUsd)
                    && (!allocationB || !allocationB.borrowTotalUsd)) {
                    if (lpShares) {
                        output.push({
                            kind: 'exit-delta-neutral',
                            reasons: [{
                                heuristic: 'no remaining liabilities to hedge',
                                details: {
                                    withdrawAll: true
                                }
                            }],
                            data: {
                                poolId: ammPool.poolId,
                                shares: lpShares,
                                assetA: {
                                    code: assetA.code,
                                    issuer: assetA.issuer
                                },
                                assetB: {
                                    code: assetB.code,
                                    issuer: assetB.issuer
                                }
                            },
                            reinforcement: reinforcement ? reinforcement(ammPool) : {}
                        });
                    }
                    return;
                } else if (!allocationA?.borrowTotalUsd || !validPrice(allocationA?.price) || lpShares) {
                    return;
                }

                const netApr = (ammPool.observables?.pool?.apr || 0) - (allocationA.borrowApy + (allocationB?.borrowTotalUsd ? (allocationB?.borrowApy || 0) : 0));
                if (netApr < strategyConfig.minTargetApy) {
                    return;
                }

                const cfgA = strategyConfig.assets?.find(a =>
                    (a.code === assetA.code && a.issuer === (assetA.issuer || undefined))
                ) || {};
                const cfgB = strategyConfig.assets?.find(a =>
                    (a.code === assetB.code && a.issuer === (assetB.issuer || undefined))
                ) || {};
                const assetABalance = balanceOf(assetA) - (cfgA.frozenFunds || 0);
                const assetBBalance = balanceOf(assetB) - (cfgB.frozenFunds || 0);
                if (!assetABalance || !assetBBalance
                    || assetABalance < (cfgA.minBorrowAmount || 0) || assetBBalance < (cfgB.minSupplyAmount || 0)) {
                    return;
                }

                const hedgeUsd = allocationA.borrowTotalUsd;
                const hedge = hedgeUsd / allocationA.price;
                const counter = hedge / price;
                if (hedge > assetABalance * (strategyConfig.maxHedgeRatio || 1)
                    || counter > assetBBalance * (strategyConfig.maxHedgeRatio || 1)) {
                    return;
                }

                output.push({
                    kind: 'enter-delta-neutral',
                    reasons: [{
                        heuristic: `positive net APR for ${assetA.code}/${assetB.code} AMM hedge`,
                        details: {
                            netApr,
                            borrowedAssetA: hedgeUsd / allocationA.price,
                            borrowedAssetB: allocationB?.price ? (allocationB?.borrowTotalUsd || 0) / allocationB.price : 0
                        }
                    }],
                    data: {
                        poolId: ammPool.poolId,
                        price,
                        assetA: {
                            amount: hedge,
                            code: assetA.code,
                            issuer: assetA.issuer,
                            decimals: 7
                        },
                        assetB: {
                            amount: counter,
                            code: assetB.code,
                            issuer: assetB.issuer,
                            decimals: 7
                        }
                    },
                    reinforcement: reinforcement ? reinforcement(ammPool) : {}
                });
            };

            processLeg(ammPool.baseAsset, ammPool.counterAsset, true);
            processLeg(ammPool.counterAsset, ammPool.baseAsset);
        }
        return output;
    }
}

module.exports = { DeltaNeutralSignal };
