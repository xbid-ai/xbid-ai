/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { System } from '../canvas/system';
import { Camera } from './camera';
import { minidenticon } from 'minidenticons';

export class Utils {
    static #cssVars = {};
    static #unitCamera = new Camera();
    static #hudCamera = new Camera();
    static #ratio = null;
    static #currentTime = performance.now();

    static applyCameraRatio(ratio) {
        Utils.#ratio = ratio;
        Utils.#unitCamera.sx = 1;
        Utils.#unitCamera.sy = 1;
        Utils.#unitCamera.update();
    }

    static updateCameras() {
        Utils.#unitCamera.update();
        Utils.#hudCamera.update();
    }

    static prepareContext(context) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.setTransform.apply(context, Utils.#unitCamera.matrix);
        context.transform.apply(context, Utils.#hudCamera.matrix);
    }

    static screenToHud(point, useRatio) {
        const camera = new Camera();
        camera.multiply(Utils.#unitCamera);
        camera.multiply(Utils.#hudCamera);
        const hudPoint = camera.screenToCamera(point.x, point.y);
        return { x: hudPoint.x / (Utils.#ratio && useRatio ? Utils.#ratio.x : 1), y: hudPoint.y / (Utils.#ratio && useRatio ? Utils.#ratio.y : 1) };
    };

    static hudToScreen(point, useRatio) {
        const camera = new Camera();
        camera.multiply(Utils.#unitCamera);
        camera.multiply(Utils.#hudCamera);
        const screenPoint = camera.cameraToScreen(point.x, point.y);
        return { x: screenPoint.x * (Utils.#ratio && useRatio ? Utils.#ratio.x : 1), y: screenPoint.y * (Utils.#ratio && useRatio ? Utils.#ratio.y : 1) };
    };

    static isPointInRect(pt, rect) {
        return rect && pt.x >= rect.left && pt.x <= rect.left + rect.width && pt.y >= rect.top && pt.y <= rect.top + rect.height;
    }

    static formatNumber(number, abbrv, digits = 2) {
        if (abbrv) {
            if (number >= 1e9) {
                return (number / 1e9).toFixed(digits) + 'B';
            } else if (number >= 1e6) {
                return (number / 1e6).toFixed(digits) + 'M';
            } else if (number >= 1e3) {
                return (number / 1e3).toFixed(digits) + 'K';
            } else {
                return number.toFixed(digits);
            }
        }
        return number?.toLocaleString('en-US',
            { minimumFractionDigits: digits, maximumFractionDigits: digits }) || '';
    }

    static identicon(data) {
        const svg = minidenticon(data, 50, 60);
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    static gotoWallet(address) {
        const url = `https://stellar.expert/explorer/public/account/${address}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    static gotoTransaction(tx) {
        const url = `https://stellar.expert/explorer/public/tx/${tx}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    static formatTime(time) {
        try {
            const d = new Date(time);
            return d.toLocaleTimeString(undefined,
                { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return time;
        }
    }

    static truncateKey(key, n = 4) {
        return `${key.slice(0, n)}…${key.slice(-n)}`;
    }

    static deflateRect(rect, x, y) {
        return {
            left: rect.left + x,
            top: rect.top + y,
            width: Math.max(0, rect.width - 2 * x),
            height: Math.max(0, rect.height - 2 * y)
        };
    }

    static getCssVar(name) {
        if (!Utils.#cssVars[name]) {
            const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            Utils.#cssVars[name] = value;
        }
        return Utils.#cssVars[name];
    }

    static get currentTime() {
        return Utils.#currentTime;
    }

    static set currentTime(time) {
        Utils.#currentTime = time;
    }

    static drawText(context, text, x, y, scale, color, weight, align, baseline, font, stroke, strokeColor) {
        context.save();
        context.translate(x, y);
        context.scale(scale / System.renderFontScaling, scale / System.renderFontScaling);
        context.translate(-x, -y);
        context.textAlign = align || 'center';
        context.textBaseline = baseline || 'middle';
        context.font = `${weight || 400} ${System.scaleUnit * System.renderFontScaling + 'px'} ${(font || Utils.getCssVar('--font'))}`;
        if (stroke) {
            context.strokeStyle = strokeColor;
            context.lineWidth = stroke;
            context.strokeText(text, x, y);
        }
        context.fillStyle = color || '#000000';
        context.fillText(text, x, y);
        context.restore();
    }

    static drawTextMultiline(context, text, x, y, maxWidth, lineHeight, scale, color, weight, align, baseline, font) {
        context.save();
        context.translate(x, y);
        context.scale(scale / System.renderFontScaling, scale / System.renderFontScaling);
        context.translate(-x, -y);
        context.font = `${weight || 400} ${System.scaleUnit * System.renderFontScaling + 'px'} ${(font || Utils.getCssVar('--font'))}`;
        context.fillStyle = color || '#000000';
        context.textAlign = align || 'center';
        context.textBaseline = baseline || 'middle';
        const words = text.split(' ');
        let line = '';
        let lineCount = 1;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const size = this.measureText(context, testLine, (font || Utils.getCssVar('--font')));
            if (size.width * scale > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight / (scale / System.renderFontScaling);
                lineCount += 1;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, y);
        context.restore();
        return lineCount;
    }

    static drawRect(context, area, radius, color, strike, strikeColor) {
        context.save();
        if (area.width < 2 * radius) radius = area.width / 2;
        if (area.height < 2 * radius) radius = area.height / 2;
        context.beginPath();
        context.moveTo(area.left + radius, area.top);
        context.arcTo(area.left + area.width, area.top, area.left + area.width, area.top + area.height, radius);
        context.arcTo(area.left + area.width, area.top + area.height, area.left, area.top + area.height, radius);
        context.arcTo(area.left, area.top + area.height, area.left, area.top, radius);
        context.arcTo(area.left, area.top, area.left + area.width, area.top, radius);
        context.fillStyle = color;
        context.fill();
        if (strike) {
            context.lineWidth = System.scaleUnit * 0.1 * strike;
            context.strokeStyle = strikeColor;
            context.stroke();
        }
        context.restore();
    };

    static measureText(context, text, font) {
        context.save();
        context.font = `${System.scaleUnit + 'px'} ${(font || Utils.getCssVar('--font'))}`;
        const size = context.measureText(text);
        context.restore();
        return size;
    }

    static async fetch(endpoint, params) {
        try {
            const query = new URLSearchParams(params || {}).toString();
            const response = await fetch(query ? endpoint + '?' + query : endpoint);
            if (!response.ok) {
                throw new Error('HTTP error. Status: ' + response.status);
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    static timeToMinutes(time) {
        switch (time) {
            case 'LIVE': return 720;
            case '1D': return 1440;
            case '1W': return 10080;
            case '1M': return 43800;
            default: return 1440;
        }
    }

    static setCanvasMode(enabled) {
        const html = document.documentElement;
        const body = document.body;
        const canvas = document.getElementById('canvas');
        const setStyles = (e, s) => {
            for (const [k, v] of Object.entries(s)) {
                e.style[k] = v;
            }
        };

        const on = {
            overflowX: 'hidden',
            overflowY: 'hidden',
            touchAction: 'none',
            webkitOverflowScrolling: 'auto'
        };

        const off = {
            overflowX: 'clip',
            overflowY: 'auto',
            touchAction: 'auto',
            webkitOverflowScrolling: 'touch'
        };

        setStyles(html, enabled ? on : off);
        setStyles(body, enabled ? on : off);

        if (enabled) {
            canvas.style.pointerEvents = 'auto';
        } else {
            canvas.style.pointerEvents = 'none';
        }
    }
}

Object.freeze(Utils);
