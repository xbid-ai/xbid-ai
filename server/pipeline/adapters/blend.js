/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `BlendAdapter` collects and normalizes Blend V2 data from backstop, pools, oracles,
 * and user positions. It then calculates trends, logarithmic returns, and rate indicators
 * on series. Exposing fetch(), normalize(), distill(), and observables to the
 * ingestion/distillation pipeline.
 *
 * NOTE: Positions/emissions are wallet-scoped to xbid.ai configured wallet.
*/

const { Backstop, BackstopPoolV2, BackstopPoolEst, BackstopPoolUser, BackstopPoolUserEst, PoolV2, PoolMetadata, PoolEstimate, PositionsEstimate, TokenMetadata, Version } = require('@blend-capital/blend-sdk');
const path = require('path');
const { Adapter } = require('.');
const { toFloat, pick, log, keypair } = require('../../utils');
const { BlendSchema, validate } = require('./schemas');

const source = path.basename(__filename, '.js');

class BlendAdapter extends Adapter {
    static async fetch(config, cache) {
        const backstopId = 'CAQQR5SWBXKIGZKPBZDH3KM5GQ5GUTPKB7JAFCINLZBC5WXPJKRG3IM7';
        try {
            const network = {
                rpc: config.network.rpcUrl,
                horizonUrl: config.network.horizonUrl,
                passphrase: config.network.passphrase,
                opts: { allowHttp: true }
            };

            const backstop = await Backstop.load(network, backstopId);
            const poolIds = backstop.config.rewardZone;
            const poolMetas = await Promise.all(
                poolIds.map(async(id) => {
                    const meta = await PoolMetadata.load(network, id);
                    if (meta.wasmHash !== 'a41fc53d6753b6c04eb15b021c55052366a4c8e0e21bc72700f461264ec1350e') {
                        throw new Error(`Invalid wasm for pool ${id}: ${meta.wasmHash}`);
                    }
                    return { ...meta, version: Version.V2, id };
                })
            );

            return (await Promise.all(
                poolMetas.filter((meta) => meta !== null).map(async(meta) => {
                    const pool = await PoolV2.loadWithMetadata(network, meta.id, meta);
                    const oracle = await pool.loadOracle();
                    const user = await pool.loadUser(keypair.publicKey());
                    const backstopPool = await BackstopPoolV2.load(network, backstopId, meta.id);
                    const backstopPoolUser = await BackstopPoolUser.load(network, backstopId, meta.id, keypair.publicKey());
                    const estimates = {
                        ...pick(PoolEstimate.build(pool.reserves, oracle),
                            ['totalSupply', 'totalBorrowed', 'avgBorrowApy']),
                        user: {
                            id: user.userId,
                            positions: {
                                ...pick(PositionsEstimate.build(pool, oracle, user.positions),
                                    ['totalBorrowed', 'totalSupplied', 'totalEffectiveLiabilities', 'totalEffectiveCollateral',
                                        'borrowCap', 'borrowLimit', 'netApy', 'supplyApy', 'borrowApy'])
                            },
                            emissions: user.estimateEmissions(Array.from(pool.reserves.values()))?.emissions || 0
                        },
                        backstop: {
                            balance: {
                                ...pick(BackstopPoolEst.build(backstop.backstopToken, backstopPool.poolBalance),
                                    ['blnd', 'usdc', 'totalSpotValue', 'q4wPercentage'])
                            },
                            user: {
                                balance: {
                                    ...pick(backstopPoolUser.balance, ['shares', 'totalQ4W'])
                                },
                                positions: {
                                    ...pick(BackstopPoolUserEst.build(backstop, backstopPool, backstopPoolUser),
                                        ['tokens', 'blnd', 'usdc', 'totalSpotValue', 'totalUnlockedQ4W', 'totalQ4W', 'emissions'])
                                }
                            }
                        }
                    };
                    const assets = await Promise.all(
                        meta.reserveList.map(async(assetId) => {
                            const meta = await TokenMetadata.load(network, assetId);
                            const estimateApr = (epapy, price) => {
                                const usdc = toFloat(backstop.backstopToken.usdc, 7) / 0.2
                                    / (toFloat(backstop.backstopToken.blnd, 7) / 0.8);
                                return (epapy * usdc) / price;
                            };
                            const reserve = pool.reserves.get(assetId);
                            const liabilityFactor = reserve.getLiabilityFactor() || 0;
                            const borrow = reserve.borrowEmissions !== undefined
                                ? reserve.borrowEmissions.emissionsPerYearPerToken(
                                    reserve.totalLiabilities(),
                                    reserve.config.decimals
                                )
                                : 0;
                            const supply = reserve.supplyEmissions !== undefined
                                ? reserve.supplyEmissions.emissionsPerYearPerToken(
                                    reserve.totalSupply(),
                                    reserve.config.decimals
                                )
                                : 0;
                            const price = oracle.getPriceFloat(reserve.assetId);
                            const borrowEmissionsApr = (borrow > 0 && price ? estimateApr(borrow, price) : undefined);
                            const supplyEmissionsApr = (supply > 0 && price ? estimateApr(supply, price) : undefined);
                            const positions = {
                                liability: user.getLiabilitiesFloat(reserve) ?? 0,
                                collateral: user.getCollateralFloat(reserve) ?? 0,
                                liabilityDTokens: user.getLiabilityDTokens(reserve) ?? 0n,
                                collateralBTokens: user.getCollateralBTokens(reserve) ?? 0n
                            };
                            const reserveData = pick(reserve, ['poolId', 'assetId', 'config', 'data',
                                'borrowApr', 'estBorrowApy', 'supplyApr', 'estSupplyApy', 'latestLedger', 'rateDecimals'
                            ]);
                            return { meta, reserve: { ...reserveData, liabilityFactor }, supplyEmissionsApr, borrowEmissionsApr, price, user: { positions } };
                        })
                    );

                    const row = {
                        source,
                        ...((({ reserveList, ...rest }) => rest)(meta)),
                        oracle,
                        estimates,
                        assets: assets.filter(Boolean)
                    };
                    validate(BlendSchema, row);
                    return row;
                })
            )).filter(Boolean);
        } catch (err) {
            log.warn('ADAPTER', 'Failed to fetch blend data:', err);
            return null;
        }
    }

