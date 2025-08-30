/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `ReflectorAdapter` fetches oracle price data from Reflector oracles
 * and exposes the following observables to the pipeline:
 *   - slope: scalar from the linear trendline (OLS) of the price series.
 *   - value: raw price normalized using oracle decimals.
 *   - freshness: seconds since last oracle tick to help strategies detect staleness.
*/

const path = require('path');
const { Account, BASE_FEE, TransactionBuilder, rpc, Contract, scValToNative, Address, StrKey, xdr } = require('@stellar/stellar-sdk');
const { Adapter } = require('.');
const { log, keypair, toFloat } = require('../../utils');
const { ReflectorSchema, validate, validator } = require('./schemas');

const DEFAULT_FEE = String(Math.trunc(Number(BASE_FEE) * 1000));
const source = path.basename(__filename, '.js');

const builder = (config) => new TransactionBuilder(
    new Account(keypair.publicKey(), '0'),
    { fee: DEFAULT_FEE, networkPassphrase: config.network.passphrase });

const asset = (id) => StrKey.isValidContract(id)
    ? xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Stellar'), Address.fromString(id).toScVal()])
    : xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Other'), xdr.ScVal.scvSymbol(id)]);

class ReflectorAdapter extends Adapter {
    static #rpc;

    static async getPrice(config, oracleId, assetId) {
        const transaction = builder(config)
            .addOperation(new Contract(oracleId).call('lastprice', asset(assetId)))
            .setTimeout(60).build();
        const response = await this.#rpc.simulateTransaction(transaction);
        if (rpc.Api.isSimulationSuccess(response)) {
            const value = xdr.ScVal.fromXDR(response.result?.retval.toXDR('base64'), 'base64')?.value();
            return { price: scValToNative(value[0]?.val()), timestamp: Number(scValToNative(value[1]?.val())) };
        } else {
            throw new Error(response.error);
        }
    }

    static async getDecimals(config, oracleId) {
        const transaction = builder(config)
            .addOperation(new Contract(oracleId).call('decimals'))
            .setTimeout(60).build();
        const response = await this.#rpc.simulateTransaction(transaction);
        if (rpc.Api.isSimulationSuccess(response)) {
            return scValToNative(response.result.retval);
        } else {
            throw new Error(response.error);
        }
    }

    static async fetch(config, cache) {
        try {
            this.#rpc ||= new rpc.Server(config.network.rpcUrl, { allowHttp: true });
            const oracles = config.strategy?.reflector || [];
            const decimals = new Map();
            await Promise.all(
                [...new Set(oracles.map(e => e.oracle).filter(Boolean))]
                    .map(async(oracle) => {
                        decimals.set(oracle, await this.getDecimals(config, oracle));
                    }));
            const results = await Promise.all(
                oracles.flatMap(({ oracle, assets = [] }) => {
                    if (!decimals.has(oracle)) {
                        return [];
                    }
                    return assets.map(async(assetId) => {
                        const price = await this.getPrice(config, oracle, assetId);
                        if (!price) {
                            return null;
                        }
                        return { source, oracleId: oracle, assetId, decimals: decimals.get(oracle), ...price };
                    });
                })
            );
            const rows = results.filter(Boolean);
            validate(validator.array(ReflectorSchema), rows);
            return rows;
        } catch (err) {
            log.warn('ADAPTER', 'Failed to fetch oracle data', err);
            return null;
        }
    }

    static normalize(config, input) {
        const ok = validate(ReflectorSchema, input);
        return {
            source: ok.source,
            oracleId: ok.oracleId,
            assetId: ok.assetId,
            price: toFloat(+ok.price, ok.decimals),
            timestamp: Number(ok.timestamp * 1000)
        };
    }

    static distill(config, row, col) {
        return {
            source: row.source,
            oracleId: row.oracleId,
            assetId: row.assetId,
            observables: {}
        };
    }

    static get parameters() {
        return {
            observables: {
                price: {
                    value: {
                        method: 'raw',
                        accessor: (row, col) => row.price
                    },
                    slope: {
                        method: 'slope',
                        accessor: (row, col) => row.price
                    },
                    freshness: {
                        method: 'raw',
                        accessor: (row, col) => {
                            return Math.max(0, Math.floor((Date.now() - row.timestamp) / 1000));
                        }
                    }
                }
            },
            dimensions: {
                rows: {
                    predicate: (row) => {
                        return (e) => e.source === 'reflector'
                            && e.oracleId === row.oracleId
                            && e.assetId === row.assetId;
                    }
                }
            }
        };
    }
}

module.exports = { ReflectorAdapter };
