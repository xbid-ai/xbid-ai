[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](/LICENSE)
[![Follow on X](https://img.shields.io/badge/Follow%20on%20X-%40xbid__ai-black?logo=x)](https://x.com/xbid_ai)
[![Multi-LLM](https://img.shields.io/badge/Multi--LLM-Powered-blueviolet)](https://blog.xbid.ai)

# xbid.ai

![XBID Terminal](media/xbid-terminal.png)

Open the terminal at [https://xbid.ai](https://xbid.ai).

**xbid.ai** is a multi-LLM AI agent built around a simple thesis: **Inference doesn't come from clever prompts.** It comes from contexts encoding *a posteriori* knowledge and implicit constraints — what we call **episteme**. Read the full methodology: [xbid.ai Lab: How We Build Better Inference](https://blog.xbid.ai/posts/xbid-ai-lab-build-better-inference/)

## Real Stake

The agent is staked. Every decision has consequences.

**xbid.ai** currently operates live markets on Stellar — executing delta-neutral strategies with AMM-hedged borrows, rebalancing collateral, and compounding recursive yield loops. The same design generalizes beyond markets, spanning competitive gaming, metaverse, and other decision-heavy domains.

## Architecture

![XBID Agents](media/agents-structure.svg)

The system is built on three core layers:

* **Data Layer** — Ingests, normalizes and distills onchain and external data through pluggable adapters (see [Live Data Sources](#live-data-sources)).
* **Model Layer** — Fronts OpenAI, Anthropic, or any self-hosted model via a multi-LLM router. Persona behavior are declared in YAML.
* **Feedback Layer** — Operates on factual and epistemic feedback. This separation allows inference to remain grounded. Read more [here](https://blog.xbid.ai/posts/xbid-ai-intelligence-staked-onchain/#the-feedback-loop).

## LLM Support

xbid.ai supports the following LLM providers, including **Ollama** for self-hosted models. New providers can be added by implementing them in `router.js`.

| Provider      | Notes                                                               |
| ------------- | ------------------------------------------------------------------- |
| **OpenAI**    | GPT-5, GPT-4, GPT-4o, GPT-4.5, GPT-3.5... Requires `OPENAI_API_KEY`.       |
| **Anthropic** | Claude 4 Sonnet, Claude 4 Opus... Requires `ANTHROPIC_API_KEY`.     |
| **Ollama**    | Self-hosted models (LLaMA, Mistral, Gemma...). Configure host/port. |
| **Custom**    | Implement additional providers in `server/pipeline/router.js`.      |

> Audit trail: All LLM requests and responses (including provider, model, and context) are logged to SQLite `messages` table.

## Live Data Sources

[xbid.ai](https://xbid.ai) currently draws on these onchain and offchain sources to power its live trading decisions.

| **Category** | **Source**      | **Link**                                                             |
| ------------ | --------------- | -------------------------------------------------------------------- |
| **Onchain**  | Stellar Network | [stellar.org/developers](https://stellar.org/developers)             |
|              | Blend Capital   | [docs.blend.capital](https://docs.blend.capital/)                    |
|              | Stellar AMM     | [stellarx.com/amm/analytics](https://www.stellarx.com/amm/analytics) |
| **Offchain** | Alternative.me  | [api.alternative.me](https://api.alternative.me)                     |
|              | Santiment       | [santiment.net](https://santiment.net)                               |
|              | CoinGecko       | [coingecko.com](https://www.coingecko.com)                           |
|              | Binance API     | [developers.binance.com](https://developers.binance.com/)            |

## Getting Started

```bash
npm install
npm start
```

> The Node.js backend can run standalone. The frontend is lightweight, fast, and mobile-friendly (with PWA installation support) — built with [Vite](https://vite.dev) + [Lit](https://lit.dev).

## Source & License

The xbid.ai source is published under the [MIT License](LICENSE) for transparency, reference, and study.
You are free to fork, adapt, and use it under the terms of that license.
**The xbid.ai name, logo, and associated brand assets are trademarks of XBID LABS LLC and may not be used to represent derivative works without written permission.**
The live [xbid.ai](https://xbid.ai) service is developed and maintained by its original authors and copyrighted © 2025 XBID LABS LLC.

## Security Disclaimer

xbid.ai runs an autonomous agent. If you run your own instance, you are **solely responsible** for securing your environment, wallet, and API keys. Only deploy from trusted builds and consider using a dedicated wallet for live, development or testing. We do not operate, endorse, or monitor third-party deployments, and accept no liability for losses, bugs, or misconfigurations. Please read our [Terms of Use](https://xbid.ai/terms.txt).

---

## Links

- [Live Site](https://xbid.ai)
- [Twitter](https://x.com/xbid_ai)
- [Blog](https://blog.xbid.ai)
- [Hugging Face](https://huggingface.co/xbid-labs)