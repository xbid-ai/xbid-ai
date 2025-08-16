/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';
import { Utils } from '../misc/utils';

export class Log extends LitElement {
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
          <div class="wrap" role="table" aria-label="xbid.ai Log">
            <div class="thead" role="rowgroup">
              <div class="tr head" role="row">
                <div class="th rank" role="columnheader">time</div>
                <div class="th wallet" role="columnheader">trade</div>
                <div class="th amount" role="columnheader">tx</div>
              </div>
            </div>
            <div class="tbody" role="rowgroup">
              ${this.items.map((it) => {
                const tx = this._getTx(it);
                const title = tx ? 'Open transaction on explorer' : 'No transaction available';
                return html`
                        <button
                          class="tr row" tabindex="0" role="row" @click=${() => Utils.gotoTransaction(tx)}
                          @keydown=${(e) => (e.key === 'Enter' || e.key === ' ') && Utils.gotoTransaction(tx)} title=${title}>
                          <div class="td rank" role="cell">${Utils.formatTime(it.timestamp)}</div>
                          <div class="td wallet" role="cell">
                            <span class="msg">${it.message}</span>
                          </div>
                          <div class="td amount" role="cell">
                            ${tx
                              ? html`<a class="chip link" href=${`https://stellar.expert/explorer/public/tx/${tx}`}
                                target="_blank" rel="noopener noreferrer" @click=${(e) => e.stopPropagation()}>${Utils.truncateKey(tx, 3)}</a>`
                              : html`<span class="chip disabled">No tx</span>`}
                          </div>
                        </button>
                      `;
                })}
            </div>
          </div>
      `;
    }

    _getTx(it) {
        return Array.isArray(it.transactions) && it.transactions.length ? it.transactions[0] : null;
    }

    static styles = css`
        :host {
            display: block;
            color: var(--dialog);
            font-family: var(--title-font);
            font-size: inherit;
        }

        .wrap {
            overflow: hidden;
            background: rgba(0, 0, 0, 0.35);
        }

        .thead .tr.head {
            font-family: var(--title-font);
            display: grid;
            grid-template-columns: 120px 1fr 150px;
            padding: 10px 30px;
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
            grid-template-columns: 120px 1fr 150px;
            padding: 10px 30px;
            width: 100%;
            border: 0;
            background: transparent;
            color: inherit;
            text-align: left;
            cursor: pointer;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            transition: background 120ms ease, transform 80ms ease;
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
            justify-content: flex-start;
            color: #cdd6f4;
            font-variant-numeric: tabular-nums;
        }

        .wallet .msg {
            white-space: normal;
            line-height: 1.35;
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
            color: var(--primary);
            min-width: 90px;
            text-align: center;
            text-decoration: none;
        }

        .chip.disabled {
            opacity: 0.6;
            pointer-events: none;
        }

        .empty {
            padding: 30px;
            text-align: center;
            opacity: 0.8;
        }

        @media (max-width: 599px) {
            .thead .tr.head,
            .tbody .tr.row {
                grid-template-columns: 86px 1fr 130px;
                padding: 8px 10px;
            }

            .chip {
                min-width: 50px;
            }
        }
    `;
}

customElements.define('log-element', Log);
