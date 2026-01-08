/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { repeat } from 'lit/directives/repeat.js';
import { animations } from './animations.js';
import { Utils } from '../misc/utils';
import { Wallets } from '../misc/wallets';
import barsIcon from '../assets/bars.svg?raw';
import { TransactionBuilder, Transaction, Operation, Networks, Memo } from '@stellar/stellar-sdk';

const endpoint = import.meta.env.VITE_API_ENDPOINT;
const launchTime = import.meta.env.VITE_LAUNCHTIME;
const transactionTimeout = 300 * 1000;
const maxInputLen = 280;

export class Lab extends LitElement {
    static properties = {
        _chat: { type: Object },
        _credits: { type: Object },
        _epoch: { type: Object },
        _rewards: { type: Object },
        _thread: { type: Array },
        _inputValue: { type: String },
        _thinking: { type: Boolean },
        _loader: { type: Object },
        _menuOpen: { type: Boolean },
        _now: { type: Number, state: true }
    };

    constructor() {
        super();
        this._chat = null;
        this._credits = null;
        this._epoch = null;
        this._rewards = null;
        this._thread = [];
        this._inputValue = '';
        this._thinking = false;
        this._loader = {};
        this._menuOpen = false;
        this._timeout = null;
        this._animation = null;

        this._handleClick = (e) => {
            if (this._menuOpen && !e.composedPath().some(el =>
                el.classList?.contains('menu-btn') || el.classList?.contains('menu-dropdown')
            )) {
                this._menuOpen = false;
                this.requestUpdate();
            }
        };

        this._init();
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._handleClick);
        const tick = async() => {
            const now = this._now;
            if (this._epoch) {
                if (this._epoch.expire - now <= 0) {
                    await this._init(this._epoch.id);
                    await Utils.sleep(7000);
                }
            }

            const rewards = JSON.parse(localStorage.getItem('lab-rewards') || '{}');
            if (rewards.xdr && rewards.timestamp + transactionTimeout < now) {
                localStorage.removeItem('lab-rewards');
                await this._init();
            }
            this._timeout = setTimeout(tick, 1000);
        };
        tick();

