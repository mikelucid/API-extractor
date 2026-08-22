<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * Minimal declarative runtime spec (language, framework, traffic, data stores).
 */
final class DeclarativeSpec
{
    public function __construct(
        public readonly string $language,
        public readonly string $framework,
        public readonly string $traffic,
        public readonly array $dataStores,
        public readonly ?string $region = 'us-east-1',
        public readonly string $provider = 'aws',
    ) {
    }

    public static function fromArray(array $raw): self
    {
        return new self(
            (string) ($raw['language'] ?? 'php'),
            (string) ($raw['framework'] ?? 'laravel'),
            (string) ($raw['traffic'] ?? 'low'),
            (array) ($raw['data_stores'] ?? ['sqlite']),
            isset($raw['region']) ? (string) $raw['region'] : 'us-east-1',
            (string) ($raw['provider'] ?? 'aws'),
        );
    }
}
