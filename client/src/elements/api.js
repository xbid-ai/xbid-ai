/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import targetIcon from '../assets/target.svg?raw';

export class Api extends LitElement {
    static openTimeout;

    render() {
        return html`
          <section class="wrap">
            <div class="sub">
              <div class="icon" aria-hidden="true">${unsafeSVG(targetIcon)}</div>
              <p class="subtext">
                Live strategy intelligence from the same engine that trades our stake.
              </p>
            </div>
            <div class="body">
                <p class="warning">
                Services are non-custodial, not financial advice. Please read our <a href="/terms" title="Terms" @click=${this._handleTermsClick}>terms</a> before use.
              </p>
              <p>
                xbid.ai publishes real, on-chain decisions. <strong>ai signals</strong> is your feed into the same strategy layer the agent uses to trade — clean deltas, timing hints, and pathing context drawn directly from live execution.
              </p>
              <p>
                Coming soon: open access with pro tiers to tailor outputs to your wallet, assets, and risk preferences.
                </p>
                <p>
                Be first to tap into the live feed — follow us on <a href="https://blog.xbid.ai" target="_blank">our blog</a> or
                <a href="https://x.com/xbid_ai" target="_blank" rel="noopener">social</a> for updates.
              </p>
            </div>
          </section>
        `;
    }

    _handleTermsClick(e) {
        e.preventDefault();
        clearTimeout(this.openTimeout);
        const dialog = document.querySelector('dialog-element');
        dialog.visible = false;
        this.openTimeout = setTimeout(() => {
            dialog.data = {
                title: 'terms',
                file: '/terms.txt'
            };
            dialog.visible = true;
        }, 120);
    }

    static styles = css`
      :host {
          display: block;
          color: #fff;
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
          align-items: center;
          gap: 20px;
          margin-bottom: 40px;
          margin-top: 10px;
      }

      .icon {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          opacity: 0.9;
      }

      .icon svg {
          stroke: var(--primary);
          color: var(--primary);
          width: 50px;
          height: 50px;
      }

      .subtext {
          margin: 0;
      }

      .body p {
          margin: 40px 0;
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

      .warning {
          margin: 18px auto;
          max-width: 42rem;
          padding: 10px 12px;
          text-align: center;
          color: var(--warning);
          background: linear-gradient(180deg, rgba(255, 224, 138, 0.06), rgba(255, 224, 138, 0.03));
          border: 1px solid rgba(255, 224, 138, 0.35);
          border-radius: 10px;

          font-size: 0.95rem;
          line-height: 1.45;
      }

      .warning a {
          color: var(--warning);
          text-decoration: underline;
          text-underline-offset: 2px;
      }

      .warning a:hover {
          text-shadow: 0 0 6px rgba(255, 224, 138, 0.25);
      }
    `;
}

customElements.define('api-element', Api);
