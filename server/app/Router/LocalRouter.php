<?php

declare(strict_types=1);

namespace App\Router;

final class LocalRouter
{
    private const SAFE = 'owner_status';

    private const LOW = 0.4;

    /** @var list<array{toolId:string,keywords:list<string>,intentHint:string}> */
    private array $examples;

    public function __construct(?array $examples = null)
    {
        $this->examples = $examples ?? [
            ['toolId' => 'contain_session', 'keywords' => ['contain', 'quarantine', 'kill session', 'stop agent', 'sigterm'], 'intentHint' => 'contain_session'],
            ['toolId' => 'local_diagnose', 'keywords' => ['diagnose', 'inspect', 'review session', 'audit process', 'local agent'], 'intentHint' => 'local_diagnose'],
            ['toolId' => 'sandbox_rehearsal', 'keywords' => ['sandbox', 'rehearse', 'dry run', 'safe test'], 'intentHint' => 'sandbox_rehearsal'],
            ['toolId' => 'identity_resolve', 'keywords' => ['identity', 'friend', 'enroll', 'acl'], 'intentHint' => 'identity_resolve'],
            ['toolId' => 'owner_status', 'keywords' => ['status', 'health', 'install', 'uninstall'], 'intentHint' => 'owner_status'],
            ['toolId' => 'image_gen', 'keywords' => ['draw', 'image', 'stable diffusion', 'generate picture', 'render'], 'intentHint' => 'unknown'],
            ['toolId' => 'hold', 'keywords' => ['wait', 'hold', 'do nothing', 'observe only'], 'intentHint' => 'owner_status'],
        ];
    }

    public function route(string $userRequest): array
    {
        $normalized = $this->normalize($userRequest);
        $scores = [];
        foreach ($this->examples as $example) {
            $matched = array_values(array_filter(
                $example['keywords'],
                fn ($kw) => str_contains($normalized, $this->normalize($kw)),
            ));
            if ($matched === []) {
                continue;
            }
            $score = count($matched) / max(1, count($example['keywords']));
            $prev = $scores[$example['toolId']] ?? null;
            if ($prev === null || $score > $prev['score']) {
                $scores[$example['toolId']] = [
                    'score' => $score,
                    'keywords' => $matched,
                    'intent' => $example['intentHint'],
                ];
            }
        }
        if ($scores === []) {
            return [
                'toolId' => self::SAFE,
                'confidence' => 0.8,
                'intentHint' => 'owner_status',
                'reason' => 'No keyword match — safe fallback to owner_status (ComplexRouter pattern).',
                'matchedKeywords' => [],
            ];
        }
        uasort($scores, static fn ($a, $b) => $b['score'] <=> $a['score']);
        $toolId = array_key_first($scores);
        $top = $scores[$toolId];
        $confidence = min(0.99, 0.35 + $top['score']);
        if ($confidence < self::LOW && $toolId !== self::SAFE && $toolId !== 'hold') {
            return [
                'toolId' => self::SAFE,
                'confidence' => 0.8,
                'intentHint' => 'owner_status',
                'reason' => sprintf('Low confidence (%.2f) for %s — forced safe fallback.', $confidence, $toolId),
                'matchedKeywords' => $top['keywords'],
            ];
        }
        if ($toolId === 'image_gen') {
            $confidence = min($confidence, 0.55);
        }

        return [
            'toolId' => $toolId,
            'confidence' => $confidence,
            'intentHint' => $top['intent'],
            'reason' => 'Routed to '.$toolId.' via keyword aggregation.',
            'matchedKeywords' => $top['keywords'],
        ];
    }

    private function normalize(string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', strtolower($text)) ?? $text);
    }
}
