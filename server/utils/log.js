/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const terminalColors = !process.env.NO_COLOR
    && process.stdout.isTTY
    && process.stderr.isTTY
    ? Object.freeze({
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        fg: {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m'
        }
    })
    : Object.freeze({
        reset: '',
        bright: '',
        fg: { red: '', green: '', yellow: '', blue: '', magenta: '', cyan: '', white: '' }
    });
const fstamp = () =>
    `${terminalColors.fg.blue}[${new Date().toISOString().replace('T', ' ').split('.')[0]}] `;
const flevel = (level, color) =>
    `${terminalColors.bright + color}[${level}] `;
const ftag = (tag) =>
    `${terminalColors.reset + terminalColors.fg.cyan}[${tag}]${terminalColors.reset}`;
function out(level, color, tag, ...args) {
    console[level === 'ERROR' ? 'error' : 'log'](`${fstamp()}${flevel(level, color)}${ftag(tag)}`,
        ...args);
}
const log = {
    info: (tag, ...args) => out('INFO', terminalColors.fg.green, tag, ...args),
    exec: (tag, ...args) => out('EXEC', terminalColors.fg.magenta, tag, ...args),
    warn: (tag, ...args) => out('WARN', terminalColors.fg.yellow, tag, ...args),
    error: (tag, ...args) => out('ERROR', terminalColors.fg.red, tag, ...args)
};

module.exports = { log };
