/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { System } from './system';
import { Utils } from '../misc/utils';

export class Scene {
    #canvas;
    #onRecalcLayout;
    #viewport;

    constructor(canvas, onRecalcLayout) {
        this.#canvas = canvas;
        this.#onRecalcLayout = onRecalcLayout;
        this.#viewport = { left: 0, top: 0, width: 0, height: 0 };
    }

    initialize() {
    }

    resize(size) {
        this.#viewport = Object.assign({}, this.#onRecalcLayout(size));
    }

    update(elapsed) {
    }

    render(context, elapsed) {
    }

    getRect() {
        const unit = System.getUnit(this.#viewport) / System.deviceRatio;
        return Utils.deflateRect(this.#viewport, unit, unit);
    }

    touchStart(hudPoint, event) {
        if (Utils.isPointInRect(hudPoint, this.getRect())) {
            return true;
        }
    }

    touchMove(hudPoint, event) {
    }

    touchEnd(hudPoint, event) {
    }

    scroll(hudPoint, event) {
    }

    hitTest(hudPoint, event) {
    }

    get canvas() {
        return this.#canvas;
    }
}

Object.freeze(Scene);
