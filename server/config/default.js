const config = {
    network: {
        rpcUrl: 'https://your-stellar-rpc-url.com', // Stellar JSON RPC endpoint.
        horizonUrl: 'https://horizon.stellar.org', // Horizon API endpoint.
        passphrase: 'Public Global Stellar Network ; September 2015', // Network passphrase.
        ollama: 'http://localhost:11434' // Ollama endpoint (for self-hosted LLMs).
    },
    llm: {
        interval: 30 // LLM loop backup interval in minutes (used when model did not provide one).
    },
    transaction: {
        slippage: 0.005, // SDEX max slippage (default 0.5%)
        timeout: 60 // Transaction timeout (default 60 seconds)
    },
    ingester: {
        interval: 60, // Polling interval (minutes).
        scratchpad: 1, // Live scratchpad interval (minutes).
        sources: {
            feedback: require('../pipeline/adapters/feedback'), // LLM feedback loop.
            blend: require('../pipeline/adapters/blend'), // Blend protocol.
            amm: require('../pipeline/adapters/amm'), // Stellar AMM pools.
            reflector: require('../pipeline/adapters/reflector'), // Reflector oracles.
            sentiment: require('../pipeline/adapters/sentiment') // Market sentiment.
        }
    },
    distiller: {
        periods: 24 // Number of ingester periods to process (default 24, ie. 24h with interval=60).
    },
    // Define any settings needed by your custom strategies here.
    strategy: {
        minTargetApy: 0.01,
        maxHedgeRatio: 0.5,
        assets: [
            {
                id: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
                code: 'XLM'
            },
            {
                code: 'USDC',
                issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
            }
        ],
        amms: [
            {
                assetA: { code: 'XLM' },
                assetB: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
                sampleSize: 200
            }
        ],
        reflector: [
            {
                oracle: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
                assets: [
                    'CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV'
                ]
            }, {
                oracle: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
                assets: [
                    'BTC',
                    'ETH'
                ]
            }, {
                oracle: 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
                assets: [
                    'BRL'
                ]
            }
        ]
    }
};

module.exports = config;
