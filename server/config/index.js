/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

const path = require('path');
const { log } = require('../utils');
const configPath = path.join(__dirname, `${process.env.CONFIG || 'default'}.js`);
log.info('SERVER', `Loaded config ${configPath}`);
const config = require(configPath);
module.exports = { config };
