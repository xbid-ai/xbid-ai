/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, css, html } from 'lit';
import './leaderboard';
import './help';
import './lab';
import './api';
import './log';

export class DialogElement extends LitElement {
    static get properties() {
        return {
            data: { type: Object },
            visible: { type: Boolean }
        };
    }

    constructor() {
        super();
        this.data = {};
        this.visible = false;
        this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    updated(changedProperties) {
        if (changedProperties.has('visible')) {
            if (this.visible) {
                const header = document.querySelector('header-element');
                header.menuOpen = false;
                this._loadContent();
                window.addEventListener('keydown', this._handleKeyDown);
                requestAnimationFrame(() => {
                    this.shadowRoot.querySelector('.overlay')?.classList.add('visible');
                });
            } else {
                window.removeEventListener('keydown', this._handleKeyDown);
                this.shadowRoot.querySelector('.overlay')?.classList.remove('visible');
            }
        }
    }

    render() {
        return html`
            <div class="overlay" @click=${this._handleOverlayClick}>
                <div class="blurred-background"></div>
                    <div class="dialog">
                        <div class="title-bar">
                            <span class="title-text">${this.data.title || 'Page'}</span>
                            <button class="close-btn" @click=${this._close}>×</button>
                        </div>
                        <div class="content">
                            <div class="body">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _close() {
        this.visible = false;
        window.removeEventListener('keydown', this._handleKeyDown);
    }

    _handleOverlayClick(e) {
        if (e.target !== this.shadowRoot.querySelector('.blurred-background')) {
            return;
        }
        this._close();
    }

    _handleKeyDown(e) {
        if (e.key === 'Escape') {
            this._close();
        }
    }

    async _loadContent() {
        const body = this.shadowRoot.querySelector('.body');
        const content = this.shadowRoot.querySelector('.content');
        body.innerHTML = '';
        const pages = {
            leaderboard: 'leaderboard-element',
            api: 'api-element',
            help: 'help-element',
            log: 'log-element',
            lab: 'lab-element'
        };

        if (this.data.file) {
            content.classList.remove('flush');
            try {
                const response = await fetch(this.data.file, { headers: { Accept: 'text/plain' } });
                if (!response.ok) {
                    throw new Error('Failed to load content');
                }
                const text = await response.text();
                const pre = document.createElement('pre');
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.wordWrap = 'break-word';
                pre.style.fontFamily = 'var(--font)';
                pre.style.fontWeight = '300';
                pre.textContent = text;
                body.appendChild(pre);
            } catch (err) {
                body.textContent = `Failed to load content ${this.data.file}`;
            }
        } else if (this.data.page) {
            content.classList.add('flush');
            const tag = pages[this.data.page];
            if (tag) {
                const element = document.createElement(tag);
                body.appendChild(element);

                if (this.data.page === 'log') {
                    const body = document.querySelector('body-element');
                    element.items = body.events;
                } else if (this.data.page === 'leaderboard') {
                    element.items = this.data.leaderboard.slice();
                }
            } else {
                body.textContent = `Page not found: ${this.data.page}`;
            }
        }
    }

    static get styles() {
        return css`
            :host {
                display: block;
                font-family: inherit;
                font-size: inherit;
            }

            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
                z-index: 1000;
            }

            .overlay.visible {
                opacity: 1;
                visibility: visible;
            }

            .blurred-background {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                backdrop-filter: blur(3px);
                z-index: -1;
            }

            .dialog {
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                flex-direction: column;
                height: calc(100dvh - 100px);
                width: calc(100% - 50px);
                max-width: 650px;
                margin: 10px 0;
                border-radius: 8px;
                transform: translateY(100%);
                transition: transform 0.2s ease-in-out;
                position: relative;
                color: inherit;
            }

            .overlay.visible .dialog {
                transform: translateY(0);
            }

            .title-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 7px 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .title-text {
                font-family: var(--terminal-font);
                font-size: 1.1rem;
                font-weight: 500;
                color: #fff;
                padding-left: 10px;
            }

            .title-text::before {
                content: ':';
                color: var(--primary);
                margin-right: 0.4rem;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--dimmed);
                transition: transform 0.3s ease, color 0.3s ease;
            }

            .close-btn:hover {
                transform: scale(1.2);
                color: #fff;
            }

            .content {
                padding: 10px 24px;
                overflow-y: auto;
                flex-grow: 1;
                text-align: left;
                line-height: 1.5;
            }

            .body {
                margin-bottom: 30px;
            }

            .content.flush {
                padding: 0;
            }

            .content.flush .body {
                margin: 0;
            }

            @media (max-width: 599px) {
                .dialog {
                    border-radius: 0px;
                    height: 100dvh;
                    width: 100%;
                    margin: 0;
                }
            }
        `;
    }
}

window.customElements.define('dialog-element', DialogElement);