    static normalize(config, input) {
        const ok = validate(BlendSchema, input);
        return {
            source,
            ...pick(ok, ['name', 'id', 'latestLedger', 'version',
                'backstopRate', 'maxPositions', 'minCollateral', 'oracle']),
            user: {
                ...pick(ok.estimates.user, ['id', 'positions', 'emissions'])
            },
            estimates: {
                ...pick(ok.estimates, ['avgBorrowApy', 'totalSupply', 'totalBorrowed'])
            },
            backstop: {
                id: ok.backstop,
                ...pick(ok.estimates.backstop.balance, ['q4wPercentage', 'totalSpotValue']),
                user: ok.estimates.backstop.user
            },
            assets: (ok.assets || []).map((asset, index) => {
                const reserve = asset.reserve || {};
                return {
                    code: asset.meta.asset.code,
                    issuer: asset.meta.asset.issuer || '',
                    id: reserve.assetId,
                    ...pick(reserve, ['borrowApr', 'supplyApr', 'estBorrowApy', 'estSupplyApy', 'liabilityFactor']),
                    decimals: reserve.config.decimals,
                    price: asset.price,
                    estSupplyEmissionsApr: asset.supplyEmissionsApr || 0,
                    estBorrowEmissionsApr: asset.borrowEmissionsApr || 0,
                    user: { ...asset.user }
                };
            })
        };
    }

    static distill(config, row, col) {
        return {
            source: row.source,
            poolId: row.id,
            poolName: row.name,
            assetId: col.id,
            assetCode: col.code,
            assetIssuer: col.issuer,
            userId: row.user.id,
            decimals: col.decimals,
            liabilityFactor: col.liabilityFactor,
            observables: {
                position: {
                    emissions: row.user.emissions,
                    ...pick(row.user.positions, ['borrowCap', 'borrowLimit', 'totalSupplied', 'totalBorrowed', 'netApy']),
                    ...pick(col.user.positions, ['liability', 'collateral'])
                },
                backstop: {
                    user: { ...pick(row.backstop.user.positions, ['totalSpotValue', 'emissions']) }
                }
            }
        };
    }

    static get parameters() {
        return {
            observables: {
                pool: {
                    supplyRate: {
                        method: 'rate',
                        accessor: (row, col) => row.estimates.totalSupply
                    },
                    borrowRate: {
                        method: 'rate',
                        accessor: (row, col) => row.estimates.totalBorrowed
                    },
                    supply: {
                        method: 'raw',
                        accessor: (row, col) => row.estimates.totalSupply
                    },
                    borrowed: {
                        method: 'raw',
                        accessor: (row, col) => row.estimates.totalBorrowed
                    }
                },
                asset: {
                    priceSlope: {
                        method: 'slope',
                        accessor: (row, col) => col.price
                    },
                    supplyApyDelta: {
                        method: 'lret',
                        accessor: (row, col) => col.estSupplyApy
                    },
                    borrowApyDelta: {
                        method: 'lret',
                        accessor: (row, col) => col.estBorrowApy
                    },
                    supplyApy: {
                        method: 'raw',
                        accessor: (row, col) => col.estSupplyApy
                    },
                    borrowApy: {
                        method: 'raw',
                        accessor: (row, col) => col.estBorrowApy
                    },
                    emissionSupplyApy: {
                        method: 'raw',
                        accessor: (row, col) => col.estSupplyEmissionsApr
                    },
                    emissionBorrowApy: {
                        method: 'raw',
                        accessor: (row, col) => col.estBorrowEmissionsApr
                    },
                    price: {
                        method: 'raw',
                        accessor: (row, col) => col.price
                    }
                },
                backstop: {
                    q4w: {
                        method: 'raw',
                        accessor: (row, col) => row.backstop.q4wPercentage
                    },
                    spot: {
                        method: 'raw',
                        accessor: (row, col) => row.backstop.totalSpotValue
                    },
                    q4wRate: {
                        method: 'rate',
                        accessor: (row, col) => row.backstop.q4wPercentage
                    },
                    spotSlope: {
                        method: 'slope',
                        accessor: (row, col) => row.backstop.totalSpotValue
                    }
                },
                position: {
                    collateralStreak: {
                        method: 'streak',
                        accessor: (row, col) => !!col.user.positions.collateral
                    },
                    liabilityStreak: {
                        method: 'streak',
                        accessor: (row, col) => !!col.user.positions.liability
                    }
                }
            },
            dimensions: {
                rows: {
                    predicate: (row) => {
                        return (e) => e.source === 'blend' && e.id === row.id;
                    }
                },
                cols: {
                    key: 'assets',
                    predicate: (col) => {
                        return (e) => e.id === col.id;
                    }
                }
            }
        };
    }
}

module.exports = { BlendAdapter };
