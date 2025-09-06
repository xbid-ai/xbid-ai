/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';
import './dialog';
import { Pages } from '../misc/types';

export class Help extends LitElement {
    static openTimeout;

    render() {
        return html`
          <section class="wrap">
            <div class="sub">
              <img class="icon" src="/logo.svg" alt="xbid.ai logo" />
              <p class="subtext">xbid.ai is a multi-LLM AI agent, staked, born on <a href="https://stellar.org/developers" target="_blank" rel="noopener">Stellar</a>. It trades for real, from executing delta-neutral strategies with AMM-hedged <a href="https://docs.blend.capital/" target="_blank" rel="noopener">Blend</a> borrows to compounding recursive yield loops — on a loop that generalizes beyond markets under selection pressure. Follow xbid.ai. The edge is yours.</p>
            </div>
            <div class="body">
                <p class="warning">
                Services are non-custodial, not financial advice. Please read our <a href="/terms" title="Terms"
                  @click=${(e) => this._handleClick(e, undefined, 'terms of use', '/terms.txt')}>terms</a> before use.
              </p>
              <p>
                <span class="label"><a href="/api" title="Api"
                  @click=${(e) => this._handleClick(e, Pages.api, 'ai signals')}>stream</a> ai signals</span>
                Live strategy intelligence from the same engine that trades our stake; tailor outputs to your wallet, assets and risk preferences with pro tiers.
              </p>
              <p>
                <span class="label"><a href="/lab" title="Lab"
                  @click=${(e) => this._handleClick(e, Pages.lab, 'ai lab')}>enter</a> ai lab</span>
                Experimental reinforcement for the agent — free for all, no deposits required; participate in gamified activities to unlock onchain rewards, verified by smart contract.
              </p>
              <p>
                <span class="label"><a href="https://github.com/xbid-ai/xbid-ai" target="_blank" rel="noopener">git clone</a> xbid.ai</span>
                Core stack — client, server, and full data pipeline (ingestion, distillation, analysis), plus LLM (router, behavior, persona), strategy, and signal interfaces — all MIT licensed. Clone it, fork it, run your own strategy.
              </p>
              <div class="social">
                <a href="https://x.com/xbid_ai" class="social-btn" target="_blank" title="Follow on X.com" rel="noopener">
                  <svg role="img" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                </a>
                <a href="https://github.com/xbid-ai" class="social-btn" target="_blank" title="Source on GitHub" rel="noopener">
                  <svg role="img" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                </a>
                <a href="https://blog.xbid.ai" class="social-btn" target="_blank" title="Read the blog" rel="noopener">
                    <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z"/></svg>
                </a>
              </div>
              <p class="founder">
                Built with ❤️ by Fred Kyung-jin Rezeau (오경진 吳景振) — <a class="link" href="https://github.com/FredericRezeau" target="_blank" rel="noopener">GitHub</a>.
              </p>
            </div>
          </section>
        `;
    }

    _handleClick(e, page, title, file) {
        e.preventDefault();
        clearTimeout(this.openTimeout);
        const dialog = document.querySelector('dialog-element');
        dialog.visible = false;
        this.openTimeout = setTimeout(() => {
            dialog.data = { title, page, file };
            dialog.visible = true;
        }, 120);
    }

    static styles = css`
        :host {
            display: block;
            color: var(--fg, #ffffff);
            font-family: var(--font);
            line-height: 1.5;
            font-weight: 300;
            font-size: 1.1rem;
        }

        .wrap {
            padding: 16px 20px 20px;
        }

        .sub {
            font-family: var(--font);
            display: flex;
            align-items: normal;
            gap: 20px;
            margin-bottom: 40px;
            margin-top: 10px;
        }

        .icon {
            width: 50px;
            height: 50px;
            display: grid;
            place-items: center;
            opacity: 0.95;
        }

        .subtext {
            margin: 0;
        }

        .body p {
            margin: 40px 0;
        }

        .label {
            display: block;
            font-family: var(--terminal-font);
            font-weight: 600;
            margin-bottom: 10px;
        }

        .label::before {
            content: '$ ';
            color: #43ffaf;
            margin-right: 0.4rem;
        }

        code {
            background: rgba(255, 255, 255, .06);
            padding: 2px 6px;
            border-radius: 6px;
            font-family: var(--terminal-font);
        }

        a {
            color: var(--primary);
            text-decoration: none;
            transition: color 0.2s ease, text-shadow 0.2s ease;
        }

        a:hover {
            color: var(--primary-lite);
            text-decoration: underline;
            text-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
        }

        .social {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
        }

        .social-btn {
            background: rgba(11, 11, 14, 0.5);
            border: 1px solid #272b30;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .social-btn svg {
            width: 22px;
            height: 22px;
            fill: #fff;
        }

        .social-btn:hover {
            border-color: var(--primary);
            box-shadow: 0 0 4px rgba(53, 193, 241, .3);
        }

        .social-btn:hover svg {
            fill: var(--primary);
        }

        .pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 28px;
            padding: 0 10px;
            border: 1px solid #272b30;
            border-radius: 999px;
            color: #fff;
            text-decoration: none;
            background: rgba(11, 11, 14, .5);
            transition: all .2s ease;
        }

        .pill:hover {
            border-color: var(--primary);
            box-shadow: 0 0 4px rgba(53, 193, 241, .3);
            color: var(--primary);
        }

        .warning {
            margin: 18px auto;
            max-width: 42rem;
            padding: 10px 12px;
            text-align: center;
            color: #ffe08a;
            background: linear-gradient(180deg, rgba(255, 224, 138, 0.06), rgba(255, 224, 138, 0.03));
            border: 1px solid rgba(255, 224, 138, 0.35);
            border-radius: 10px;
            font-size: 0.95rem;
            line-height: 1.45;
        }

        .warning a {
            color: #ffe08a;
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .warning a:hover {
            text-shadow: 0 0 6px rgba(255, 224, 138, 0.25);
        }

        .founder {
            margin-top: 14px;
            color: #C0C8D6;
            text-align: center;
            font-size: 0.96rem;
        }
    `;
}

customElements.define('help-element', Help);
