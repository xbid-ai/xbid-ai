/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

export class Camera {
    constructor() {
        this.reset();
        this.update();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.sx = 1;
        this.sy = 1;
        this.tx = 0;
        this.ty = 0;
        this.angle = 0;
        this.matrix = [1, 0, 0, 1, 0, 0];
    }

    update() {
        this.matrix = [1, 0, 0, 1, 0, 0];
        this.translate(this.x, this.y);
        this.scale(this.sx, this.sy);
        this.rotate(this.angle);
    }

    translate(t, i) {
        this.matrix[4] += this.matrix[0] * t + this.matrix[2] * i;
        this.matrix[5] += this.matrix[1] * t + this.matrix[3] * i;
    }

    scale(t, i) {
        this.matrix[0] *= t;
        this.matrix[1] *= t;
        this.matrix[2] *= i;
        this.matrix[3] *= i;
    }

    rotate(t) {
        const i = Math.cos(t);
        const a = Math.sin(t);
        const r = this.matrix[0] * i + this.matrix[2] * a;
        const s = this.matrix[1] * i + this.matrix[3] * a;
        const m = this.matrix[0] * -a + this.matrix[2] * i;
        const h = this.matrix[1] * -a + this.matrix[3] * i;
        this.matrix[0] = r;
        this.matrix[1] = s;
        this.matrix[2] = m;
        this.matrix[3] = h;
    }

    screenToCamera(t, i) {
        const a = t;
        const r = i;
        const s = 1 / (this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2]);
        // eslint-disable-next-line no-return-assign
        return {
            x: t = a * (this.matrix[3] * s) + r * (-this.matrix[2] * s) + s * (this.matrix[2] * this.matrix[5] - this.matrix[3] * this.matrix[4]),
            y: i = a * (-this.matrix[1] * s) + r * (this.matrix[0] * s) + s * (this.matrix[1] * this.matrix[4] - this.matrix[0] * this.matrix[5])
        };
    }

    cameraToScreen(t, i) {
        const a = t;
        const r = i;
        // eslint-disable-next-line no-return-assign
        return {
            x: t = a * this.matrix[0] + r * this.matrix[2] + this.matrix[4],
            y: i = a * this.matrix[1] + r * this.matrix[3] + this.matrix[5]
        };
    }

    multiply(t) {
        const i = this.matrix[0] * t.matrix[0] + this.matrix[2] * t.matrix[1];
        const a = this.matrix[1] * t.matrix[0] + this.matrix[3] * t.matrix[1];
        const r = this.matrix[0] * t.matrix[2] + this.matrix[2] * t.matrix[3];
        const s = this.matrix[1] * t.matrix[2] + this.matrix[3] * t.matrix[3];
        const m = this.matrix[0] * t.matrix[4] + this.matrix[2] * t.matrix[5] + this.matrix[4];
        const h = this.matrix[1] * t.matrix[4] + this.matrix[3] * t.matrix[5] + this.matrix[5];
        this.matrix[0] = i;
        this.matrix[1] = a;
        this.matrix[2] = r;
        this.matrix[3] = s;
        this.matrix[4] = m;
        this.matrix[5] = h;
    }
}

Object.freeze(Camera);
