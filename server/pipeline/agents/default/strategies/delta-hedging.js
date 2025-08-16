/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* `DeltaHedgingStrategy` is a concrete Strategy that implements a
 * delta-neutral hedging model for Blend borrow positions using SDEX AMMs.
 */

const { Strategy } = require('../../strategy');
const { config } = require('../../../../config');
const { DeltaNeutralSignal } = require('./signals/delta-neutral');
const { validPrice } = require('../../../../utils');

class DeltaHedgingStrategy extends Strategy {
    static async apply(input, env) {
        const output = [];
        output.push(...(await Promise.all([
            DeltaNeutralSignal.emit(input, env)
        ])).flat().filter(Boolean));
        return output;
    }

    static async prepare(input, env) {
        const strategyConfig = config.strategy;
        const rows = input.filter(x => x.source === 'blend');
        return {
            allocations: rows.reduce((acc, row) => {
                const collateral = parseFloat(row.observables.position?.collateral || 0);
                const liability = parseFloat(row.observables.position?.liability || 0);
                const price = parseFloat(row.observables.asset?.price || 0);
                if ((!collateral && !liability) || !validPrice(price)) {
                    return acc;
                }

                const collateralValue = collateral * price;
                const collateralApy = parseFloat(row.observables.asset?.supplyApy || 0)
                    + parseFloat(row.observables.asset?.emissionSupplyApy || 0);

                const liabilityValue = liability * price;
                const liabilityApy = parseFloat(row.observables.asset?.borrowApy || 0)
                    - parseFloat(row.observables.asset?.emissionBorrowApy || 0);

                const assetKey = row.assetIssuer
                    ? `${row.assetCode}:${row.assetIssuer}`
                    : row.assetCode;
                const entry = acc[assetKey] ?? { supplyTotalUsd: 0, supplyWeightedApy: 0, supplyApy: 0, borrowTotalUsd: 0, borrowWeightedApy: 0, borrowApy: 0, price: 0 };

                entry.supplyTotalUsd += collateralValue;
                entry.supplyWeightedApy += collateralValue * collateralApy;
                entry.supplyApy = entry.supplyTotalUsd ? entry.supplyWeightedApy / entry.supplyTotalUsd : 0;

                entry.borrowTotalUsd += liabilityValue;
                entry.borrowWeightedApy += liabilityValue * liabilityApy;
                entry.borrowApy = entry.borrowTotalUsd ? entry.borrowWeightedApy / entry.borrowTotalUsd : 0;

                entry.price = price;

                acc[assetKey] = entry;
                return acc;
            }, {}),
            assets: rows.reduce((acc, row) => {
                const apy = parseFloat(row.observables.asset?.supplyApy || 0)
                    + parseFloat(row.observables.asset?.emissionSupplyApy || 0);
                const q4w = parseFloat(row.observables.backstop?.q4w || 0);
                const spot = parseFloat(row.observables.backstop?.spot || 0);
                const supply = parseFloat(row.observables.pool?.supply || 0);
                const borrowed = parseFloat(row.observables.pool?.borrowed || 0);
                const utilization = borrowed / supply;
                const backstopRatio = supply > 0 ? spot / supply : 0;
                const ok = apy >= strategyConfig.minTargetApy
                    && (Number.isNaN(q4w) || q4w <= strategyConfig.maxTargetQ4w)
                    && spot >= strategyConfig.minBackstopUsd
                    && backstopRatio >= strategyConfig.minBackstopRatio
                    && utilization <= strategyConfig.maxUtilization
                    && supply >= strategyConfig.minPoolSupplyUsd;
                acc.push({
                    row,
                    health: {
                        ok,
                        details: {
                            poolApy: apy,
                            minHealthyTargetApy: strategyConfig.minTargetApy,
                            poolQ4W: q4w,
                            maxHealthyTargetQ4w: strategyConfig.maxTargetQ4w,
                            poolBackstopUSD: spot,
                            minHealthyBackstopValueUsd: strategyConfig.minBackstopUsd,
                            poolUtilization: utilization,
                            maxHealthyUtilization: strategyConfig.maxUtilization,
                            poolSupply: supply,
                            minHealthySupplyUsd: strategyConfig.minPoolSupplyUsd
                        }
                    }
                });
                return acc;
            }, [])
        };
    }
}

module.exports = { DeltaHedgingStrategy };
