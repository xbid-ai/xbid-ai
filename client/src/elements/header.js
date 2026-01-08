/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, css, html } from 'lit';
import { Pages } from '../misc/types';

export class Header extends LitElement {
    static properties = {
        data: { type: Object },
        menuOpen: { state: true }
    };

    constructor() {
        super();
        this.data = null;
        this.menuOpen = false;
    }

    render() {
        const equity = this.data?.equity;
        const sign = equity?.pnl ? `${Math.sign(equity.pnl) >= 0 ? '+' : '-'}` : '+';
        const pnl = equity?.pnl ? `${sign}$${Math.abs(equity.pnl).toFixed(2)} (${Math.abs(equity.pnlPct).toFixed(2)}%)` : '';
        const period = equity?.pnl ? `${parseInt(equity.minutes / 1440, 10)}d` : '';
        return html`
          <div class="bar">
            <div class="left terminal-stats shake ${sign === '+' ? 'gains' : 'losses'}">
              <span class="terminal-line ${equity?.pnl ? '' : 'dnone'}">
                $ pnl: ${pnl}<span class="period"> | ${period}</span>
              </span>
              <span class="terminal-line ${equity?.pnl ? 'dnone' : ''}">
                $ pnl
              </span>
            </div>
            <div class="right">
              <a class="btn" href="https://blog.xbid.ai" target="_blank" title="Blog">
                <span class="label">blog</span>
              </a>
              <a class="btn" href="/leaderboard" title="Leaderboard" @click=${(e) => this._openPage(e, Pages.leaderboard, 'leaderboard')}>
                <span class="label">leaderboard</span>
              </a>
              <a class="btn" href="/help" title="Help" @click=${(e) => this._openPage(e, Pages.help, 'xbid-ai --help')}>
                <span class="label">--help</span>
              </a>
              <button class="btn menu-toggle" @click=${this._handleMenuClick} aria-label="Menu" aria-expanded=${this.menuOpen ? 'true' : 'false'}>
                <svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="#35c1f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          ${this.menuOpen
            ? html`
            <nav class="mobile-menu" aria-label="Mobile">
              <button class="backdrop" @click=${this._closeMenu} aria-label="Close menu"></button>
              <div class="sheet">
                <a class="item" href="https://blog.xbid.ai" target="_blank" title="Blog" @click=${this._closeMenu}>
                  <span class="dot">:</span><span>blog</span>
                </a>
                <a class="item" href="/leaderboard" title="Leaderboard" @click=${(e) => { this._openPage(e, Pages.leaderboard, 'leaderboard'); this._closeMenu(); }}>
                  <span class="dot">:</span><span>leaderboard</span>
                </a>
                <a class="item" href="/help" title="Help" @click=${(e) => { this._openPage(e, Pages.help, 'xbid-ai --help'); this._closeMenu(); }}>
                  <span class="dot">:</span><span>--help</span>
                </a>
              </div>
            </nav>
            `
            : null}
        `;
    }

    _openPage(e, page, title) {
        e.preventDefault();
        this._closeMenu();
        const dialog = document.querySelector('dialog-element');
        dialog.data = { title, page };
        dialog.visible = true;

        if (page === Pages.leaderboard) {
            dialog.data.leaderboard = (this.data?.extras?.leaderboard || []).slice();
        }
    }

    _handleMenuClick() {
        this.menuOpen = !this.menuOpen;
    }

    _closeMenu() {
        this.menuOpen = false;
    }

    static styles = css`
        :host {
            position: fixed;
            top: 0;
            width: calc(100vw - var(--scrollbar-width, 0px));
            background: transparent;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 79;
        }

        .bar {
            font-family: var(--terminal-font), sans-serif;
            font-size: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 auto;
            padding: 0.5rem 1rem;
            color: var(--dialog);
        }

        .terminal-stats {
            font-weight: 500;
            white-space: nowrap;
        }

        .btn {
            background: rgba(11, 11, 14, 0.5);
            border: 1px solid #272b30;
            border-radius: 4px;
            padding: 0.4rem 0.6rem;
            color: var(--dialog);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            font-weight: 500;
            transition:
                background 0.2s ease,
                border-color 0.2s ease,
                color 0.2s ease,
                box-shadow 0.2s ease;
        }

        .btn:hover {
            color: var(--primary);
            background: #1b1e22;
            border-color: var(--primary);
            box-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
        }

        .menu-toggle {
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 4px;
            width: 36px;
            height: 36px;
            padding: 0;
            cursor: pointer;
        }

        @keyframes terminal-jitter {
            0%, 100% {
                transform: translateX(0);
            }
            20% {
                transform: translateX(-0.4px);
            }
            40% {
                transform: translateX(0.5px);
            }
            60% {
                transform: translateX(-0.3px);
            }
            80% {
                transform: translateX(0.2px);
            }
        }

        .shake {
            animation: terminal-jitter 0.45s steps(1, end) infinite;
        }

        .dnone {
            display: none;
        }

        .gains {
            color: var(--success);
        }

        .losses {
            color: var(--error);
        }

        .period {
            display: inline;
        }

        .mobile-menu {
            position: fixed;
            left: 0;
            right: 0;
            top: var(--header-height, 56px);
            bottom: 0;
            z-index: 78;
        }
        .mobile-menu .backdrop {
            position: absolute;
            inset: 0;
            background: rgba(8, 10, 12, 0.55);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border: 0;
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
            cursor: default;
        }
        .mobile-menu .sheet {
            position: absolute;
            top: 0.5rem;
            left: 0;
            right: 0;
            display: grid;
            gap: 0.5rem;
            padding: 0 0.75rem;
            animation: slide-in-right 200ms ease-out both;
        }

        @keyframes slide-in-right {
            from { transform: translateX(100px); }
            to   { transform: translateX(0); }
        }
        .mobile-menu .item {
            position: relative;
            display: block;
            padding: 0.9rem 1rem 0.9rem 2.25rem;
            margin: 0 auto;
            width: calc(100% - 1.5rem);
            border: 1px solid #272b30;
            border-radius: 10px;
            background: rgba(11, 11, 14, 0.9);
            color: var(--dialog);
            text-decoration: none;
            font-family: var(--terminal-font), sans-serif;
            font-weight: 600;
            letter-spacing: 0.2px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.35);
            transition:
                transform 0.18s ease,
                border-color 0.2s ease,
                box-shadow 0.2s ease,
                color 0.2s ease;
            transform: translateY(-3px);
        }
        .mobile-menu .item:hover {
            color: var(--primary);
            border-color: var(--primary);
            box-shadow: 0 0 10px rgba(53, 193, 241, 0.25);
            transform: translateY(0);
        }
        .mobile-menu .item .dot {
            position: absolute;
            left: 0.9rem;
            top: 30%;
            width: 8px;
            height: 8px;
            color: var(--primary);
        }

        @media (max-width: 599px) {
            .bar {
                font-size: 1rem;
            }

            .btn:not(.menu-toggle) {
                display: none;
            }

            .menu-toggle {
                display: inline-flex;
            }

            .no-mobile {
                display: none;
            }

            .mobile-only {
                display: block;
            }

            .mobile-menu {
                display: block;
            }
        }

        @media (min-width: 600px) {
            .mobile-menu {
                display: none;
            }
        }
    `;
}

customElements.define('header-element', Header);
