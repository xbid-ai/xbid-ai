/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Signal` base class defines the interface for generating trading signals.
 * Override emit() to produce one or more signals from the given input
 * and environment context.
 */

const { requireOverride } = require('../../utils');

class Signal {
    static async emit(input, env) {
        requireOverride();
    }
}

module.exports = { Signal };
