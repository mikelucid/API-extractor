# Decentralized LLM section — research notes

Source: uploaded DeepSeek PDFs, mainly **AI API Router System Design** (pp. 61–175+) and **Live Rating** (torrent / inter-agent digression ~pp. 229–231).

## Timeline in the Router PDF

### Before decentralized (pp. ~1–63)

1. **First LLM router** — GPT classifies intent → free-form JSON (`response_format: json_object`) → dispatch text/image/STT/TTS.
2. **Rule-based / ComplexRouter** — keyword + embedding-style routing without LLM API calls; low confidence → safe text fallback.
3. **Final Universal Router** — OpenAI **function calling** catalog; typed params; extensible handlers.
4. Recommendation in-chat: ship Universal Router as the production artifact; keep the first router as a toy demo.

That stack is the durable “brain + tools” design. Rootv2 already ports the rule-first / safe-fallback / catalog patterns (no cloud keys required).

### Decentralized / torrent LLM layer (starts p. 64)

User add-on request (paraphrased):

- Personal **and** group communication logs of best answers by topic  
- Persist as JSON with **UUID + domain**  
- “Communicate like torrents download” (P2P / DHT share of logs)  
- Use logs for **advertising via OpenAI**

Assistant response evolved into:

| Component | Role |
|-----------|------|
| `InteractionLogger` | Local JSON entries: uuid, domain, user_id, group_id, topic, request, best_answer, api_used, **rating**, tags |
| `TorrentLogSync` / DHT | Seed/download `interactions.json` via libtorrent; merge by UUID |
| OpenAI advertising | Generate ads from popular topics (later stripped) |
| Peer recognition | Reputation, badges, seeding bonuses, cross-domain weight ratios |
| Later: `WireLogger` | Separate JSONL of raw API request/response payloads |

Live Rating PDF then explores **inter-agent / swarming LLM** literature (P2P-Fed, Orchestrated-Decentralized LLM Federation, GenTorrent, Swarming LLM, BitTorrent gossip learning) as research context for “torrent technology for inter-agent comms” — not a finished Rootv2 design.

### Explicit removals (p. ~166)

User: “no storage transfer only storage” → assistant marks:

- Torrent / P2P transfer — **Removed**  
- Peer recognition — **Removed**  
- Advertising — **Removed**  

Kept: local user-facing logs (UUID + domain) + wire JSON.

User then asked to **combine torrent again** without ads (p. 167+). Rootv2 constitution / allowlist policy still forbids open DHT/P2P by default (`network_peer` deny).

### Rating debate (pp. ~83–90)

Weighting/rating was called “redundant” for pure log+sync; schema simplified. For Rootv2 we **keep rating** on lessons / interaction logs because ranked retrieval of past incidents is useful without any P2P.

## What Rootv2 should take

**In (local-only):**
- `InteractionLogger` shape (uuid, domain, personal/group, topic, rating)
- `WireLogger` shape (append-only JSONL of router/tool calls — no secret bodies)
- Query helpers: filter by user/group/topic; top answer by rating × recency

**Out (unless owner later designs an explicit allowlisted channel):**
- BitTorrent / DHT / PEX / LPD swarms  
- Advertising generation  
- Peer recognition / NFT badges / public leaderboards  
- Silent stranger discovery  

Safe future analogue (not implemented as open internet): sync only over **owner allowlisted** local Unix sockets / argv peers — same bus as the supervisor allowlist — never a public DHT.
