/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Agent` base class defines the core lifecycle for autonomous trading agents.
 * Must override:
 *   - prepare(): preprocess transformed data before analysis.
 *   - analyze(): evaluate and decide on actions/signals.
 *   - execute(): carry out agent's selected actions.
 */

const { requireOverride } = require('../../utils');

class Agent {
    static async prepare(input) {
        requireOverride();
    }

    static async analyze(input) {
        requireOverride();
    }

    static async execute(input) {
        requireOverride();
    }
}

module.exports = { Agent };
