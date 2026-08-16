# Incomplete thoughts always complete

When you type something new mid-thought, open work must not vanish.

## Policy

1. **Park** the interrupted seed (`incomplete-thoughts.json`)
2. On the next command — or `complete` — **finish every pending thought**
3. **Stitch** the finished output into `prior-conversation-stitches.jsonl` under the same `priorConversationId`

## CLI

```bash
# Simulate interrupt
npm run cli -- park muse "realistic * not_realistic mid-step"

# Finish all parked thoughts and fold into prior conversation
npm run cli -- complete

# think / muse / rehearse / decide also drain the queue first
npm run cli -- decide "Diagnose the local agent session"
```

## Agent habit

Same rule for this Cursor agent: if a turn was cut short by a new message, finish the unfinished work in the next turn and report it as continuation of the prior thread — do not drop it.
