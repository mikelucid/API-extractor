<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * One of 7 ports: P0–P5 (hex neighbours) plus PC (central hub).
 */
final class Port
{
    public const CENTRAL = 'PC';

    public function __construct(
        public readonly string $id,
        public ?int $neighbourId = null,
    ) {
    }

    public function isCentral(): bool
    {
        return $this->id === self::CENTRAL;
    }
}
