/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import barsIcon from '../assets/bars.svg?raw';

export class Lab extends LitElement {
    render() {
        return html`
          <section class="wrap">
            <div class="sub">
              <div class="icon" aria-hidden="true">${unsafeSVG(barsIcon)}</div>
              <p class="subtext">
                Experimental reinforcement for our live, on-chain trading agent.
              </p>
            </div>

            <div class="body">
              <p class="warning">
                ai lab is experimental; participation is optional and rewards are not guaranteed.
              </p>
              <p>
                xbid.ai runs an autonomous, staked trader. <strong>ai lab</strong> is where you help reinforce its behavior — free for all, no deposits; participate in gamified activities to unlock onchain rewards.
              </p>
              <p>
                Coming soon: Take part in gamified daily experiments, hands-on activities, and seasonal challenges that refine xbid.ai model, with every result and reward verified onchain via smart contract.
                </p>
                <p>Stay ready — new experiments and challenges launching soon. Follow updates on <a href="https://blog.xbid.ai" target="_blank">our blog</a> or
                <a href="https://x.com/xbid_ai" target="_blank" rel="noopener">social</a>.
              </p>
            </div>
          </section>
        `;
    }

    static styles = css`
      :host {
          display: block;
          color: #ffffff;
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
          stroke: var(--success);
          color: var(--success);
          width: 50px;
          height: 50px;
      }

      .subtext {
          margin: 0;
      }

      .body p {
          margin: 40px 0;
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
    `;
}

customElements.define('lab-element', Lab);
