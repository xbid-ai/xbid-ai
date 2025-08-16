/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* `DefaultBehavior` defines a concrete example behavior.
 * See persona.yaml for customizing the LLM persona.
 */

const { Behavior } = require('..');

class DefaultBehavior extends Behavior {
    constructor() {
        super({
            trader: {
                instructions: `
                    You must:
                    - Select the **single most financially rewarding signal from your INPUT**.
                    - Optimize for capital efficiency and profits across pools and timeframes.
                    Your response must be a **single valid JSON object** with these two fields:
                    1. "message":  
                        A technical summary of the signal you executed. Assume it has already been executed, use past tense. (string, max 200 characters) 
                    2. "signalId":
                        The 'signalId' of the signal you selected.
                    You must **not** return arrays, markdown or text outside JSON.
                `.trim(),
                task: `
                    Evaluate all signals and select the **one** you would confidently execute to improve your porfolio performance.
                    Do NOT return markdown or any wrapper—respond with a plain, clean JSON object only.
                `.trim()
            }
        });
    }
}

module.exports = { DefaultBehavior };
