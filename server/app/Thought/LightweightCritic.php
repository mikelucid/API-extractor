<?php

declare(strict_types=1);

namespace App\Thought;

final class LightweightCritic
{
    public function evaluate(array $plan): array
    {
        $notes = [];
        $score = 0.7;
        if (($plan['steps'] ?? []) === []) {
            $notes[] = 'Plan has no steps.';
            $score -= 0.3;
        }
        if (($plan['action'] ?? '') === 'contain' && ($plan['risk'] ?? 0) < 0.5) {
            $notes[] = 'Containment proposed at low risk — prefer hold.';
            $score -= 0.25;
        }
        if (($plan['action'] ?? '') === 'hold' && ($plan['risk'] ?? 0) > 0.85) {
            $notes[] = 'Holding despite high risk — prefer escalate/contain.';
            $score -= 0.2;
        }
        if (trim((string) ($plan['reasoning'] ?? '')) === '') {
            $notes[] = 'Empty reasoning.';
            $score -= 0.2;
        }
        $score = max(0.0, min(1.0, $score));

        return ['satisfied' => $score >= 0.55, 'score' => $score, 'notes' => $notes];
    }
}