        const update = () => {
            this._now = Date.now();
            this._animation = requestAnimationFrame(update);
        };
        update();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._handleClick);
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
        cancelAnimationFrame(this._animation);
    }

    updated(changed) {
        super.updated(changed);
        if (changed.has('_inputValue') || changed.has('_thinking')) {
            this._resize();
        }
    }

    render() {
        const timecls = () => {
            const diff = this._epoch?.expire - this._now;
            if (!this._epoch?.expire || diff <= 0) {
                return 'time-expired';
            } else if (diff <= 1 * 60 * 1000) {
                return 'time-warning';
            } else if (diff <= 2 * 60 * 1000) {
                return 'time-caution';
            }
            return '';
        };

        const formatTime = () => {
            const diff = this._epoch?.expire - this._now;
            if (!this._epoch?.expire || diff <= 0) {
                return '--:--:--';
            }
            return `${String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0')}:${String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')}:${String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0')}`;
        };

        const formatPool = () => {
            if (!this._epoch?.rewards) {
                return '';
            } else if (this._epoch.expire - this._now <= 0) {
                return 'Distributing rewards...';
            }
            return `Reward pool: ${(this._epoch.rewards * (this._progress() / 100)).toFixed(2)} XBID`;
        };

        const formatCountdown = () => {
            const remaining = launchTime - this._now;
            if (remaining <= 0) {
                return null;
            }
            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            return { days, hours, minutes, seconds };
        };

        const isLocked = this._now < launchTime;
        const countdown = isLocked ? formatCountdown() : null;

        const wallet = this._wallet();
        const progress = this._progress();
        const timeClass = timecls();
        const noCredits = this._credits?.current >= this._credits?.max;
        const locked = (wallet && !this._chat) || this._loader.enabled;
        const disabled = this._thinking || noCredits || timeClass === 'time-expired';

        return html`
            <section class="wrap">
                <div class="sub">
                    <div class="icon" aria-hidden="true">
                        ${unsafeSVG(barsIcon)}
                    </div>
                    <div class="stats">
                        ${wallet
                        ? html`
                            <div class="stat-item wallet-stat">
                                <span class="stat-label">Wallet</span>
                                <div class="wallet-value">
                                    <img class="wallet-ident" src="${Utils.identicon(wallet)}" alt="wallet" />
                                    <span>${Utils.truncateKey(wallet, 4)}</span>
                                </div>
                            </div>
                        `
                        : ''}
                        <div class="stat-item hidden">
                            <span class="stat-label">Credits</span>
                            <span class="stat-value">${Math.max(0, (this._credits?.max || 5) - (this._credits?.current || 0))}</span>
                        </div>
                        <div class="stat-item small ${wallet ? 'hidden' : ''}">
                            Live Experiments
                        </div>
                    </div>
                    <button class="menu-btn" @click=${this._toggleMenu}>⋮</button>
                    ${this._menuOpen
                    ? html`
                        <div class="menu-dropdown">
                            ${wallet
                            ? html`<button class="menu-item" @click=${this._disconnect}>Disconnect</button>`
                            : (!isLocked ? html`<button class="menu-item" @click=${this._connect}>Connect Wallet</button>` : '')}
                            <button class="menu-item" @click=${() => { window.open('https://blog.xbid.ai/posts/xbid-ai-lab-build-better-inference/', '_blank'); this._menuOpen = false; }}>Learn More</button>
                        </div>
                    `
                    : ''}
                    <div class="epoch-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" 
                                style="width: ${!progress ? 0 : Math.max(10, progress)}%">
                            </div>
                        </div>
                        <div class="progress-info">
                            <span class="progress-pool">${formatPool()}</span>
                            <span class="progress-time ${timeClass}">${formatTime()}</span>
                        </div>
                    </div>
                </div>
                <div class="body">
                    ${locked
                      ? html`
                       <div class="loader-wrapper">
                            <div class="loader flip-square"></div>
                            <p class="loader-text">${this._loader.message || 'Please wait...'}</p>
                        </div>`
                      : html``
                    }
                    ${!wallet && !this._loader.enabled
                      ? html`
                        <div class="lab-section">
                            <p>
                               Interact with xbid.ai through focused experiments and earn onchain rewards while you're at it — free to participate, no deposits.
                            </p>
                            ${!isLocked
                                ? html`
                                    <button class="lab-btn" @click=${this._connect}>
                                    Connect Wallet
                                    </button>
                                    `
                                : html`
                                    <div class="countdown-box">
                                        <div class="countdown-title">Launch in</div>
                                        <div class="countdown-timer">
                                            <span class="countdown-segment">${countdown.days}d</span>
                                            <span class="countdown-segment">${String(countdown.hours).padStart(2, '0')}h</span>
                                            <span class="countdown-segment">${String(countdown.minutes).padStart(2, '0')}m</span>
                                            <span class="countdown-segment">${String(countdown.seconds).padStart(2, '0')}s</span>
                                        </div>
                                    </div>
                                    `
                            }
                            <p>
                                Curious how it works? <a href="https://blog.xbid.ai/posts/xbid-ai-lab-build-better-inference/" target="_blank">Read more</a> about how the lab captures reasoning patterns, constraints, and context for better inference.
                            </p>
                            <p class="warning">
                              Authentication requires signing a zero-fee Stellar transaction to prove wallet ownership. No funds are moved. Connecting means you agree to our <a href="https://xbid.ai/terms" target="_blank">terms</a>.
                          </p>
                        </div>
                      `
                      : !locked && !this._rewards
                        ? html`
                        <div class="chat-surface">
                            <div class="start-sentinel"></div>
                            <div class="messages">
                                ${repeat(this._thread, id => id, id => this._renderMessage(id, wallet))}
                                ${this._thinking
                                  ? html`
                                  <div class="message-wrapper">
                                      <div class="message assistant thinking">
                                          <div class="message-body">
                                              <div class="loader flip-square"></div>
                                          </div>
                                      </div>
                                  </div>
                                  `
                                  : ''}
                            </div>
                            <div class="input-box ${noCredits ? 'hidden' : ''}">
                                <textarea
                                    .value=${this._inputValue}
                                    @input=${this._onInput}
                                    @keydown=${e => e.key === 'Enter' && !e.shiftKey && this._submit()}
                                    placeholder=${noCredits || timeClass === 'time-expired'
                                      ? 'Session complete'
                                      : 'Reply...'}
                                    ?disabled=${disabled}
                                    rows="1"
                                    maxlength=${maxInputLen}>
                                </textarea>
                                ${this._inputValue?.length > 0
                                  ? html`
                                    <div class="char-counter ${(this._inputValue?.length > maxInputLen) ? 'over-limit' : ''}">${this._inputValue.length || 0} / ${maxInputLen}</div>
                                `
                                : ''}
                            </div>
                            <div class="blur-overlay ${noCredits ? 'hidden' : ''}"></div>
                            <div class="end-sentinel"></div>
                        </div>
                    `
                    : !locked && this._rewards
                        ? html`
                        <div class="lab-section">
                            ${this._rewards?.xdr
                                ? html`
                                    <p class="claim-timer">
                                        Claim your rewards within <span class="timer-value">${
                                        Math.max(
                                            0,
                                            this._rewards.timestamp + transactionTimeout - this._now
                                        ) <= 0
                                            ? 'Expired'
                                            : `${String(Math.floor((this._rewards.timestamp + transactionTimeout - this._now) / 60000)).padStart(2, '0')}:${String(Math.floor(((this._rewards.timestamp + transactionTimeout - this._now) % 60000) / 1000)).padStart(2, '0')}`
                                        }</span>
                                    </p>
                                    `
                                : html`
                                <p class="claim-timer">
                                    Claim within <span class="timer-value">${
                                        (() => {
                                            const claimWindow = 24 * 60 * 60 * 1000; // 24 hours
                                            const remaining = Math.max(0, this._rewards.timestamp + claimWindow - this._now);
                                            if (remaining <= 0) return 'Expired';
                                            const hours = Math.floor(remaining / (60 * 60 * 1000));
                                            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                                            return `${hours}h ${minutes}m`;
                                        })()
                                    }</span>
                                </p>`
                            }
                            <div class="xbid-amount">
                                <img
                                    class="xbid-icon"
                                    src="/logo.svg"
                                    alt="xbid.ai logo"
                                />
                                <span class="xbid-value">
                                    ${Utils.formatBalance(this._rewards.amount)} XBID
                                </span>
                            </div>
                            <div class="claim-actions">
                                <button class="lab-btn rewards" @click=${this._claim}>
                                    Claim Rewards
                                </button>

                                <button class="vip-btn" @click=${this._vipInfo}>
                                    <div class="vip-title">VIP Access</div>
                                    <div class="vip-sub">Coming soon</div>
                                </button>
                            </div>
                            <p class="warning">
                                Claiming rewards requires an onchain transaction initiated by your wallet.<br/>
                                Stellar network fees apply. By claiming, you agree to our <a href="https://xbid.ai/terms" target="_blank">terms</a>.
                            </p>
                        </div>`
                        : ''}
                </div>
            </section>
        `;
    }

    async _init(epochId) {
        try {
            this._inputValue = '';
            this.updateComplete.then(() => this.style.setProperty('--composer-height', '60px'));
            this._chat = null;

            const wallet = this._wallet();
            if (!wallet) {
                const res = await Utils.fetch(`${endpoint}/lab/epoch`);
                if (res.status === 'ok') {
                    this._epoch = res.epoch;
                }
                return;
            }

            const auth = localStorage.getItem('lab-auth');
            const res = await fetch(`${endpoint}/lab/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(auth ? { Authorization: `Bearer ${auth}` } : {})
                }
            });

            const data = await res.json();
            if (data.status === 'ok') {
                if (epochId && data.epoch.id === epochId) {
                    return;
                }

                this._chat = data.chat;
                this._credits = data.credits;
                this._epoch = data.epoch;
                this._rewards = data.rewards || null;

                if (!data.rewards) {
                    const rewards = JSON.parse(localStorage.getItem('lab-rewards') || '{}');
                    if (rewards.xdr && rewards.timestamp + transactionTimeout > this._now) {
                        this._rewards = rewards;
                    }
                }
                localStorage.setItem('lab-epoch-id', data.epoch.id);
                this._rebuild();
            } else {
                throw new Error('failed to connect');
            }
        } catch (err) {
            console.error(err);
            this._disconnect();
        } finally {
            this._scrollToEnd();
        }
    }

    async _end() {
        try {
            const auth = localStorage.getItem('lab-auth');
            const res = await fetch(`${endpoint}/lab/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(auth ? { Authorization: `Bearer ${auth}` } : {})
                }
            });
            const data = await res.json();
            if (data.status === 'ok') {
                Utils.showSuccess('Experiment completed');
            }
        } catch (err) {
            console.error(err);
        }
    }

    async _connect() {
        try {
            this._menuOpen = false;
            const result = await Wallets.requestSignature(async(address) => {
                const res = await fetch(`${endpoint}/lab/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet: address
                    })
                });
                const data = await res.json();
                if (data.status === 'ok') {
                    const memo = Memo.text(data.identifier);
                    const now = Math.floor(this._now / 1000);
                    const transaction = new TransactionBuilder(await Wallets.horizonClient.loadAccount(address), {
                        memo,
                        fee: 0,
                        networkPassphrase: Networks.PUBLIC,
                        timebounds: { minTime: now - 60, maxTime: now }
                    }).addOperation(
                        Operation.bumpSequence({
                            bumpTo: '0'
                        })).build();
                    return transaction.toXDR();
                }
            });

            if (result?.xdr) {
                localStorage.setItem('lab-auth', result.xdr);
                this._init();
                Utils.showSuccess('Wallet connected');
            }
        } catch (err) {
            console.error(err);
        }
    }

    _disconnect() {
        this._menuOpen = false;
        localStorage.removeItem('lab-wallet');
        localStorage.removeItem('lab-auth');
        localStorage.removeItem('lab-epoch-id');
        this._chat = null;
        this._credits = null;
        this._rewards = null;
        this._thread = [];
    }

    _rebuild() {
        if (!this._chat?.messages?.length) {
            return;
        }

        const buildThread = (id) => {
            const thread = [];
            let msg = this._chat.messages.find(m => m.id === id);
            while (msg) {
                thread.unshift(msg.id);
                msg = this._chat.messages.find(m => m.id === msg.parentId);
            }
            return thread;
        };

        this._thread = buildThread(this._chat.messages.reduce((a, b) =>
            b.timestamp > a.timestamp ? b : a
        ).id);

        if (this._credits?.current >= this._credits?.max) {
            const exist = this._thread.some(id => {
                const msg = this._chat.messages.find(m => m.id === id);
                return msg?.role === 'system';
            });

            if (!exist) {
                const id = `system-end-${this._now}`;
                this._chat.messages = [...this._chat.messages, {
                    id,
                    role: 'system',
                    content: 'Nice work — you\'re in the pool!<br/><br/>Your pool share is based on the reasoning depth you contributed and how it stacks up against other participants. <a href="https://blog.xbid.ai/posts/xbid-ai-lab-build-better-inference/" target="_blank">Read more</a> about how the lab captures reasoning patterns.<br/><br/>Rewards are claimable when this experiment ends.',
                    parentId: this._thread[this._thread.length - 1] || null,
                    timestamp: this._now
                }];
                this._thread = [...this._thread, id];
            }
        }
    }

    _wallet() {
        try {
            return new Transaction(localStorage.getItem('lab-auth'), Networks.PUBLIC).source;
        } catch {
            return null;
        }
    }

    _progress() {
        if (!this._epoch?.expire) {
            return 0;
        }
        const remaining = this._epoch.expire - this._now;
        const total = this._epoch.duration || 3600000;
        if (remaining <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
    }

    _scrollToEnd() {
        this.updateComplete.then(() => {
            const sentinel = this.renderRoot.querySelector('.end-sentinel');
            sentinel?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    _renderMessage(id, wallet) {
        const msg = this._chat.messages.find(m => m.id === id);
        if (!msg) {
            return '';
        }
        const first = this._thread.length === 1 && msg.id === this._thread[0];
        return html`
            <div class="message-wrapper">
                ${msg.role === 'user'
                ? html`
                    <img class="ident" src="${Utils.identicon(wallet)}" alt="user identicon" />
                `
                : ''}
                <div class="message ${msg.role} ${first ? 'hero' : ''}">
                    <div class="message-header">
                        <span class="author">${msg.role === 'assistant' ? (first ? 'Go deep, quality counts' : 'xbid.ai') : msg.role === 'user' ? Utils.truncateKey(wallet, 4) : msg.role}</span>
                    </div>
                    <div class="message-body">${msg.role === 'system' ? unsafeHTML(msg.content) : msg.content}</div>
                </div>
            </div>
        `;
    }

    async _submit() {
        const text = this._inputValue.trim();
        if (!text || this._thinking || text.length > maxInputLen) {
            return;
        }

        const user = `temp-${this._now}`;
        const parent = this._thread[this._thread.length - 1] || null;
        const message = { id: user, role: 'user', content: text, parentId: parent, timestamp: this._now };

        this._thinking = true;
        this._inputValue = '';
        this.updateComplete.then(() => this._resize());
        this._chat.messages = [...this._chat.messages, message];
        this._thread = [...this._thread, user];

        this._rebuild();
        this.requestUpdate();
        this.updateComplete.then(() => this._scrollToEnd());

        try {
            const check = await Utils.fetch(`${endpoint}/lab/epoch`);
            if (check.status === 'ok' && check.epoch?.id !== localStorage.getItem('lab-epoch-id')) {
                this._init();
                throw new Error('Invalid epoch');
            }

            const auth = localStorage.getItem('lab-auth');
            const res = await fetch(`${endpoint}/lab/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(auth ? { Authorization: `Bearer ${auth}` } : {})
                },
                body: JSON.stringify({
                    msg: { text }
                })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                this._chat = data.chat;
                this._credits = data.credits;
                this._epoch = data.epoch;
                this._rewards = data.rewards || null;
                localStorage.setItem('lab-epoch-id', data.epoch.id);
                this._rebuild();
                this.updateComplete.then(async() => {
                    this._scrollToEnd();
                    if (data.credits.current >= data.credits.max) {
                        await this._end();
                    }
                });
            } else {
                throw new Error('failed to connect');
            }
        } catch (err) {
            console.error(err);
            this._disconnect();
        } finally {
            this._thinking = false;
            this.updateComplete.then(() => {
                this._scrollToEnd();
                this.renderRoot.querySelector('textarea')?.focus();
            });
        }
    }

    async _claim() {
        try {
            this._loader = { enabled: true, message: 'Claiming rewards...' };
            const auth = localStorage.getItem('lab-auth');
            if (!auth) {
                return;
            }

            const rewards = JSON.parse(localStorage.getItem('lab-rewards') || '{}');
            if (!rewards.xdr || rewards.timestamp + transactionTimeout < this._now) {
                const res = await fetch(`${endpoint}/lab/claim`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(auth ? { Authorization: `Bearer ${auth}` } : {})
                    }
                });
                const data = await res.json();
                if (data.status === 'ok' && data.xdr) {
                    rewards.xdr = data.xdr;
                    localStorage.setItem('lab-rewards',
                        JSON.stringify({ amount: this._rewards.amount, timestamp: this._now, xdr: rewards.xdr }));
                }
            }

            if (rewards.xdr) {
                const result = await Wallets.requestSignature(() => rewards.xdr);
                if (result?.xdr) {
                    this._loader = { enabled: true, message: 'Submitting transaction...' };
                    await Wallets.submitTransaction(result.xdr);
                    localStorage.removeItem('lab-rewards');
                    Utils.showSuccess('Transaction successful');
                }
            }
        } catch (err) {
            console.error(err);
            Utils.showError('Claim failed');
        } finally {
            this._loader = {};
            await this._init();
        }
    }

    _vipInfo() {
        Utils.showCustom(
            'Coming soon: Unlock advanced lab features and reward track.\nAvailable after the Genesis phase.',
            6000,
            true,
            'info'
        );
    }

    _onInput(e) {
        this._inputValue = e.target.value;
        this.updateComplete.then(() => this._resize());
    }

    _resize() {
        const input = this.renderRoot?.querySelector('textarea');
        if (!input) {
            return;
        }
        this.style.setProperty('--composer-height', '1px');
        this.updateComplete.then(() => {
            const maxHeight = parseFloat(getComputedStyle(input).maxHeight) || 160;
            input.style.overflowY = (input.scrollHeight > maxHeight) ? 'auto' : 'hidden';
            this.style.setProperty('--composer-height', `${Math.max(Math.min(input.scrollHeight, maxHeight), 60)}px`);
        });
    }

    _toggleMenu(e) {
        e.stopPropagation();
        this._menuOpen = !this._menuOpen;
        this.requestUpdate();
    }

    static get styles() {
        return [
            animations,
            css`
            :host {
                display: block;
                color: #ffffff;
                font-family: var(--font);
                font-size: 1.1rem;
                font-weight: 300;
                line-height: 1.5;
                --composer-height: 60px;
                --composer-offset: 30px;
                --composer-safe: calc(var(--composer-height) + var(--composer-offset) + 0.2rem);
            }

            .wrap {
                padding: 0;
            }

            .body {
                margin: 16px 20px 20px;
            }

            .sub {
                position: sticky;
                top: 0;
                z-index: 70;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 0;
                margin-top: 0;
                margin-bottom: 20px;
                padding: 10px;
                background: #0a0c147f;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }

            .icon {
                display: grid;
                place-items: center;
                width: 50px;
                height: 50px;
                opacity: 0.9;
            }

            .icon svg {
                width: 50px;
                height: 50px;
                color: var(--success);
                stroke: var(--success);
            }

            .stats {
                display: flex;
                flex: 1;
                font-family: var(--terminal-font);
            }

            .stat-item {
                display: flex;
                flex-direction: column;
                padding: 0 20px;
                text-align: center;
                border-right: 1px solid rgba(255, 255, 255, 0.1);
            }

            .stat-item.small {
                font-size: 0.9rem;
                opacity: 0.9;
                border-right: none;
            }

            .stat-label {
                font-size: 0.7rem;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                opacity: 0.5;
            }

            .stat-value {
                font-size: 1.1rem;
                font-weight: 600;
                font-family: var(--terminal-font);
                color: var(--primary);
                letter-spacing: 0.02em;
            }

            .wallet-stat {
                display: flex;
            }

            .wallet-value {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.9rem;
                font-family: var(--terminal-font);
                color: var(--primary-lite);
            }

            .wallet-ident {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
            }

            .menu-btn {
                flex-shrink: 0;
                padding: 5px 10px;
                font-size: 1.6rem;
                color: #fff;
                background: none;
                border: none;
                opacity: 0.8;
                cursor: pointer;
                transition: opacity 0.3s ease;
            }

            .menu-btn:hover {
                opacity: 1;
            }

            .menu-dropdown {
                position: absolute;
                top: 60px;
                right: 10px;
                z-index: 75;
                min-width: 150px;
                background: #1a1d2e;
                border: 1px solid #23263a;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                overflow: hidden;
            }

            .menu-item {
                display: block;
                width: 100%;
                padding: 12px 16px;
                font-size: 0.95rem;
                font-family: var(--font);
                color: #fff;
                text-align: left;
                text-decoration: none;
                background: none;
                border: none;
                cursor: pointer;
                transition: background 0.2s ease;
            }

            .menu-item:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .menu-item + .menu-item {
                border-top: 1px solid #23263a;
            }

            .epoch-progress {
                width: 100%;
                padding: 10px 0 0;
            }

            .progress-bar {
                height: 8px;
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 1s linear;
                background: linear-gradient(90deg, var(--success), var(--primary));
            }

            .progress-info {
                display: flex;
                justify-content: space-between;
                font-size: 0.85rem;
                font-family: var(--terminal-font);
            }

            .progress-pool {
                font-weight: 600;
                color: var(--primary);
            }

            .progress-time {
                color: #fff;
            }

            .time-caution {
                color: var(--warning) !important;
            }

            .time-warning {
                color: var(--error) !important;
                animation: pulse 1s infinite;
            }

            .time-expired {
                color: #888 !important;
            }

            .chat-surface {
                display: flex;
                flex-direction: column;
                max-width: 100%;
                min-height: calc(100vh - 620px);
                margin: 0 auto;
                justify-content: center;
                transition: justify-content 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .start-sentinel {
                height: 0;
                flex-shrink: 0;
            }

            .end-sentinel {
                height: 0;
                flex-shrink: 0;
                scroll-margin-bottom: var(--composer-safe);
            }

            .messages {
                position: relative;
                flex: 0 1 auto;
            }

            .message-wrapper {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                margin-bottom: 1rem;
            }

            .ident {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                margin-top: 10px;
                margin-left: 30px;
                border-radius: 50%;
                box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08) inset;
            }

            .message {
                flex: 1;
                margin-right: 10px;
                margin-bottom: 0;
                margin-left: 10px;
                padding: 1rem 1.2rem;
                background: #151720;
                border: 1px solid #23263a;
                border-radius: 12px;
                transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .message.user {
                margin-left: 0;
            }

            .message.assistant {
                margin-right: 50px;
                background: #6e759413;
                border: none;
                animation: fadeSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .message.assistant .author {
                color: var(--primary);
            }

            .message.user .author {
                color: var(--primary);
                opacity: 0.4;
            }

            .message.system {
                margin-top: 15px;
                background: rgba(77, 212, 255, 0.08);
                border: 1px solid #1a2d3d;
                transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .message.system .message-header {
                display: none;
            }

            .message.system .message-body {
                color: var(--primary);
                text-align: center;
            }

            .message.system a {
                text-decoration: underline;
            }

            .message.thinking {
                padding: 0.5rem;
                background: transparent;
                border: none;
            }

            .message.thinking .message-body {
                display: flex;
                justify-content: flex-start;
                padding-left: 1rem;
            }

            .message.thinking .loader {
                margin: 0;
            }

            .message.thinking .flip-square:before {
                width: 20px;
                height: 20px;
            }

            .message.hero {
                max-width: 600px;
                margin: 0 auto;
                padding: 2rem;
                font-size: 1.5rem;
                text-align: center;
                background: transparent;
                border: none;
                transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                animation: fadeSlideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .message.hero .message-header {
                justify-content: center;
                margin-bottom: 1rem;
                font-size: 1rem;
            }

            .message.hero .message-body {
                font-size: 1.5rem;
                line-height: 1.6;
            }

            .message-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.4rem;
                font-size: 0.75rem;
            }

            .message-body {
                font-size: 1rem;
                line-height: 1.5;
                white-space: pre-wrap;
                word-wrap: break-word;
                word-break: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
            }

            .input-box {
                position: sticky;
                bottom: var(--composer-offset);
                z-index: 10;
                margin-top: 20px;
                margin-right: 10px;
                margin-left: 10px;
                background: transparent;
            }

            .input-box::before {
                position: absolute;
                bottom: calc(100% - 10px);
                left: 0;
                right: 0;
                z-index: -1;
                height: 30px;
                background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.5));
                content: '';
                pointer-events: none;
            }

            .char-counter {
                position: absolute;
                right: 22px;
                bottom: 8px;
                z-index: 1;
                font-size: 0.75rem;
                font-family: var(--terminal-font);
                color: rgba(255, 255, 255, 0.5);
                pointer-events: none;
            }

            .char-counter.over-limit {
                font-weight: 600;
                color: var(--error);
            }

            .blur-overlay {
                position: fixed;
                right: 20px;
                bottom: 0;
                left: 20px;
                z-index: 9;
                height: calc(var(--composer-safe) - 2px);
                background: 
                    linear-gradient(to top, transparent, rgba(0, 0, 0, 0.5)),
                    linear-gradient(to right, rgba(0, 0, 0, 0.9) 0%, transparent 35%, transparent 65%, rgba(0, 0, 0, 0.6) 100%);
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                pointer-events: none;
            }

            textarea {
                width: 100%;
                min-height: var(--composer-height);
                max-height: 160px;
                padding: 1.2rem 1.2rem 1.2rem 1.2rem;
                font-size: 1rem;
                font-family: var(--font);
                line-height: 1.4;
                color: #fff;
                background: #1a1d2e;
                border: 1px solid #57778f;
                border-radius: 12px;
                box-sizing: border-box;
                resize: none;
                overflow-y: hidden;
                transition: height 0.4s ease-out;
            }

            textarea:focus {
                background: #1f2337;
                border-color: var(--primary);
                box-shadow: 
                    0 4px 12px rgba(77, 163, 255, 0.25), 
                    0 0 0 3px rgba(77, 163, 255, 0.15);
                outline: none;
            }

            textarea:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .lab-section {
                max-width: 600px;
                margin: 60px auto;
                text-align: center;
            }

            .lab-btn {
                margin-top: 20px;
                margin-bottom: 20px;
                padding: 15px 25px;
                font-size: 1rem;
                font-weight: 500;
                font-family: var(--font);
                color: #fff;
                background: var(--primary-dark);
                border: none;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .lab-btn.rewards{
                height: 56px;
            }

            .lab-btn:hover {
                background: var(--primary);
                box-shadow: 0 4px 12px rgba(77, 212, 255, 0.3);
                transform: translateY(-2px);
            }

            .lab-btn:active {
                transform: translateY(0);
            }

            .xbid-amount {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin: 20px 0;
                font-size: 1.4rem;
                font-weight: 600;
                font-family: var(--terminal-font);
                color: var(--primary);
            }

            .xbid-icon {
                width: 26px;
                height: 26px;
            }

            .xbid-value {
                letter-spacing: 0.02em;
            }

            .warning {
                max-width: 42rem;
                margin: 40px auto;
                padding: 10px 12px;
                font-size: 0.95rem;
                line-height: 1.45;
                color: var(--warning);
                text-align: center;
                background: linear-gradient(180deg, rgba(255, 224, 138, 0.06), rgba(255, 224, 138, 0.03));
                border: 1px solid rgba(255, 224, 138, 0.35);
                border-radius: 10px;
            }

            .loader-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 20px;
                min-height: 300px;
            }

            .loader-text {
                margin: 0;
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.7);
            }

            .loader {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .flip-square:before {
                display: block;
                width: 30px;
                height: 30px;
                background-color: rgba(255, 255, 255, 0.9);
                content: '';
                animation: flip-square 1.5s infinite;
            }

            .hidden {
                display: none;
            }

            a {
                color: var(--primary);
                text-decoration: none;
                transition: color 0.2s ease;
            }

            a:hover {
                color: var(--primary-lite);
                text-decoration: underline;
            }

            .claim-timer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 1rem;
                font-family: var(--terminal-font);
                color: var(--dialog);
            }

            .timer-value {
                font-weight: 600;
                color: var(--error);
            }

            .claim-actions {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 16px;
                margin-top: 20px;
            }

            .vip-btn {
                height: 56px;
                min-width: 120px;
                padding: 6px 10px;
                font-size: 0.95rem;
                font-family: var(--terminal-font);
                color: rgba(210, 200, 255, 0.95);

                background: linear-gradient(
                    180deg,
                    rgba(122, 92, 255, 0.18),
                    rgba(122, 92, 255, 0.06)
                );

                border: 1px solid rgba(122, 92, 255, 0.45);
                border-radius: 12px;

                cursor: pointer;
                opacity: 0.8;

                transition: all 0.25s ease;
            }

            .vip-btn:hover {
                opacity: 1;
                box-shadow:
                    0 0 14px rgba(122, 92, 255, 0.45),
                    inset 0 0 8px rgba(122, 92, 255, 0.15);
                transform: translateY(-1px);
            }

            .vip-btn:active {
                transform: translateY(0);
                box-shadow:
                    0 0 8px rgba(122, 92, 255, 0.35);
            }

            .vip-title {
                font-size: 0.9rem;
                font-weight: 600;
                line-height: 1.1;
            }

            .vip-sub {
                font-size: 0.8rem;
                opacity: 0.65;
                line-height: 1.1;
                margin-top: 5px;
            }

            .countdown-box {
                margin: 30px auto;
                padding: 20px;
                border-radius: 12px;
            }

            .countdown-title {
                margin-bottom: 12px;
                font-size: 0.95rem;
                font-weight: 600;
                font-family: var(--terminal-font);
                color: var(--primary);
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }

            .countdown-timer {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 1.5rem;
                font-weight: 700;
                font-family: var(--terminal-font);
                color: #fff;
            }

            .countdown-segment {
                min-width: 50px;
                padding: 10px 8px;
                background: linear-gradient(135deg, rgba(77, 212, 255, 0.1), rgba(77, 163, 255, 0.05));
                border: 1px solid rgba(77, 212, 255, 0.3);
                box-shadow: 0 8px 24px rgba(77, 212, 255, 0.2);
                border-radius: 6px;
            }

            @media (max-width: 480px) {
                .countdown-timer {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    max-width: 200px;
                    margin: 0 auto;
                }
            }

            @media (min-width: 360px) {
                .wallet-stat {
                    display: flex;
                }
            }
        `];
    }
}

customElements.define('lab-element', Lab);
