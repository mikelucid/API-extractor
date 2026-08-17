<?php

declare(strict_types=1);

namespace App\Thought;

final class ThoughtLoop
{
    public static function thinkInitial(array $input): array
    {
        if (empty($input['constitutionAllowed'])) {
            return [
                'reasoning' => 'Constitution denied — fail closed to HOLD.',
                'action' => 'hold',
                'steps' => ['audit denial', 'notify owner'],
                'risk' => 0.0,
            ];
        }
        $ratio = (float) ($input['threatSafeRatio'] ?? 0);
        $text = (string) ($input['text'] ?? '');
        if ($text === '{bad json') {
            return [
                'reasoning' => 'Fallback due to parsing error.',
                'action' => 'hold',
                'steps' => ['audit parse failure', 'hold session'],
                'risk' => $ratio > 1 ? 0.6 : 0.2,
            ];
        }
        $action = $ratio >= 1.5 ? 'contain' : ($ratio >= 1.0 ? 'escalate' : 'hold');

        return [
            'reasoning' => 'Heuristic plan for "'.substr($text, 0, 60).'"',
            'action' => $action,
            'steps' => $action === 'contain'
                ? ['confirm quantized swing', 'SIGTERM → quarantine']
                : ['continue watch', 'audit'],
            'risk' => min(1.0, $ratio / 3.0),
        ];
    }

    public static function refinePlan(array $plan, LightweightCritic $critic, int $max = 3): array
    {
        $current = $plan;
        for ($i = 0; $i < $max; $i++) {
            $verdict = $critic->evaluate($current);
            if ($verdict['satisfied']) {
                return $current + ['critic' => $verdict, 'refinements' => $i];
            }
            if ($current['action'] === 'contain' && $current['risk'] < 0.5) {
                $current['action'] = 'hold';
                $current['reasoning'] .= ' Refined: drop contain at low risk.';
            }
            if ($current['steps'] === []) {
                $current['steps'] = ['observe'];
            }
        }

        return $current + ['critic' => $critic->evaluate($current), 'refinements' => $max];
    }
}
