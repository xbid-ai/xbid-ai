/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';
import { Utils } from '../misc/utils';

export class Leaderboard extends LitElement {
    static properties = {
        items: { type: Array }
    };

    constructor() {
        super();
        this.items = [];
    }

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        if (!this.items?.length) {
            return html`<div class="empty">Loading…</div>`;
        }
        return html`
          <div class="wrap" role="table" aria-label="XBID Leaderboard">
            <div class="thead" role="rowgroup">
              <div class="tr head" role="row">
                <div class="th rank" role="columnheader">#</div>
                <div class="th wallet" role="columnheader">Wallet</div>
                <div class="th amount" role="columnheader">$XBID <img class="icon" src="/logo.svg" alt="xbid.ai logo" /></div>
              </div>
            </div>
            <div class="tbody" role="rowgroup">
              ${this.items.map((item, index) => html`
                <button
                  class="tr row ${item.address === this.address ? 'me' : ''}"
                  tabindex="0" role="row"  @click=${() => Utils.gotoWallet(item.address)}
                  @keydown=${(e) => (e.key === 'Enter' || e.key === ' ') && Utils.gotoWallet(item.address)} title="Open wallet">
                  <div class="td rank" role="cell">${this._medal(index)}</div>
                  <div class="td wallet" role="cell">
                    <img class="ident" src="${Utils.identicon(item.address)}" alt="identicon" />
                    <span class="mono">${Utils.truncateKey(item.address)}</span>
                  </div>
                  <div class="td amount" role="cell">
                    <span class="chip">${Utils.formatNumber(Number(item.amount || 0), true)}</span>
                  </div>
                </button>
              `)}
            </div>
          </div>
        `;
    }

    _medal(i) {
        return ['🥇', '🥈', '🥉'][i] || (i + 1);
    }

    static styles = css`
      :host {
          display: block;
          color: var(--dialog);
          font-family: var(--title-font);
          font-size: 1rem;
      }

      .wrap {
          overflow: hidden;
          background: rgba(0, 0, 0, 0.35);
      }

      .thead .tr.head {
          font-family: var(--title-font);
          display: grid;
          grid-template-columns: 56px 1fr 160px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #fff;
      }

      .tbody {
          display: block;
      }

      .tbody .tr.row {
          font-family: var(--title-font);
          display: grid;
          grid-template-columns: 56px 1fr 160px;
          padding: 10px 12px;
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: background 120ms ease, transform 80ms ease;
      }

      .tbody .tr.row.me {
          background: rgba(102, 163, 255, 0.08);
          border-left: 2px solid var(--primary);
      }

      .tbody .tr.row:hover {
          background: rgba(255, 255, 255, 0.08);
      }

      .tbody .tr.row:active {
          transform: scale(0.998);
      }

      .th,
      .td {
          display: flex;
          align-items: center;
          gap: 10px;
      }

      .rank {
          justify-content: center;
          color: var(--dialog);
      }

      .wallet .mono {
          opacity: 0.95;
      }

      .ident {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08) inset;
          flex: 0 0 20px;
      }

      .amount {
          justify-content: flex-end;
      }

      .chip {
          padding: 4px 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          font-weight: 500;
          min-width: 90px;
          text-align: right;
      }

      .empty {
          padding: 30px;
          text-align: center;
          opacity: 0.8;
      }

      .icon {
          width: 20px;
          height: 20px;
          display: inline-block;
          vertical-align: middle;
      }

      @media (max-width: 599px) {
          .thead .tr.head,
          .tbody .tr.row {
              grid-template-columns: 40px 1fr 120px;
              padding: 8px 10px;
          }

          .chip {
              min-width: 70px;
          }
      }
    `;
}

customElements.define('leaderboard-element', Leaderboard);
