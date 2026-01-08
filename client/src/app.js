/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import './misc/polyfills.js';
import { System } from './canvas/system';
import { Utils } from './misc/utils';
import { Canvas } from './canvas/canvas';
import './elements/header';
import './elements/footer';
import './elements/dialog';
import './elements/message';
import './elements/body';

class App {
    #canvas;

    constructor() {
        this.#canvas = new Canvas();
    }

    async initialize() {
        await this.#canvas.initialize();
        this.resize();
        return this;
    }

    run() {
        const loop = (timestamp) => {
            window.requestAnimationFrame(loop);
            const elapsed = Math.min(timestamp - (Utils.currentTime), 1 / 20 * 1000) / 1000;
            Utils.currentTime = timestamp;
            this.#canvas.updateFrame(elapsed);
            this.#canvas.renderFrame(elapsed);
        };
        window.requestAnimationFrame(loop);
        return this;
    }

    resize() {
        System.resize();
        this.#canvas.recalcLayout();
    }
}

(async function(namespace) {
    let resizeTimeout;
    namespace.window = { isResizing: false };
    namespace.App = new App();
    window.addEventListener('resize', (event) => {
        clearTimeout(resizeTimeout);
        namespace.window.isResizing = true;
        resizeTimeout = setTimeout(() => {
            namespace.window.isResizing = false;
        }, 100);
        namespace.App.resize(event);
    });
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
    (await namespace.App.initialize()).run();
})(window.xbidApp = window.xbidApp || {});
