/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { Keypair } = require('@stellar/stellar-sdk');

const keypair = Keypair.fromSecret(process.env.XBID_WALLET);

module.exports = { keypair };
