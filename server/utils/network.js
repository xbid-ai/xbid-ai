/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { rpc, Horizon, BASE_FEE } = require('@stellar/stellar-sdk');
const { config } = require('../config');

const stellarHorizon = new Horizon.Server(config.network.horizonUrl, { allowHttp: true });
const stellarRpc = new rpc.Server(config.network.rpcUrl, { allowHttp: true });
const DEFAULT_FEE = String(Math.trunc(Number(BASE_FEE) * 1000));

Object.freeze(stellarHorizon);
Object.freeze(stellarRpc);

module.exports = { stellarHorizon, stellarRpc, DEFAULT_FEE };
