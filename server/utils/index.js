/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const crypto = require('crypto');

function pick(obj, keys) {
    return obj ? Object.fromEntries(keys.map(k => [k, obj[k]])) : obj;
}

function shortId(input, len = 12) {
    return crypto.createHash('sha256')
        .update(input).digest('hex').slice(0, len);
}

// *Not* cryptographically secure.
function randId() {
    const p = () => {
        return ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3);
    };
    return p() + p();
}

function sanitizeOutput(str) {
    const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    return match ? match[1].trim() : str.trim().replace(/^["']|["']$/g, '');
};

function safeStringify(obj) {
    const prep = (value) => {
        if (value instanceof Map) {
            return Object.fromEntries(value);
        }
        if (Array.isArray(value)) {
            return value.map(prep);
        }
        if (value && typeof value === 'object') {
            const result = {};
            for (const [k, v] of Object.entries(value)) {
                result[k] = prep(v);
            }
            return result;
        }
        return value;
    };
    return JSON.stringify(prep(obj), (_, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : (typeof value === 'number' && !Number.isFinite(value) ? 0 : value)
    );
}

function capitalize(str) {
    return str
        ? str[0].toUpperCase() + str.slice(1)
        : str;
}

function getClass(prefix, suffix) {
    return `${capitalize(prefix)}${capitalize(suffix)}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function requireOverride() {
    throw new Error('Must be implemented by subclass');
}

function strToBigInt(input, decimals) {
    let scaled;
    if (input.includes('.')) {
        const [base, decimal] = input.split('.');
        scaled = `${base}${decimal}${'0'.repeat(decimals - decimal.length)}`;
    } else {
        scaled = `${input}${'0'.repeat(decimals)}`;
    }
    return BigInt(scaled);
}

function toFloat(value, decimals = 7) {
    return typeof value === 'bigint'
        ? Number(value) / Math.pow(10, decimals)
        : value / Math.pow(10, decimals);
}

function validPrice(n) {
    return Number.isFinite(n) && n > 0;
}

function safeJson(s) {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

module.exports = {
    ...require('./keys'),
    ...require('./log'),
    ...require('./tokkit'),
    pick,
    toFloat,
    shortId,
    randId,
    safeStringify,
    capitalize,
    getClass,
    sleep,
    requireOverride,
    strToBigInt,
    sanitizeOutput,
    validPrice,
    safeJson
};
