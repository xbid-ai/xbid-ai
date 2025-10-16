/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const v = require('valibot');
const { safeStringify } = require('../../utils');

const KEY = /^([A-Z0-9]{1,12}|[A-Z0-9]{1,12}:G[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{55})$/;
const DIGITS = /^\d+$/;
const sanitize = (x) => JSON.parse(safeStringify(x));

const FeedbackSchema = v.strictObject({
    source: v.literal('feedback'),
    timestamp: v.number(),
    fee: v.number(),
    tokens: v.strictObject({
        prompt: v.number(),
        completion: v.number(),
        total: v.number()
    }),
    allocations: v.record(
        v.regex(v.string(), KEY),
        v.strictObject({
            borrow: v.number(),
            supply: v.number()
        })
    )
});

const AmmSchema = v.strictObject({
    source: v.literal('amm'),
    id: v.string(),
    paging_token: v.string(),
    fee_bp: v.number(),
    type: v.string(),
    total_trustlines: v.string(),
    total_shares: v.string(),
    reserves: v.strictObject({
        base: v.strictObject({
            asset: v.union([
                v.strictObject({
                    base_asset_type: v.literal('native')
                }),
                v.strictObject({
                    base_asset_type: v.string(),
                    base_asset_code: v.string(),
                    base_asset_issuer: v.string()
                })
            ]),
            amount: v.number()
        }),
        counter: v.strictObject({
            asset: v.union([
                v.strictObject({
                    counter_asset_type: v.literal('native')
                }),
                v.strictObject({
                    counter_asset_type: v.string(),
                    counter_asset_code: v.string(),
                    counter_asset_issuer: v.string()
                })
            ]),
            amount: v.number()
        })
    }),
    last_modified_ledger: v.number(),
    last_modified_time: v.string(),
    stats: v.strictObject({
        vwap: v.number(),
        base: v.number(),
        counter: v.number(),
        startTime: v.number(),
        endTime: v.number(),
        sampleSize: v.number(),
        apr: v.number()
    })
});

const BlendSchema = v.strictObject({
    source: v.literal('blend'),
    id: v.string(),
    admin: v.string(),
    name: v.string(),
    status: v.number(),
    latestLedger: v.number(),
    version: v.string(),
    wasmHash: v.string(),
    backstop: v.string(),
    backstopRate: v.number(),
    maxPositions: v.number(),
    minCollateral: v.string(),
    oracle: v.strictObject({
        oracleId: v.string(),
        prices: v.record(
            v.string(),
            v.strictObject({
                price: v.string(),
                timestamp: v.number()
            })
        ),
        decimals: v.number(),
        latestLedger: v.number()
    }),
    estimates: v.strictObject({
        totalSupply: v.number(),
        totalBorrowed: v.number(),
        avgBorrowApy: v.number(),
        user: v.strictObject({
            id: v.string(),
            positions: v.strictObject({
                totalBorrowed: v.number(),
                totalSupplied: v.number(),
                totalEffectiveLiabilities: v.number(),
                totalEffectiveCollateral: v.number(),
                borrowCap: v.number(),
                borrowLimit: v.number(),
                netApy: v.number(),
                supplyApy: v.number(),
                borrowApy: v.number()
            }),
            emissions: v.number()
        }),
        backstop: v.strictObject({
            balance: v.strictObject({
                blnd: v.number(),
                usdc: v.number(),
                totalSpotValue: v.number(),
                q4wPercentage: v.number()
            }),
            user: v.strictObject({
                balance: v.strictObject({
                    shares: v.string(),
                    totalQ4W: v.string()
                }),
                positions: v.strictObject({
                    tokens: v.number(),
                    blnd: v.number(),
                    usdc: v.number(),
                    totalSpotValue: v.number(),
                    totalUnlockedQ4W: v.number(),
                    totalQ4W: v.number(),
                    emissions: v.number()
                })
            })
        })
    }),
    assets: v.array(
        v.strictObject({
            supplyEmissionsApr: v.optional(v.number()),
            borrowEmissionsApr: v.optional(v.number()),
            meta: v.strictObject({
                name: v.string(),
                symbol: v.string(),
                decimals: v.number(),
                asset: v.union([
                    v.strictObject({ code: v.literal('XLM') }),
                    v.strictObject({ code: v.string(), issuer: v.string() })
                ])
            }),
            reserve: v.strictObject({
                poolId: v.string(),
                assetId: v.string(),
                borrowApr: v.number(),
                estBorrowApy: v.number(),
                supplyApr: v.number(),
                estSupplyApy: v.number(),
                latestLedger: v.number(),
                rateDecimals: v.number(),
                liabilityFactor: v.number(),
                config: v.object({
                    decimals: v.number()
                }),
                data: v.optional(v.object())
            }),
            price: v.number(),
            user: v.strictObject({
                positions: v.strictObject({
                    liability: v.number(),
                    collateral: v.number(),
                    liabilityDTokens: v.string(),
                    collateralBTokens: v.string()
                })
            })
        })
    )
});

const SentimentSchema = v.strictObject({
    source: v.literal('sentiment'),
    provider: v.literal('https://api.alternative.me/fng/'),
    data: v.strictObject({
        value: v.regex(v.string(), DIGITS),
        value_classification: v.string(),
        timestamp: v.regex(v.string(), DIGITS),
        time_until_update: v.regex(v.string(), DIGITS)
    })
});

const ReflectorSchema = v.strictObject({
    source: v.literal('reflector'),
    oracleId: v.string(),
    assetId: v.string(),
    decimals: v.number(),
    price: v.regex(v.string(), DIGITS),
    timestamp: v.number()
});

const CyberbrawlSchema = v.strictObject({
    source: v.literal('cyberbrawl'),
    asset: v.strictObject({
        code: v.string(),
        issuer: v.string(),
        name: v.optional(v.string()),
        id: v.optional(v.string())
    }),
    market: v.strictObject({
        code: v.string(),
        issuer: v.string()
    }),
    prices: v.strictObject({
        bid: v.optional(
            v.strictObject({
                price: v.number()
            })
        ),
        ask: v.optional(
            v.strictObject({
                price: v.number()
            })
        )
    }),
    updated: v.string()
});

function validate(schema, value) {
    return v.parse(schema, sanitize(value));
}

module.exports = {
    FeedbackSchema,
    AmmSchema,
    BlendSchema,
    SentimentSchema,
    ReflectorSchema,
    CyberbrawlSchema,
    validate,
    validator: v
};
