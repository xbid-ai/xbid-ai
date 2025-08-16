/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const Database = require('better-sqlite3');
const { log, keypair, shortId } = require('.');

const database = {
    db: new Database(dbName())
};

function initialize() {
    if (!database.hotPrep) {
        const timeout = 5000;
        database.hotPrep = {};
        database.db.pragma('journal_mode = WAL');
        database.db.pragma('synchronous = NORMAL');
        database.db.pragma(`busy_timeout = ${timeout}`);
        log.info('DATABASE', `Opened ${dbName()} (WAL,NORMAL,timeout=${timeout})`);
    }
}

function exec(sql) {
    initialize();
    database.db.exec(sql);
}

function prepare(sql) {
    initialize();
    database.hotPrep[sql] ||= database.db.prepare(sql);
    return database.hotPrep[sql];
}

function transaction(fn) {
    initialize();
    return database.db.transaction(fn);
}

function dbName() {
    const name = shortId(`
        ${keypair.publicKey()}
        ${process.env.CONFIG || ''}
        ${process.env.AGENT_NAME || ''}`);
    return `data_${name}.db`;
}

module.exports = { prepare, exec, transaction, dbName };
