<?php

declare(strict_types=1);

namespace App\CircuitBending;

/**
 * Declared (not decompiled) parameter graph for an owner-owned plugin.
 */
final class CircuitGraph
{
    /**
     * @param list<array{id:string,kind:string}> $nodes
     * @param list<array{from:string,to:string}> $edges
     */
    public function __construct(
        public readonly array $nodes,
        public readonly array $edges,
    ) {
    }
}
