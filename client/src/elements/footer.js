/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { LitElement, html, css } from 'lit';

export class Footer extends LitElement {
    render() {
        const year = new Date().getFullYear();
        return html`
          <div class="bar">
            <div class="left">
              <img class="logo" src="/logo.svg" alt="Logo" />  © ${year} xbid.ai
            </div>
            <div class="center">
              <a class="link" href="/privacy" title="Privacy" @click=${(e) => this._handleClick(e, undefined, 'privacy policy', '/privacy.txt')}>
                Privacy
              </a> | 
              <a class="link" href="/terms" title="Terms" @click=${(e) => this._handleClick(e, undefined, 'terms of use', '/terms.txt')}>
               Terms
              </a> | 
              <a class="link" href="/help" title="About xbid.ai" @click=${(e) => this._handleClick(e, 'help', 'xbid-ai --help')}>
               About
              </a>
            </div>
            <div class="right  social-links">
              <a href="https://x.com/xbid_ai" class="social-btn" target="_blank" title="Follow on X.com">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
              </a>
              <a href="https://github.com/xbid-ai" class="social-btn" target="_blank" title="Source on GitHub">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>
              <a href="https://discord.gg/ZAfxTmUube" class="social-btn" target="_blank" title="Join Discord" style="display:none;">
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
              </a>
             </div>
          </div>
        `;
    }

    _handleClick(e, page, title, file) {
        e.preventDefault();
        const dialog = document.querySelector('dialog-element');
        dialog.data = { title, page, file };
        dialog.visible = true;
    }

    static styles = css`
        :host {
            position: fixed;
            bottom: 0;
            width: calc(100vw - var(--scrollbar-width, 0px));
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 500;
        }

        .bar {
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            font-family: var(--font);
            font-size: 1rem;
            color: white;
            padding: 1rem 1rem;
            text-align: center;
            flex-direction: row;
        }

        .left,
        .center,
        .right {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .left {
            font-weight: 300;
        }

        .center {
            flex-direction: row;
            font-weight: 300;
            justify-content: center;
        }

        .logo {
            width: auto;
            height: 17px;
        }

        .right {
            color: var(--dimmed);

        }

        .link {
            font-size: 0.95rem;
            color: var(--dimmed);
            text-decoration: none;
            font-weight: 300;
            transition: color 0.2s ease, text-shadow 0.2s ease;
        }

        .link:hover {
            color: var(--primary-lite);
            text-shadow: 0 0 6px rgba(53, 193, 241, 0.3);
        }

        .link.brand {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            text-decoration: none;
            color: white;
        }

        .social-links {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-start;
        }

        .social-btn {
            background: rgba(11, 11, 14, 0.5);
            border: 1px solid #272b30;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .social-btn svg {
            fill: #fff;
        }

        .social-btn:hover {
            border-color: var(--primary);
            box-shadow: 0 0 4px rgba(53, 193, 241, 0.3);
        }

        .social-btn:hover svg {
            fill: var(--primary);
        }

        .social-btn svg {
            width: 20px;
            height: 20px;
            pointer-events: none;
        }

        @media (max-width: 599px) {
            .bar {
                flex-direction: column;
                align-items: center;
                text-align: center;
                padding: 0.7rem 0.7rem;
            }

            .left {
                order: 3;
            }

            .center {
                order: 2;
            }

            .right {
                order: 1;
            }

            .social-links {
                justify-content: center;
            }

            .right,
            .left,
            .center {
                width: 100%;
                justify-content: center;
            }
        }
    `;
}

customElements.define('footer-element', Footer);
