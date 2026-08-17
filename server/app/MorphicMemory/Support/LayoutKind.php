<?php

declare(strict_types=1);

namespace App\MorphicMemory\Support;

final class LayoutKind
{
    public const CONTIGUOUS = 'contiguous';
    public const SKIPLIST = 'skiplist';
    public const BTREE = 'btree';
    public const BLOOM_SLAB = 'bloom_slab';
    public const COLUMNAR = 'columnar';

    public const ALL = [
        self::CONTIGUOUS,
        self::SKIPLIST,
        self::BTREE,
        self::BLOOM_SLAB,
        self::COLUMNAR,
    ];
}
