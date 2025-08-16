/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Adapter` base class defines the interface for data source adapters.
 * Must override:
 *   - fetch(): retrieve raw data from source (optionally with cache).
 *   - normalize(): validate and format raw data.
 *   - distill(): extract row/column-level context to compute observables.
 *   - parameters (getter): define observable mappings and dimension predicates.
 */

const { requireOverride } = require('../../utils');

class Adapter {
    static async fetch(config, cache) {
        requireOverride();
    }

    static normalize(config, input) {
        requireOverride();
    }

    static distill(config, row, col) {
        requireOverride();
    }

    static get parameters() {
        requireOverride();
    }
}

module.exports = { Adapter };
