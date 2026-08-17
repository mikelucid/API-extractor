<?php

declare(strict_types=1);

namespace App\MorphicMemory;

use App\MorphicMemory\Support\LayoutKind;

/**
 * Layout-agnostic store/retrieve/query region. Internals may shift family
 * (tree → array → hash) without changing the caller API.
 */
final class MorphicMemoryRegion
{
    /** @var array<string, mixed> */
    private array $data = [];

    /** @var array<string, float> */
    private array $latencies = [];

    public function __construct(
        public readonly AccessAnalyzer $analyzer = new AccessAnalyzer(),
        public readonly LayoutPlanner $planner = new LayoutPlanner(),
        public readonly MigrationEngine $migration = new MigrationEngine(),
        public readonly SelfAssessmentLoop $assessment = new SelfAssessmentLoop(),
    ) {
    }

    public function store(string $key, mixed $value): void
    {
        $t0 = microtime(true);
        $this->data[$key] = $value;
        $this->latencies[$key] = (microtime(true) - $t0) * 1000;
        $this->analyzer->record($key, 'write', $this->latencies[$key]);
        $this->maybeReorg();
    }

    public function retrieve(string $key): mixed
    {
        $t0 = microtime(true);
        $value = $this->data[$key] ?? null;
        $this->latencies[$key] = (microtime(true) - $t0) * 1000;
        $this->analyzer->record($key, 'read', $this->latencies[$key]);

        return $value;
    }

    /** @return array<string, mixed> */
    public function query(string $prefix): array
    {
        $out = [];
        foreach ($this->data as $key => $value) {
            if (str_starts_with($key, $prefix)) {
                $out[$key] = $value;
                $this->analyzer->record($key, 'read');
            }
        }

        return $out;
    }

    public function layout(): string
    {
        return $this->planner->current();
    }

    public function forceAssessAndMaybeRevert(array $before): array
    {
        $after = $this->metrics();
        $verdict = $this->assessment->assess($before, $after);
        if ($verdict['revert']) {
            $this->planner->commit(LayoutKind::CONTIGUOUS);
        }

        return $verdict;
    }

    public function metrics(): array
    {
        $vals = array_values($this->latencies);
        $avg = $vals === [] ? 0.0 : array_sum($vals) / count($vals);

        return [
            'avg_latency' => $avg,
            'energy_per_access' => $avg * 0.01,
            'layout' => $this->layout(),
            'size' => count($this->data),
        ];
    }

    private function maybeReorg(): void
    {
        $stats = $this->analyzer->snapshot();
        $plan = $this->planner->propose($stats);
        if ($plan === null) {
            return;
        }
        $before = $this->metrics();
        $this->data = $this->migration->migrate($this->data, $plan['from'], $plan['to']);
        $this->planner->commit($plan['to']);
        $this->assessment->assess($before, $this->metrics());
    }
}
