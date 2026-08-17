<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * 8×16 hexagonal tiling = 128 cores. Odd-r offset neighbours.
 */
final class HexGrid
{
    public function __construct(
        public readonly int $rows = 8,
        public readonly int $cols = 16,
    ) {
    }

    public function size(): int
    {
        return $this->rows * $this->cols;
    }

    public function idAt(int $row, int $col): int
    {
        return $row * $this->cols + $col;
    }

    public function coords(int $id): array
    {
        return [intdiv($id, $this->cols), $id % $this->cols];
    }

    /**
     * @return array<string, int> port => neighbour id
     */
    public function neighbours(int $id): array
    {
        [$r, $c] = $this->coords($id);
        $odd = $r % 2 === 1;
        $deltas = $odd
            ? [
                'P0' => [0, 1],
                'P1' => [-1, 1],
                'P2' => [-1, 0],
                'P3' => [0, -1],
                'P4' => [1, 0],
                'P5' => [1, 1],
            ]
            : [
                'P0' => [0, 1],
                'P1' => [-1, 0],
                'P2' => [-1, -1],
                'P3' => [0, -1],
                'P4' => [1, -1],
                'P5' => [1, 0],
            ];

        $out = [];
        foreach ($deltas as $port => [$dr, $dc]) {
            $nr = $r + $dr;
            $nc = $c + $dc;
            if ($nr < 0 || $nr >= $this->rows || $nc < 0 || $nc >= $this->cols) {
                continue;
            }
            $out[$port] = $this->idAt($nr, $nc);
        }

        return $out;
    }
}
