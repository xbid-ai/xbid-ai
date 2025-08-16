/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { log } = require('./utils');
const rateLimit = require('express-rate-limit');

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '127.0.0.1';
const app = express();
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const opaqueToken = process.env.AUTH_TOKEN
    ? crypto.createHash('sha256').update(process.env.AUTH_TOKEN).digest()
    : null;
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});
const corsOpts = corsOrigins.length
    ? { origin: corsOrigins, credentials: true }
    : { origin: true, credentials: true };

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
app.use(express.json({ limit: process.env.BODY_LIMIT || '1mb' }));
app.use(cors(corsOpts));

process.on('uncaughtException', (err) => {
    log.error('PROCESS', 'Uncaught exception', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    log.error('PROCESS', 'Unhandled rejection', reason);
    process.exit(1);
});

(function bootstrap() {
    try {
        setup(path.join(__dirname, 'pipeline'));
    } catch (err) {
        log.error('SERVER', 'Bootstrap failed. Exiting.');
        process.exit(1);
    }

    app.listen(port, hostname, () => {
        log.info('SERVER', `xbid.ai running on ${hostname}:${port}`);
        if (process.env.DEV_MODE) {
            log.warn('SERVER', 'DEV_MODE ON');
        }
    });
})();

function setup(dir) {
    const auth = (req, res, next) => {
        if (opaqueToken) {
            try {
                const [scheme, token] = (req.headers.authorization || '').split(' ');
                if ((scheme || '').toLowerCase() !== 'bearer' || !token
                    || !crypto.timingSafeEqual(opaqueToken,
                        crypto.createHash('sha256').update(token.trim()).digest())) {
                    throw new Error('unauthorized');
                }
            } catch (err) {
                log.error('SERVER', 'Invalid auth', err);
                return res
                    .set('WWW-Authenticate', 'Bearer realm="xbid.ai"')
                    .status(401).json({ status: 'unauthorized' });
            }
        }
        next();
    };

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name.startsWith('.')) {
            continue;
        }
        if (entry.isDirectory()) {
            setup(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            try {
                const mod = require(fullPath);
                if (typeof mod.register === 'function') {
                    mod.register(app, auth, limiter);
                }
            } catch (err) {
                log.error('SERVER', `Failed to load ${entry.name}`, err);
                throw err;
            }
        }
    }
}
