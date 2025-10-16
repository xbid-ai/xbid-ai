/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

/* MCP server integration for xbid.ai with HTTP and stdio transports.
 * Enables AI clients like Claude, LangChain, VS Code, or Cursor to query
 * transformed post-distillation data.
 */

const { z } = require('zod');
const axios = require('axios');

const ServerType = Object.freeze({ http: 'http', stdio: 'stdio' });
const Sources = Object.freeze(['blend', 'amm', 'reflector', 'sentiment', 'cyberbrawl']);
const RequestTimeout = 10000;

const mcp = {
    tools: [{
        name: 'get_data',
        config: {
            title: 'Fetch xbid.ai post-distillation data',
            description: 'Return xbid.ai post-distillation data filtered by source',
            inputSchema: {
                source: z.union([
                    z.literal('all'), z.enum(Sources), z.array(z.enum(Sources)).min(1)
                ]).default('all'),
                limit: z.number().int().positive().max(1_000).default(100),
                offset: z.number().int().min(0).default(0)
            }
        },
        http: {
            callback: async({ source, limit, offset }) => {
                const rows = await getData(source, limit, offset);
                return {
                    content: [{
                        type: 'json',
                        data: { timestamp: new Date().toISOString(), source, rows }
                    }]
                };
            }
        },
        stdio: {
            callback: async({ source, limit, offset }) => {
                const rows = await getData(source, limit, offset);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ timestamp: new Date().toISOString(), source, rows })
                    }]
                };
            }
        }
    }]
};

async function getData(source, limit, offset) {
    const base = process.env.MCP_URL || `http://localhost:${process.env.PORT}`;
    const bearer = process.env.MCP_TOKEN || '';
    const response = await axios.get(`${base}/data/transformed`, {
        headers: {
            Accept: 'application/json',
            ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
        },
        timeout: RequestTimeout
    });
    const transformed = Array.isArray(response?.data?.data) ? response.data.data : [];
    const sources = new Set(Array.isArray(source) ? source : [source]);
    const rows = source === 'all'
        ? transformed
        : transformed.filter(row => row && sources.has(row.source));
    return rows.slice(offset < rows.length ? offset : Math.max(rows.length - 1, 0), Math.min(offset + limit, rows.length));
}

async function register(app, auth, limiter) {
    async function createServer(name, type, TransportClass, options) {
        const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
        mcp[type] = {
            server: new McpServer({ name, version: '1.0.0' }),
            transport: new TransportClass(options)
        };
        for (const tool of mcp.tools) {
            mcp[type].server.registerTool(tool.name, tool.config, tool[type].callback);
        }
        await mcp[type].server.connect(mcp[type].transport);
    }

    if (process.env.MCP_STDIO === '1') {
        const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
        await createServer('xbid-ai', ServerType.stdio, StdioServerTransport);
    }

    if (process.env.MCP_HTTP === '1') {
        const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
        await createServer('xbid-ai', ServerType.http, StreamableHTTPServerTransport, { enableJsonResponse: true });
        app.use((req, res, next) => {
            res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
            next();
        });
        app.post(process.env.MCP_PATH || '/mcp', auth, limiter, async(req, res) => {
            try {
                await mcp[ServerType.http].transport.handleRequest(req, res, req.body);
            } catch (err) {
                console.error(err);
                if (!res.headersSent) {
                    res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
                }
            }
        });
    }
}

if (process.env.MCP_STDIO === '1') {
    if (require.main === module) { register().catch(err => console.error(err)); }
} else {
    module.exports = { register };
}
