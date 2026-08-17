<?php

declare(strict_types=1);

namespace App\Fallback;

final class LocalFallback
{
    public static function from(string $content): array
    {
        $patterns = [
            'error_signal' => '/\b(error|fail|exception)\b/i',
            'network_signal' => '/\b(outbound|http|https|connect)\b/i',
            'spawn_signal' => '/\b(spawn|fork|child)\b/i',
            'safe_signal' => '/\b(safe|ok|healthy)\b/i',
        ];
        $matched = [];
        foreach ($patterns as $label => $re) {
            if (preg_match($re, $content)) {
                $matched[] = $label;
            }
        }

        return [
            'ok' => true,
            'provider_used' => 'local',
            'confidence' => 0.5,
            'matched' => $matched,
            'summary' => $matched === []
                ? 'Local fallback: no remote provider; heuristic scan empty.'
                : 'Local fallback matched: '.implode(', ', $matched),
        ];
    }
}
