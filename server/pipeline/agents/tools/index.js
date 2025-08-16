/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { keypair } = require('../../../utils');
const { stellarHorizon } = require('../../../utils/network');

async function getBalances() {
    const account = await stellarHorizon.loadAccount(keypair.publicKey());
    const balances = {};
    for (const b of account.balances) {
        if (b.asset_type === 'native') {
            balances.XLM = parseFloat(b.balance);
        } else if (b.asset_type === 'liquidity_pool_shares') {
            balances[b.liquidity_pool_id] = parseFloat(b.balance);
        } else {
            balances[`${b.asset_code}:${b.asset_issuer}`] = parseFloat(b.balance);
        }
    }
    return balances;
}

module.exports = {
    ...require('./sdex'),
    ...require('./blend'),
    getBalances
};
