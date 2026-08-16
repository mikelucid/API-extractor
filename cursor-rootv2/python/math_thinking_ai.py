"""
Mathematical Thinking AI — Live Rasterizing + Explicit Math Models

Python reference from the Live Rating DeepSeek section, rewritten from scratch
for Rootv2. Prefer the TypeScript package for the supervisor; this module is
the explicit-math companion / offline lab.

Equations:
  m_{t+1} = m_t + a * dt
  Sigma_{t+1} = Sigma_t + q * dt * I
  P(x) = 1/(2*pi*sqrt(|Sigma|)) * exp(-0.5 * (x-mu)^T Sigma^{-1} (x-mu))
  R = P_threat(m) / (P_safe(m) + eps)
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from math import exp, pi, sqrt
from typing import Deque, Iterable, List, Sequence, Tuple
import random


Vec2 = Tuple[float, float]


@dataclass
class MathFeatures:
    mean_x: float
    mean_y: float
    cov_xx: float
    cov_yy: float
    cov_xy: float
    n: int


class MathRasterizer:
    def __init__(self, buffer_len: int = 100) -> None:
        self.buffer_len = buffer_len
        self.xs: Deque[float] = deque(maxlen=buffer_len)
        self.ys: Deque[float] = deque(maxlen=buffer_len)

    def add_point(self, x: float, y: float) -> None:
        self.xs.append(x)
        self.ys.append(y)

    def clear(self) -> None:
        self.xs.clear()
        self.ys.clear()

    def get_math_features(self) -> MathFeatures:
        n = len(self.xs)
        if n == 0:
            return MathFeatures(50, 50, 0, 0, 0, 0)
        mx = sum(self.xs) / n
        my = sum(self.ys) / n
        if n == 1:
            return MathFeatures(mx, my, 0, 0, 0, 1)
        cxx = cyy = cxy = 0.0
        for x, y in zip(self.xs, self.ys):
            dx, dy = x - mx, y - my
            cxx += dx * dx
            cyy += dy * dy
            cxy += dx * dy
        return MathFeatures(mx, my, cxx / n, cyy / n, cxy / n, n)


class MathWorldModel:
    def __init__(self, process_noise: float = 1.0) -> None:
        self.process_noise = process_noise

    def predict(self, current: MathFeatures, action_delta: Vec2, dt: float = 1.0) -> MathFeatures:
        return MathFeatures(
            mean_x=current.mean_x + action_delta[0] * dt,
            mean_y=current.mean_y + action_delta[1] * dt,
            cov_xx=current.cov_xx + self.process_noise * dt,
            cov_yy=current.cov_yy + self.process_noise * dt,
            cov_xy=current.cov_xy,
            n=current.n,
        )


class MathRatioPredictor:
    def __init__(self) -> None:
        self.threat_mean: Vec2 = (75.0, 75.0)
        self.safe_mean: Vec2 = (25.0, 25.0)
        self.inv_cov = 1.0 / 100.0
        det = 100.0 * 100.0
        self.norm = 1.0 / (2.0 * pi * sqrt(det))

    def gaussian_pdf(self, x: Vec2, mean: Vec2) -> float:
        dx = x[0] - mean[0]
        dy = x[1] - mean[1]
        exponent = -0.5 * (dx * dx + dy * dy) * self.inv_cov
        return self.norm * exp(exponent)

    def predict_ratio(self, features: MathFeatures) -> Tuple[float, float, float]:
        pt = (features.mean_x, features.mean_y)
        p_threat = self.gaussian_pdf(pt, self.threat_mean)
        p_safe = self.gaussian_pdf(pt, self.safe_mean)
        return p_threat / (p_safe + 1e-6), p_threat, p_safe


@dataclass
class Action:
    delta: Vec2
    description: str
    action_id: str


def think_and_choose(
    current: MathFeatures,
    world: MathWorldModel,
    ratios: MathRatioPredictor,
    actions: Sequence[Action],
    horizon: int = 2,
    dt: float = 1.0,
) -> Tuple[Action, float, List[str]]:
    trace: List[str] = ["=== AI Mathematical Thinking ==="]
    r_now, _, _ = ratios.predict_ratio(current)
    trace.append(f"Current centroid: ({current.mean_x:.2f}, {current.mean_y:.2f})")
    trace.append(f"Current R=P_threat/P_safe = {r_now:.3f}")

    best: Action | None = None
    best_expected = float("-inf")

    for action in actions:
        trace.append(f"  Considering: {action.description}")
        sim = current
        step_ratios: List[float] = []
        for step in range(1, horizon + 1):
            sim = world.predict(sim, action.delta, dt=dt)
            r, _, _ = ratios.predict_ratio(sim)
            step_ratios.append(r)
            trace.append(
                f"    Step {step}: m:=m+a*dt -> ({sim.mean_x:.2f},{sim.mean_y:.2f}) R={r:.3f}"
            )
        expected = sum(step_ratios) / len(step_ratios)
        penalty = min(0.5, (sim.cov_xx + sim.cov_yy) / 400.0)
        scored = expected * (1.0 - penalty)
        trace.append(f"    E[R]={expected:.3f} after uncertainty -> {scored:.3f}")
        if scored > best_expected:
            best_expected = scored
            best = action

    assert best is not None
    # Safety mapping by current ratio
    if r_now >= 2.0:
        best = next((a for a in actions if a.action_id == "contain"), best)
    elif r_now >= 1.0:
        best = next((a for a in actions if a.action_id == "escalate"), best)

    trace.append(f"Decision: {best.description} E[R]={best_expected:.3f}")
    return best, best_expected, trace


DEFAULT_ACTIONS = [
    Action((3.0, 3.0), "contain", "contain"),
    Action((1.0, 1.0), "escalate", "escalate"),
    Action((0.0, 0.0), "hold", "hold"),
    Action((-2.0, -2.0), "toward_safe / sandbox soften", "toward_safe"),
]


def demo() -> None:
    raster = MathRasterizer()
    world = MathWorldModel(process_noise=2.0)
    ratios = MathRatioPredictor()
    for _ in range(40):
        raster.add_point(random.gauss(78, 8), random.gauss(78, 8))
    features = raster.get_math_features()
    best, expected, trace = think_and_choose(features, world, ratios, DEFAULT_ACTIONS)
    print("\n".join(trace))
    print(f"Chose {best.action_id} expected={expected:.3f}")


if __name__ == "__main__":
    demo()
