/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { Utils } from '../misc/utils';
import { Scene } from './scene';
import { System } from './system';

export class Canvas {
    #pointerId;
    #viewport;
    #size;
    #scene;

    constructor() {
        this.#pointerId = null;
        this.#viewport = { left: 0, top: 0, width: 0, height: 0 };
        this.#size = { x: 0, y: 0 };
    }

    get scene() {
        return this.#scene;
    }

    async initialize() {
        this.canvas = document.getElementById('canvas');

        if (System.enableOffscreen && window.OffscreenCanvas) {
            this.context = this.canvas.getContext('bitmaprenderer');
            this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
            this.offscreenContext = this.offscreenCanvas.getContext('2d');
        } else {
            // Fallback to regular canvas if OffscreenCanvas is not supported.
            this.context = this.canvas.getContext('2d');
            if (!System.enableBuffer) {
                this.offscreenCanvas = this.canvas;
                this.offscreenContext = this.context;
            } else {
                this.offscreenCanvas = document.createElement('canvas');
                this.offscreenContext = this.offscreenCanvas.getContext('2d');
            }
        }

        this.offscreenContext.imageSmoothingEnabled = true;
        this.offscreenContext.mozImageSmoothingEnabled = true;
        this.offscreenContext.webkitImageSmoothingEnabled = true;
        this.offscreenContext.msImageSmoothingEnabled = true;
        this.offscreenContext.textRendering = 'geometricPrecision';

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.canvas.addEventListener(eventName, preventDefaults, false);
        });

        this.canvas.addEventListener('wheel', this.handleScroll);
        this.canvas.addEventListener('pointerdown', this.handleStart);
        this.canvas.addEventListener('pointermove', this.handleMove);
        this.canvas.addEventListener('pointerup', this.handleEnd);
        this.canvas.addEventListener('pointercancel', this.handleEnd);
        this.canvas.addEventListener('keydown', this.handleKeydown);

        window.addEventListener('blur', () => {
            this.releaseCapture();
        });
        this.canvas.setAttribute('tabindex', '1');
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        this.#scene = new Scene(this, (size) => {
            this.#viewport = { left: 0, top: 0, width: size.x, height: size.y };
            return this.#viewport;
        });
        this.#scene.initialize();
        this.recalcLayout();
    }

    recalcLayout() {
        if (this.canvas) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.canvas.width = width * System.deviceRatio;
            this.canvas.height = height * System.deviceRatio;
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;

            if (!System.enableTransformScaling) {
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';
            } else {
                this.canvas.style.transformOrigin = '0 0';
                this.canvas.style.transform = `scale(${1 / System.deviceRatio}, ${1 / System.deviceRatio})`;
                if (!(System.enableOffscreen && window.OffscreenCanvas)) {
                    this.offscreenCanvas.style.transformOrigin = '0 0';
                    this.offscreenCanvas.style.transform = `scale(${1 / System.deviceRatio}, ${1 / System.deviceRatio})`;
                }
            }

            System.frameSize.width = width;
            System.frameSize.height = height;
            Utils.applyCameraRatio({ x: width / this.canvas.width, y: height / this.canvas.height });
            this.#size = Utils.screenToHud({ x: this.canvas.width, y: this.canvas.height }, false);
            System.scaleUnit = 100 * System.deviceRatio * (Math.min(1, Math.max(0.3, Math.max(width, height) / 700)));
        }
        this.#scene?.resize(this.#size);
    };

    updateFrame(elapsed) {
        Utils.updateCameras();
        this.#scene?.update(elapsed);
    }

    renderScene(elapsed) {
        const context = this.offscreenContext;
        if (!(System.enableOffscreen && window.OffscreenCanvas)) {
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        context.save();
        Utils.prepareContext(context); // Reset context to identity matrix.
        context.save();
        context.beginPath();
        context.rect(0, 0, this.#viewport.width, this.#viewport.height);
        context.clip();
        this.#scene.render(context, elapsed);
        context.restore();
        context.restore();
    }

    renderFrame(elapsed) {
        this.renderScene(elapsed);

        // Blit.
        if (System.enableOffscreen && window.OffscreenCanvas) {
            const bitmap = this.offscreenCanvas.transferToImageBitmap();
            this.context.transferFromImageBitmap(bitmap);
        } else if (System.enableBuffer) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.drawImage(this.offscreenCanvas,
                0, 0, this.canvas.width, this.canvas.height,
                0, 0, System.frameSize.width * System.deviceRatio, System.frameSize.height * System.deviceRatio);
        }
    }

    touchStart(coords, event) {
        const hudPoint = Utils.screenToHud(coords, true);
        this.#scene.touchStart(hudPoint, event);
    }

    touchMove(coords, event) {
        const hudPoint = Utils.screenToHud(coords, true);
        this.#scene?.touchMove(hudPoint, event);
    }

    touchEnd(coords, event) {
        const hudPoint = Utils.screenToHud(coords, true);
        this.#scene?.touchEnd(hudPoint, event);
    }

    hitTest(coords, event) {
        const hudPoint = Utils.screenToHud(coords, true);
        this.#scene?.hitTest(hudPoint, event);
    }

    scroll(coords, event) {
        const hudPoint = Utils.screenToHud(coords, true);
        this.#scene?.scroll(hudPoint, event);
    }

    handleScroll = (event) => {
        this.scroll({ x: event.clientX, y: event.clientY }, event);
    };

    handleStart = (event) => {
        const activeTouches = event.targetTouches ? event.targetTouches.length : 0;
        if (activeTouches <= 1 && (event.pointerId === 0 || event.pointerId === this.#pointerId)) {
            this.#pointerId = null;
        }
        if (!this.#pointerId && event.button <= 0) {
            this.canvas.focus();
            this.canvas.setPointerCapture(event.pointerId);
            this.#pointerId = event.pointerId;
            event.preventDefault();
            this.touchStart({ x: event.clientX, y: event.clientY }, event);
        }
    };

    handleMove = (event) => {
        this.touchMove({ x: event.clientX, y: event.clientY }, event);
        this.hitTest({ x: event.clientX, y: event.clientY }, event);
    };

    handleEnd = (event) => {
        if (event.pointerId === this.#pointerId) {
            this.touchEnd({ x: event.clientX, y: event.clientY }, event);
            event.preventDefault();
            this.#pointerId = null;
            this.releaseCapture();
        }
    };

    handleKeydown = (event) => {
        if (event.key === 'Escape') {
            this.recalcLayout();
        }
    };

    releaseCapture = () => {
        if (this.pointerId) {
            this.canvas.releasePointerCapture(this.pointerId);
            this.pointerId = null;
        }
    };
}
