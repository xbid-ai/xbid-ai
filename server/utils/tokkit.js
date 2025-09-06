/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const { spawn } = require('child_process');

class TokkitClient {
    constructor(bin, provider, model) {
        this.bin = bin;
        this.provider = provider;
        this.model = model;
        this.proc = null;
        this.buf = '';
        this.pending = [];
        this.queue = [];
        this.writing = false;
        this.closed = true;
        this.start();
    }

    start() {
        const args = ['--serve', '--provider', this.provider, '--model', this.model];
        this.proc = spawn(this.bin, args, { stdio: ['pipe', 'pipe', 'inherit'] });
        this.closed = false;
        this.proc.stdout.on('data', (d) => {
            this.buf += d.toString('utf8');
            for (;;) {
                const i = this.buf.indexOf('\n');
                if (i < 0) {
                    break;
                }
                const line = this.buf.slice(0, i);
                this.buf = this.buf.slice(i + 1);
                const req = this.pending.shift();
                if (!req || req.timedOut) {
                    continue;
                }
                const count = parseInt(line.trim(), 10);
                if (Number.isFinite(count)) {
                    req.resolve(count);
                } else {
                    req.reject(new Error(`tokkit bad response: "${line}"`));
                }
            }
        });

        this.proc.on('exit', (code, sig) => {
            this.closed = true;
            const err = new Error(`tokkit exited (code=${code}, sig=${sig})`);
            while (this.pending.length) {
                const p = this.pending.shift();
                if (!p.timedOut) {
                    p.reject(err);
                }
            }
            this.queue.length = 0;
        });
    }

    pump() {
        if (this.writing || this.closed || this.queue.length === 0) {
            return;
        }

        this.writing = true;
        const { buf } = this.queue[0];
        const ok = this.proc.stdin.write(buf);
        if (ok) {
            this.queue.shift();
            this.writing = false;
            this.pump();
        } else {
            this.proc.stdin.once('drain', () => {
                if (this.closed) {
                    return;
                }
                this.queue.shift();
                this.writing = false;
                this.pump();
            });
        }
    }

    count(text) {
        if (this.closed) {
            throw new Error('tokkit server not running');
        }

        const b = Buffer.from(text || '', 'utf8');
        const frame = Buffer.allocUnsafe(4 + b.length);
        frame.writeUInt32LE(b.length, 0);
        b.copy(frame, 4);

        let handle = null;
        const req = { timedOut: false, resolve: null, reject: null };
        const promise = new Promise((resolve, reject) => {
            req.resolve = (n) => { clearTimeout(handle); resolve(n); };
            req.reject = (e) => { clearTimeout(handle); reject(e); };
        });

        handle = setTimeout(() => {
            req.timedOut = true;
            req.reject(new Error('tokkit timeout'));
        }, 5000);

        this.pending.push(req);
        this.queue.push({ buf: frame });
        this.pump();
        return promise;
    }

    async close() {
        if (this.closed) {
            return;
        }
        this.proc.stdin.end();
        await new Promise(resolve => this.proc.once('close', resolve));
        this.closed = true;
    }
}

class TokenCounter {
    static tokkit;
    static log;
    static initialize({ config, log }) {
        this.log = log;
        const { bin, provider, model } = config?.tokkit || {};
        if (bin && model && provider) {
            this.tokkit = new TokkitClient(bin, provider, model);
            const shutdown = () => this.tokkit.close().catch(() => {});
            process.once('exit', shutdown);
            process.once('SIGINT', () => {
                shutdown();
                process.exit(130);
            });
            process.once('SIGTERM', () => {
                shutdown();
                process.exit(143);
            });
            this.log.info('COUNTER', `Using ${bin} ${provider} ${model}`);
        }
    }

    static async count(input) {
        const text = typeof input === 'string'
            ? input
            : input?.map(m => m.content).join(' ') || '';
        const fallback = () => Math.ceil(text.length / 4);
        let count;
        try {
            count = this.tokkit ? await this.tokkit.count(text) : fallback();
        } catch (err) {
            count = fallback();
            this.tokkit = null;
            this.log.warn('COUNTER', 'Token counter error', err);
        }
        this.log.info('COUNTER', `Estimated input token count: ~${count} ${this.tokkit ? '[tokkit]' : ''}`);
        return count;
    }
}

module.exports = { TokenCounter };
