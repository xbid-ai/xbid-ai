/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Strategy` base class defines the interface for implementing trading strategies.
 * Override prepare() to process data before decision logic, and apply() to generate
 * actions or signals.
 */

const { requireOverride } = require('../../utils');

class Strategy {
    static async prepare(input, env) {
        requireOverride();
    }

    static async apply(input, env) {
        requireOverride();
    }
}

module.exports = { Strategy };
