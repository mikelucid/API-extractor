# Realistic * Not-realistic — where art comes from

Mathematical Thinking AI uses the same live raster + explicit math for decisions.
This note records the **creative reverse**: keep the equations, drop (or keep) the names.

## Shared substrate

| Symbol | Realistic reading | Not-realistic reading |
|--------|-------------------|------------------------|
| density grid | sensor / threat mass | pigment / value |
| centroid \(m\) | estimated state | compositional weight |
| \(\Sigma\) growth | process noise | brush looseness |
| \(R=P_t/P_s\) | threat/safe odds | tension/release |
| \(m:=m+a\cdot\Delta t\) | control action | gesture |

## Thesis

**Art comes from keeping the equations after you stop needing them to be true about danger.**

Realism asks: *is this cloud really a threat?*  
Not-realism asks: *what does this cloud want to become on the page?*

Both answers are recorded in `datasets/creative-reversals.jsonl` via:

```bash
npm run cli -- muse --steps 5
# deliberate pace by default; --pace 0 for instant
```

Alternate poles each step: `realistic` * `not_realistic`.
