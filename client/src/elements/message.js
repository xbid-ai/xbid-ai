/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, css, html } from 'lit';

export class Message extends LitElement {
    static get properties() {
        return {
            visible: { type: Boolean },
            text: { type: String }
        };
    }

    constructor() {
        super();
        const hide = localStorage.getItem('hide-construction-notice') === 'true';
        this.visible = !hide;
        this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    updated(changed) {
        if (changed.has('visible')) {
            if (this.visible) {
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
            <div class="overlay"
                @click=${this._handleOverlayClick}
                aria-hidden=${this.visible ? 'false' : 'true'}>
                <div class="blurred-background"></div>
                <div class="message" role="status" aria-live="polite">
                <div class="title-bar">
                    <span class="title-text">
                    You found us early!
                    </span>
                    <button class="close-btn" @click=${() => this._close(true)} aria-label="Close">×</button>
                </div>
                <div class="content">
                    <div class="body">
                    <p class="copy">xbid.ai is under active development — sharpening its edge and scaling trades as strategies prove themselves in live conditions.</p>
                    <slot></slot>
                    </div>
                </div>
                </div>
            </div>
        `;
    }

    _close(explicit) {
        if (explicit) {
            localStorage.setItem('hide-construction-notice', 'true');
        }
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

    static get styles() {
        return css`
            :host {
                display: block;
                font-family: inherit;
                font-size: inherit;
                z-index: 1000;
            }

            .overlay {
                position: fixed;
                inset: 0;
                display: grid;
                place-items: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
            }

            .overlay.visible {
                opacity: 1;
                visibility: visible;
            }

            .blurred-background {
                position: absolute;
                inset: 0;
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
                z-index: -1;
            }

            .message {
                background: rgba(0, 0, 0, 0.85);
                border: 1px solid #272b30;
                border-radius: 8px;
                width: min(600px, calc(100% - 48px));
                max-width: 600px;
                min-height: 0;
                color: var(--dialog);
                display: flex;
                flex-direction: column;
                transform: translateY(16px) scale(0.98);
                transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
                box-shadow: 0 0 10px rgba(53, 193, 241, 0.25);
                animation: fadeIn 220ms ease forwards, glow 2.4s ease-in-out infinite;
            }

            .overlay.visible .message {
                transform: translateY(0) scale(1);
            }

            .title-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .title-text {
                font-family: var(--terminal-font), monospace;
                font-size: 1.05rem;
                font-weight: 500;
                color: #fff;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding-left: 6px;
            }

            .title-text::before {
                content: ':';
                color: var(--primary);
                margin-right: 0.35rem;
            }

            .icon {
                display: inline-block;
                transform: translateY(1px);
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 26px;
                cursor: pointer;
                color: var(--dimmed);
                transition: transform 0.2s ease, color 0.2s ease;
            }

            .close-btn:hover {
                transform: scale(1.15);
                color: #fff;
            }

            .content {
                padding: 14px 16px;
                text-align: left;
                line-height: 1.45;
            }

            .body {
                font-family: var(--font);
                font-weight: 300;
            }

            .copy {
                margin: 0;
                font-size: 1rem;
            }

            @keyframes fadeIn {
                from {
                opacity: 0;
                transform: translateY(10px) scale(0.97);
                }
                to {
                opacity: 1;
                transform: translateY(0) scale(1);
                }
            }

            @keyframes glow {
                0%, 100% {
                border-color: #272b30;
                box-shadow: 0 0 10px rgba(53, 193, 241, 0.25);
                }
                50% {
                border-color: var(--primary);
                box-shadow: 0 0 12px rgba(53, 193, 241, 0.4);
                }
            }

            @media (max-width: 599px) {
                .message {
                width: 70%;
                border-radius: 0;
                }
                .content {
                padding: 12px 14px;
                }
            }
        `;
    }
}

customElements.define('message-element', Message);
