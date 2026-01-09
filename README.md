[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](/LICENSE)
[![Follow on X](https://img.shields.io/badge/Follow%20on%20X-%40xbid__ai-black?logo=x)](https://x.com/xbid_ai)
[![Multi-LLM](https://img.shields.io/badge/Multi--LLM-Powered-blueviolet)](https://blog.xbid.ai)

# xbid.ai

![XBID Terminal](media/xbid-terminal.png)

Open the terminal at [https://xbid.ai](https://xbid.ai)

**xbid.ai** is a multi-LLM AI agent built around a simple thesis:

> **Inference does not come from clever prompts alone.**  
> It comes from contexts encoding *a posteriori* knowledge and implicit constraints—what we call *episteme*.

Rather than relying on isolated prompt engineering, **xbid.ai** conditions inference on structures that embed reasoning constraints *before* the model generates output. This enables inference under explicit constraints rather than probabilistic guesswork.

Read the full methodology: [How We Build Better Inference](https://blog.xbid.ai/posts/xbid-ai-lab-build-better-inference/)

## Real Stake

The agent is staked. Every decision has consequences.

The agent currently operates live markets on Stellar—executing delta-neutral strategies with AMM-hedged borrows, rebalancing collateral, and compounding recursive yield loops. This decision-loop is not limited to markets. The same architecture generalizes to **competitive gaming, metaverse strategies, and other domains requiring deep causal reasoning**.

## Feedback That Matters

**xbid.ai** separates feedback into two complementary paths:
- **Factual feedback**  
  Concrete outcomes (execution cost, timing effects, utilization, concentration risk) are injected back into *context*.
- **Epistemic feedback**  
  Implicit constraints and reasoning captured via structured dialogues (*episteme*) alter how future inference begins.

## Architecture

![XBID Agents](media/agents-structure.svg)

The system is composed of three core layers:

* **Data Layer**  
  Ingests, normalizes and distills onchain and external data through modular adapters (see [Live Data Sources](#live-data-sources)).
* **Model Layer**  
  A multi-LLM router fronts OpenAI, Anthropic, or self-hosted providers. Persona behavior and epistemic contexts are defined in YAML.
* **Feedback Layer**  
  Grounding inference by injecting both factual and epistemic feedback back into subsequent iterations. See [https://blog.xbid.ai/posts/xbid-ai-intelligence-staked-onchain/#the-feedback-loop](https://blog.xbid.ai/posts/xbid-ai-intelligence-staked-onchain/#the-feedback-loop)

## LLM Support

Supports multiple providers, including **Ollama** for self-hosted models.

| Provider      | Notes                                                               |
| ------------- | ------------------------------------------------------------------- |
| **OpenAI**    | GPT-5, GPT-4, GPT-4o, GPT-4.5, GPT-3.5... Requires `OPENAI_API_KEY`.       |
| **Anthropic** | Claude 4 Sonnet, Claude 4 Opus... Requires `ANTHROPIC_API_KEY`.     |
| **Ollama**    | Self-hosted models (LLaMA, Mistral, Gemma...). Configure host/port. |
| **Custom**    | Implement additional providers in `server/pipeline/router.js`.      |

## Live Data Sources

**xbid.ai** currently draws on these onchain and offchain sources to power its live trading decisions.

**On-chain:** [Stellar Network](https://stellar.org/developers), [Stellar AMM](https://www.stellarx.com/amm/analytics), [Blend Capital](https://docs.blend.capital/)  
**Off-chain:** [CoinGecko](https://www.coingecko.com), [Binance API](https://developers.binance.com/), [Santiment](https://santiment.net), [Alternative.me](https://api.alternative.me)  
**Other / domain-specific:** [Cyberbrawl MCP (in-game Auction House)](https://github.com/xbid-ai/cyberbrawl-mcp)         |

## Getting Started

```bash
npm install
npm start
```

Backend can run standalone; frontend is lightweight, PWA-ready—built with [Vite](https://vite.dev) + [Lit](https://lit.dev).

## Source & License

[MIT License](LICENSE) — fork, adapt, use, study.  
Brand assets (name, logo...) are trademarks of XBID LABS LLC.

## Security Disclaimer

**xbid.ai** runs an autonomous agent. If you run your own instance, you are **solely responsible** for securing keys, wallets, and environment. Use trusted builds and consider isolated wallets for testing. Read our [Terms of Use](https://xbid.ai/terms.txt).

---

## Links

- Live Site — [https://xbid.ai](https://xbid.ai)
- Blog — [https://blog.xbid.ai](https://blog.xbid.ai)
- X / Twitter — [https://x.com/xbid_ai](https://x.com/xbid_ai)
- Hugging Face — [https://huggingface.co/xbid-labs](https://huggingface.co/xbid-labs)