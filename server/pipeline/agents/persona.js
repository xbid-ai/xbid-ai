/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* `personal.yaml` loader. See `Behavior` class for details.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const agentName = process.env.AGENT_NAME || 'default';

class Persona {
    constructor() {
        const file = `${path.join(__dirname, agentName)}/persona.yaml`;
        const raw = fs.readFileSync(file, 'utf8');
        this.doc = yaml.load(raw);
    }

    name() {
        return (this.doc?.name || 'xbid.ai').trim();
    }

    provider(build) {
        return (this.doc?.[build]?.provider || undefined).trim();
    }

    model(build) {
        return (this.doc?.[build]?.model || undefined).trim();
    }

    archetype(build) {
        return (this.doc?.[build]?.archetype || '').trim();
    }

    role(build) {
        return (this.doc?.[build]?.role || '').trim();
    }

    guide(build) {
        const traits = this.doc?.[build]?.traits || [];
        const rules = this.doc?.[build]?.rules || [];
        return [
            'Traits:', ...traits.map(r => `- ${r}`),
            'Rules:', ...rules.map(r => `- ${r}`)
        ].join('\n');
    }
}

module.exports = { Persona };
