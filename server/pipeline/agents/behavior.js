/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Behavior` class implements persona-driven behaviors for LLMs building specific
 * LLM prompt templates and tasks for agents (customizable via persona.yaml).
 * For each build, invoke() sends a system+user message pair to the configured LLM via the Router.
 */

const { sanitizeOutput } = require('../../utils');
const { Router } = require('../router');
const { Persona } = require('./persona');

class Behavior {
    #persona = new Persona();
    constructor(builds) {
        for (const build of Object.keys(builds)) {
            const entry = builds[build];
            if (typeof entry !== 'object' || !entry.instructions || !entry.task) {
                throw new Error(`Invalid build '${build}'`);
            }
            const persona = `
                You are ${this.#persona.name()}, a ${this.#persona.archetype(build)}.
                ${this.#persona.role(build)}.
                ${this.#persona.guide(build)}
            `;
            this[`${build}Instructions`] = `${persona}\n${entry.instructions}`;
            this[`${build}Task`] = entry.task;
        }
        Object.freeze(this);
    }

    async invoke({ build, input, temperature, tokens }) {
        const sys = this[`${build}Instructions`];
        const task = this[`${build}Task`];
        if (!sys || !task) {
            throw new Error(`Unknown build '${build}'`);
        }
        return sanitizeOutput(await Router.dispatch({
            provider: this.#persona.provider(build),
            model: this.#persona.model(build),
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: `${task} ${input}`.trim() }
            ],
            temperature,
            tokens
        }));
    }
}

module.exports = { Behavior };
