<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * Place high-priority thoughts near the hub (core 0) or on the least-loaded neighbour.
 */
final class PlacementPolicy
{
    public function place(CognitiveFabric $fabric, Thought $thought): int
    {
        if ($thought->priority >= 8.0) {
            return 0;
        }
        $best = 0;
        $bestLoad = PHP_INT_MAX;
        foreach ($fabric->cores as $core) {
            $load = count($core->heap);
            $towardHub = $core->id === 0 ? 0 : 1;
            $score = $load + $towardHub;
            if ($score < $bestLoad) {
                $bestLoad = $score;
                $best = $core->id;
            }
        }

        return $best;
    }
}
