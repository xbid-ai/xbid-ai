/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* The `Router` provides a unified interface for calling supported
 * LLM providers: OpenAI, Anthropic, and self-hosted Ollama. It supports temperature control,
 * token limits, and parameter overrides for each provider. Responses are recorded
 * in SQLite for auditing (table `messages` with input/response JSON).
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { config } = require('../config');
const { log, TokenCounter } = require('../utils');
const { prepare } = require('../utils/database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class Router {
    static async dispatch({ provider, model, messages, temperature, tokens }, overrides = {}, params = {}) {
        const inputTokens = await TokenCounter.count(messages);
        const maxInputTokens = Number(process.env.MAX_LLM_TOKEN_INPUT ?? 1e4);
        if (inputTokens > maxInputTokens) {
            throw new Error(`Invalid LLM prompt size: ${inputTokens}/${maxInputTokens}`);
        }

        const routes = {
            openai: async() => {
                if (params.mode === 'response') {
                    const input = {
                        model,
                        input: messages,
                        ...overrides
                    };
                    const response = await openai.responses.create(input);
                    record({ provider, model, input, response });
                    return response.output_text?.trim();
                } else {
                    const input = {
                        model,
                        messages,
                        temperature,
                        max_tokens: tokens,
                        ...overrides
                    };
                    const response = await openai.chat.completions.create(input);
                    record({ provider, model, input, response });
                    return response.choices?.[0]?.message?.content?.trim();
                }
            },
            anthropic: async() => {
                const input = {
                    model,
                    temperature,
                    max_tokens: tokens,
                    system: messages.filter(m => m.role === 'system') // Separate `system` field for anthropic.
                        .map(m => m.content).join('\n') || undefined,
                    messages: messages.filter(m => m.role !== 'system'),
                    ...overrides
                };
                const response = await anthropic.messages.create(input);
                record({ provider, model, input, response });
                return response?.content?.[0]?.text?.trim();
            },
            ollama: async() => {
                const input = {
                    model,
                    messages,
                    temperature,
                    options: { num_predict: tokens },
                    stream: false,
                    ...overrides
                };
                const { data } = await axios.post(`${config.network.ollama}/api/chat`, input, {
                    headers: { 'Content-Type': 'application/json' }
                });
                record({ provider, model, input, response: data });
                return data.message?.content?.trim();
            }
        };
        if (!routes[provider]) {
            throw new Error(`Invalid LLM provider: ${provider}`);
        }
        log.info('LLM', `Calling ${provider}:${model} (tokens:${inputTokens} temperature:${temperature})`);
        return routes[provider]();
    }
}

function record({ provider, model, input, response }) {
    const query = prepare(`
        INSERT INTO messages (timestamp, provider, model, input, response)
        VALUES (?, ?, ?, ?, ?)
    `);
    query.run(
        Date.now(),
        provider,
        model,
        JSON.stringify(input),
        JSON.stringify(response)
    );
}

module.exports = { Router };
