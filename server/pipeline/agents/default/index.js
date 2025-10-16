/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* `DefaultAgent` is a working example of an autonomous trading agent executing
 * spot trading and delta-neutral hedging strategies for blend borrow
 * positions using SDEX AMMs.
 *
 * Provided as a reference for users to extend or replace with custom strategies,
 * signals, and execution logic. Opinionated toward delta-neutral execution with
 * minimal safety checks (fail-fast).
 */

const { log, shortId, safeJson, keypair } = require('../../../utils');
const { stellarHorizon, DEFAULT_FEE } = require('../../../utils/network');
const { Agent, ammSupply, getBalances, ammWithdraw, sdexSwap } = require('..');
const { DefaultBehavior } = require('./behavior');
const { validate, validator } = require('../../adapters/schemas');
const { SentimentSignal } = require('../default/strategies/signals/sentiment');
const { FeedbackSignal } = require('../default/strategies/signals/feedback');
const { DeltaHedgingStrategy } = require('./strategies/delta-hedging');
const { SpotStrategy } = require('./strategies/spot');

const InferenceSchema = validator.strictObject({
    message: validator.pipe(validator.string(), validator.maxLength(200)),
    signalId: validator.string()
});

class DefaultAgent extends Agent {
    static #behavior = new DefaultBehavior();
    static #env;

    static async prepare(input) {
        let fee = DEFAULT_FEE;
        try {
            fee = (await stellarHorizon.fetchBaseFee() * 1000).toString();
            log.info('AGENT', `Transaction fee: ${fee}`);
        } catch (err) {
            log.warn('AGENT', `Failed to retrieve stellar base fee, using default ${fee}`, err);
        }

        const data = (await Promise.all([
            DeltaHedgingStrategy.prepare(input),
            SpotStrategy.prepare(input)
            // Add additional strategies here...
        ])).flat();

        this.#env = { fee, account: keypair.publicKey(), balances: await getBalances(), ...data[0] };
    }

    static async analyze(input) {
        const signals = (await Promise.all([
            DeltaHedgingStrategy.apply(input, this.#env),
            SpotStrategy.apply(input, this.#env)
        ])).flat().map((s, i) => ({ signalId: shortId(i.toString()), ...s }));

        if (signals.length) {
            const context = (await Promise.all([
                await SentimentSignal.emit(input),
                await FeedbackSignal.emit(input)
                // Add other context signals here..
            ])).flat();

            // Invoke trader LLM for signal inference.
            const rawInference = await this.#behavior.invoke({
                build: 'trader',
                input: `INPUT:\n${JSON.stringify({ context, signals }, null, 2)}\nOUTPUT:`,
                temperature: 0.3,
                tokens: 200
            });
            const inference = safeJson(rawInference);
            try {
                const ok = validate(InferenceSchema, inference);
                const signal = signals.find(s => s.signalId === ok.signalId);
                if (!signal) {
                    log.warn('AGENT', `Failed to select signal '${rawInference}'`);
                }
                return { ...ok, signals, context };
            } catch (err) {
                log.warn('AGENT', `Invalid inference, discarding: ${rawInference}`, err);
                return null;
            }
        } else {
            log.warn('AGENT', 'No signal to analyze');
            return null;
        }
    }

    static async execute(input) {
        const { signalId, signals } = input;
        const signal = signals.find(s => s.signalId === signalId);
        const transactions = [];

        log.info('AGENT', `Received ${signal?.kind} signal to execute`);

        const guardFactor = process.env.DEV_MODE ? 0.05 : 1;
        switch (signal?.kind) {
            case 'enter-delta-neutral': {
                const {
                    data: {
                        poolId,
                        price,
                        assetA: { amount: amountA, code: codeA, issuer: issuerA, decimals: decimalsA },
                        assetB: { amount: amountB, code: codeB, issuer: issuerB, decimals: decimalsB }
                    }
                } = signal;
                const executionAmountA = amountA * guardFactor;
                const executionAmountB = amountB * guardFactor;
                log.exec('AGENT', `Delta-neutral depositing ${executionAmountA.toFixed(decimalsA)} ${codeA} and ${executionAmountB.toFixed(decimalsB)} ${codeB} @ ${price} into SDEX AMM ${poolId}`);
                const res = await ammSupply({ code: codeA, issuer: issuerA }, { code: codeB, issuer: issuerB }, executionAmountA, executionAmountB, { signal, ...this.#env });
                res?.hash && transactions.push(res.hash);
                break;
            }
            case 'exit-delta-neutral': {
                const {
                    data: {
                        poolId,
                        shares,
                        assetA: { code: codeA, issuer: issuerA },
                        assetB: { code: codeB, issuer: issuerB }
                    }
                } = signal;
                log.exec('AGENT', `Delta-neutral withdrawing ${shares} ${codeA}/${codeB} shares from SDEX AMM ${poolId}`);
                const res = await ammWithdraw({ code: codeA, issuer: issuerA }, { code: codeB, issuer: issuerB }, { signal, ...this.#env });
                res?.hash && transactions.push(res.hash);
                break;
            }
            case 'buy-asset': {
                const { data: { amount, price, pair: { base, quote } } } = signal;
                const executionAmount = Number(amount) * guardFactor;
                log.exec('AGENT', `Buying ${base.code} for ${executionAmount.toFixed(7)} ${quote.code} @ ${price}`);
                const res = await sdexSwap(
                    { code: quote.code, issuer: quote.issuer },
                    { code: base.code, issuer: base.issuer }, executionAmount, { signal, ...this.#env });
                res?.hash && transactions.push(res.hash);
                break;
            }
            case 'sell-asset': {
                const { data: { amount, price, pair: { base, quote } } } = signal;
                const executionAmount = Number(amount) * guardFactor;
                log.exec('AGENT', `Selling ${executionAmount.toFixed(7)} ${base.code} for ${quote.code} @ ${price}`);
                const res = await sdexSwap(
                    { code: base.code, issuer: base.issuer },
                    { code: quote.code, issuer: quote.issuer }, executionAmount, { signal, ...this.#env });
                res?.hash && transactions.push(res.hash);
                break;
            }
            case 'flip-asset': {
                const { data: { item, market, price, amount } } = signal;
                log.exec('AGENT', `Flipping ${item.code} for ${market.code} @ ${price}`);
                const res = await sdexSwap(
                    { code: item.code, issuer: item.issuer },
                    { code: market.code, issuer: market.issuer }, amount, { signal, ...this.#env });
                res?.hash && transactions.push(res.hash);
                break;
            }
            default:
                log.warn('AGENT', `Unsupported signal: ${signal?.kind}`);
        }
        return { transactions };
    }
}

module.exports = { DefaultAgent };
