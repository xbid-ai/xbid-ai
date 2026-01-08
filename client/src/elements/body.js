/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { html, LitElement, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { animations } from './animations.js';
import { Utils } from '../misc/utils';
import { Pages } from '../misc/types';
import './dialog';

const pollingFrequency = 10;
const endpoint = import.meta.env.VITE_API_ENDPOINT;

class Message {
    constructor() {
        this.id = crypto.randomUUID();
        this.deleteAt = 0;
        this.created = Date.now();
    }
}

export class BodyElement extends LitElement {
    #pollingTimeout = null;

    static get properties() {
        return {
            messages: { type: Array },
            events: { type: Array }
        };
    }

    constructor() {
        super();
        this.messages = [];
        this.events = [];
    }

    async fetchData() {
        clearTimeout(this.#pollingTimeout);

        const now = Date.now();
        this.messages = this.messages.filter(m => !m.deleteAt || m.deleteAt > now);

        try {
            const result = await Utils.fetch(`${endpoint}/agent/feed`);
            if (result.status === 'ok' && result.data?.id) {
                const existing = this.messages.find(m => result.data.id === m.data.id);
                if (!existing) {
                    for (const m of this.messages) {
                        if (!m.deleteAt) {
                            m.deleteAt = now + 3000;
                        }
                    }
                    const message = new Message();
                    message.data = result.data;
                    this.messages = [...this.messages, message];
                    const header = document.querySelector('header-element');
                    header.data = result.data;
                    this.events = message.data.events;
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            this.#pollingTimeout = setTimeout(() => {
                this.fetchData();
            }, pollingFrequency * 1000);
        }
    }

    firstUpdated() {
        setTimeout(() => {
            this.fetchData();
        }, 2000);
    }

    render() {
        return html`
            <div class="container">
                <div class="content">
                    <div class="title">
                        <img class="logo" src="/xbid-ai-logo-white.svg" alt="xbid.ai logo" /><br/>
                        intelligence. staked. onchain.
                    </div>
                    <div class="message-wrapper">
                        <div class="terminal-echo"><div class="terminal-echo-line"><a href="/log" @click=${(e) => this._handleClick(e, Pages.log, 'tail ai trade log')}>tail</a> ai trade log<span class="caret"></span></div></div>
                        ${this.messages.length === 0
                            ? html`<div class="loader flip-square"></div>`
                            : repeat(this.messages, m => m.id, (m) => {
                                const label = 'view tx';
                                const message = (m.data.message || m.data.inference?.description || '')?.replace(/\.\s*$/, '');
                                const tx = this._getTx(m.data);
                                return html`
                                    <div
                                        class="message ${m.deleteAt ? 'fade-out' : 'fade-in'}"
                                        style="animation: ${m.deleteAt ? 'fadeOut 0.6s ease forwards' : 'fadeIn 0.6s ease forwards'}">
                                            <span class="text">${unsafeHTML(message || '')}<span class="nowrap"> <a href="https://stellar.expert/explorer/public/tx/${tx}" target="_blank" title="View onchain" rel="noopener">// ${label}</a></span></span>
                                            
                                    </div>
                                `;
                            })}
                    </div>
                    <div class="terminal">
                        <div class="terminal-line"><a href="/lab" @click=${(e) => this._handleClick(e, Pages.lab, 'xbid.ai lab')}>enter</a> <b>ai lab</b></div>
                        <div class="terminal-line"><a href="/api" @click=${(e) => this._handleClick(e, Pages.api, 'xbid.ai signals')}>stream</a> <b>ai signals</b></div>
                        <div class="terminal-line"><a href="https://github.com/xbid-ai/xbid-ai" target="_blank" rel="noopener">git clone</a> xbid.ai</div>
                    </div>
                </div>
            </div>
        `;
    }

    _getTx(it) {
        return Array.isArray(it.transactions) && it.transactions.length ? it.transactions[0] : null;
    }

    _handleClick(e, page, title) {
        e.preventDefault();
        const dialog = document.querySelector('dialog-element');
        dialog.data = { title, page };
        dialog.visible = true;
    }

    static get styles() {
        return [
            animations,
            css`
            :host {
                display: block;
                width: 100%;
                height: auto;
            }

            .container {
                display: flex;
                min-height: calc(100vh - 100px);
                margin-top: 100px;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                box-sizing: border-box;
                padding-bottom: 50px;
                padding-left: 3rem;
                padding-right: 3rem;
            }

            .content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 5rem;
                width: 100%;
                max-width: 700px;
                transform: translateY(-7vh);
            }

            .logo {
                height: 66px;
                width: auto;
                max-width: 80%;
                pointer-events: none;
                transition: height 0.3s ease-in-out;
            }

            .loader {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 2rem auto;
            }

            .message-wrapper {
                height: auto;
                width: 100%;
                min-height: 4rem;
                text-align: left;
            }

            .message {
                font-family: var(--title-font), sans-serif;
                font-weight: 400;
                font-size: 1.6rem;
                line-height: 2.2rem;
                color: white;
            }

            .message .text::before {
                content: '»';
                position: absolute;
                left: 0;
                top: 0;
                color: #888888;
                font-size: 1.8rem;
            }

            .message .text {
                display: block;
                padding-left: 1.8rem;
                position: relative;
            }

            .message a {
                font-size: 1.2rem;
                color: var(--primary);
                text-decoration: none;
                transition: color 0.2s ease, text-shadow 0.2s ease;
            }

            .message a:hover {
                color: var(--primary-lite);
                text-decoration: underline;
                text-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
            }

            .message .console {
                font-size: 1.8rem;
                color: #b6b6b6;
            }

            .fade-out {
                position: absolute;
            }

            .action-row {
                display: inline-grid;
                grid-auto-flow: column;
                gap: 2rem;
                margin-top: 0.2rem;
                justify-content: center;
                align-items: center;
            }

            .terminal {
                height: auto;
                width: 100%;
                max-width: 300px;
                text-align: left;
                font-family: var(--terminal-font);
                color: #C0C8D6;
                background: #121217;
                padding: 1.5rem;
                border-radius: 4px;
                border: 1px solid #272b30;
            }

            .terminal-line::before {
                content: '$ ';
                color: var(--success);
                margin-right: 0.4rem;
            }

            .terminal-user-line {
                color: #C0C8D6;
                margin-right: 0.4rem;
                padding-bottom: 10px;
                line-height: 1.6;
            }

            .terminal-user-line .user {
                color: var(--success);
                margin-right: 0.1rem;
                font-weight: 600;
            }

            .terminal-line a {
                color: var(--primary);
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s ease, text-shadow 0.2s ease;
            }

            .terminal-line a:hover {
                color: var(--primary-lite);
                text-decoration: underline;
                text-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
            }

            .terminal-line,
            .terminal-user-line {
                margin-bottom: 0.3rem;
                line-height: 1.6;
                white-space: nowrap;
                font-size: 1.05rem;
                font-weight: 400;
            }

            .caret {
                position: relative;
                display: inline-block;
                top: -3px;
                width: 8px;
                height: 1.2em;
                background: var(--primary);
                animation: blink 1s steps(1) infinite;
                vertical-align: bottom;
                margin-left: 3px;
            }

            .terminal-echo {
                height: auto;
                width: 100%;
                max-width: 400px;
                text-align: left;
                font-family: var(--terminal-font);
                color: #C0C8D6;
            }

            .terminal-echo-line {
                margin-bottom: 0.35rem;
                line-height: 1.6;
                white-space: nowrap;
                font-size: 1rem;
                font-weight: 400;
                padding-bottom: 10px;
            }

            .terminal-echo-line::before {
                content: '$ ';
                color: var(--success);
                margin-right: 0.4rem;
            }

            .terminal-echo-line .command {
                color: var(--primary);
                margin-right: 0.1rem;
                font-weight: 600;
            }

            .terminal-echo-line a {
                color: var(--primary);
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s ease, text-shadow 0.2s ease;
            }

            .terminal-echo-line a:hover {
                color: var(--primary-lite);
                text-decoration: underline;
                text-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
            }

            .title {
                font-family: var(--terminal-font);
                font-size: 1.1rem;
                text-align: center;
                color: #C0C8D6;
                line-height: 1.6;
            }

            .highlight {
                font-weight: 500;
                color: #FFF;
            }

            .title a {
                color: var(--primary);
                text-decoration: none;
                font-weight: 300;
                transition: color 0.2s ease, text-shadow 0.2s ease;
            }

            .title a:hover {
                color: var(--primary-lite);
                text-decoration: underline;
                text-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
            }

            @media screen and (max-height: 500px) and (orientation: landscape) {
                .logo {
                    height: 40px;
                }

                .content {
                    gap: 3rem;
                }
            }

            .nowrap {
                white-space: nowrap;
            }

            /* License: MIT - source: https://github.com/jh3y/whirl/blob/dist/css/flip-square.css */
            .flip-square:before {
                animation: flip-square 1.5s infinite;
                background-color: rgba(255, 255, 255, 0.9);
                content: '';
                display: block;
                height: 30px;
                width: 30px;
            }

            .line:before {
                animation: line .75s infinite alternate ease-in-out;
                background: -webkit-gradient(linear, left top, right top, from(rgba(255, 255, 255, 0.9)), to(rgba(255, 255, 255, 0.9)));
                background: linear-gradient(90deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9));
                background-repeat: no-repeat;
                background-size: 60px 20px;
                content: '';
                display: block;
                height: 20px;
                width: 60px;
            }

            @media (max-width: 599px) {
                .message {
                    font-size: 1.3rem;
                }

                .message a {
                    font-size: 1.2rem;
                }

                .message .console {
                    font-size: 1.6rem;
                }

                .terminal-line,
                .terminal-user-line {
                    font-size: 1rem;
                }

                .content {
                    gap: 4rem;
                }
            }
        `];
    }
}

customElements.define('body-element', BodyElement);
