/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { log, keypair } = require('../../../utils');
const { stellarRpc } = require('../../../utils/network');
const { prepare } = require('../../../utils/database');

async function awaitResponse(response, env) {
    const hash = response.hash;
    while (response.status === 'PENDING' || response.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        response = await stellarRpc.getTransaction(hash);
    }
    response.feeCharged = (response.feeCharged
        || response.resultXdr?._attributes?.feeCharged || 0).toString();
    log[response.status === 'SUCCESS' ? 'info' : 'error']('AGENT',
        `Transaction status: ${response.status}, fee: ${(Number.parseInt(response.feeCharged) / 1e7).toFixed(7)} XLM`);
    record({
        hash,
        response: {
            status: response.status,
            feeCharged: response.feeCharged
        },
        context: env
    });
    return { hash, response };
}

async function submitTransaction(transaction, env) {
    transaction.sign(keypair);
    return await awaitResponse(await stellarRpc.sendTransaction(transaction), env);
}

function logError(err) {
    if (err.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        log.warn('AGENT', 'Execution failed', {
            transaction: codes.transaction,
            operations: codes.operations
        });
    } else {
        log.warn('AGENT', 'Execution failed', err);
    }
}

function record({ hash, response, context }) {
    const query = prepare(`
        INSERT INTO transactions (timestamp, hash, response, context)
        VALUES (?, ?, ?, ?)
    `);
    query.run(
        Date.now(),
        hash,
        JSON.stringify(response),
        JSON.stringify(context || {})
    );
}

module.exports = { submitTransaction, awaitResponse, logError };
