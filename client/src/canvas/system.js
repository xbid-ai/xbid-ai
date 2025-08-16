/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

// Scaling font when rendering can improve legibility on some systems (especially mobile).
// The context normalizes the font size using context scaling while the font is scaled up during rendering.
const RENDER_FONT_SCALING = 10;

export class System {
    static #renderingQuality = 1;
    static #mobileDisplay = !!window.Android || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    static #enableOffscreen = true;
    static #enableBuffer = true;
    static #enableTransformScaling = true;
    static #OS = {};
    static #isLandscape = false;
    static #screenRatio = 1;
    static #scaleUnit = 1;
    static #scrollbarWidth = 0;
    static renderFontScaling = RENDER_FONT_SCALING;
    static frameSize = { width: 0, height: 0 };

    static get enableOffscreen() {
        return System.#enableOffscreen;
    }

    static get enableBuffer() {
        return System.#enableBuffer;
    }

    static get enableTransformScaling() {
        return System.#enableTransformScaling && !System.isIpad;
    }

    static get isIpad() {
        if (!System.#OS.iPad) {
            System.#OS.iPad = { value: false };
            if (navigator.userAgent.match(/iPad/i) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
                System.#OS.iPad.value = true;
            }
        }
        return System.#OS.iPad.value;
    }

    static get isIPhone() {
        if (!System.#OS.iPhone) {
            System.#OS.iPhone = { value: false };
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            if (/iPhone/.test(userAgent) && !window.MSStream) {
                System.#OS.iPhone.value = true;
            }
        }
        return System.#OS.iPhone.value;
    }

    static get isMobileFirefox() {
        if (!System.#OS.mobileFirefox) {
            System.#OS.mobileFirefox = { value: false };
            if (/Android.*Firefox\/\d+\.\d+/i.test(navigator.userAgent) || /Mobile.*Firefox\/\d+\.\d+/i.test(navigator.userAgent)) {
                System.#OS.mobileFirefox.value = true;
            }
        }
        return System.#OS.mobileFirefox.value;
    }

    static get isMobileDisplay() {
        return System.#mobileDisplay;
    }

    static resize() {
        System.#screenRatio = window.innerWidth / window.innerHeight;
        System.#isLandscape = System.#screenRatio > 1;

        if (!System.#scrollbarWidth) {
            const div = document.createElement('div');
            div.style.visibility = 'hidden';
            div.style.overflow = 'scroll';
            div.style.width = '100px';
            div.style.height = '100px';
            document.body.appendChild(div);
            System.#scrollbarWidth = div.offsetWidth - div.clientWidth;
            document.body.removeChild(div);
        }
        document.documentElement.style.setProperty('--scrollbar-width',
            document.body.scrollHeight > document.body.clientHeight ? `${System.#scrollbarWidth}px` : '0px');
    }

    static get isLandscape() {
        return System.#isLandscape;
    }

    static get deviceRatio() {
        return Math.min(System.isMobileFirefox ? 1 : 3.75, Math.max(0.1, window.devicePixelRatio * Math.min(1, System.#renderingQuality))
            * (System.isIPhone ? 0.9 : System.isIpad ? 0.75 : 1));
    }

    static set scaleUnit(val) {
        this.#scaleUnit = val;
    }

    static get scaleUnit() {
        return this.#scaleUnit;
    }

    static getUnit(viewport) {
        const breakPoint = () => {
            const ratio = viewport.height / viewport.width;
            return System.isLandscape && Math.abs(1 - ratio) > 0.35;
        };
        return System.deviceRatio * (breakPoint(viewport)
            ? Math.min(viewport.height, viewport.width) / System.scaleUnit
            : Math.max(viewport.height, viewport.width) * 9 / 16 / System.scaleUnit);
    }
}

Object.freeze(System);
