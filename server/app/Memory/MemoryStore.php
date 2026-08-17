<?php

declare(strict_types=1);

namespace App\Memory;

use App\Harmony\Harmony;

final class MemoryStore
{
    /** @var list<array<string, mixed>> */
    private array $records = [];

    public function ingest(array $input): array
    {
        $signature = Harmony::signatureOf($input);
        foreach ($this->records as $i => $peer) {
            $score = Harmony::scoreHarmony($signature, $peer['signature']);
            if ($score['harmonic'] === 'resonate' && $score['score'] >= 0.45) {
                $this->records[$i]['depth'] = ($peer['depth'] ?? 1) + 1;
                $this->records[$i]['layers'][] = [
                    'at' => gmdate('c'),
                    'meaning' => $input['detail'],
                    'harmonic' => 'resonate',
                    'score' => $score['score'],
                ];
                $this->records[$i]['detail'] = $input['detail'];

                return ['record' => $this->records[$i], 'action' => 'deepened', 'harmonic' => $score + ['peerId' => $peer['id']]];
            }
            if ($score['harmonic'] === 'dissonate') {
                $id = bin2hex(random_bytes(4));
                $record = $this->newRecord($id, $input, $signature);
                $record['links'][] = ['id' => $peer['id'], 'harmonic' => 'dissonate', 'score' => $score['score']];
                $this->records[] = $record;

                return ['record' => $record, 'action' => 'counterpoint', 'harmonic' => $score + ['peerId' => $peer['id']]];
            }
        }
        $record = $this->newRecord(bin2hex(random_bytes(4)), $input, $signature);
        $this->records[] = $record;

        return ['record' => $record, 'action' => 'created'];
    }

    /** @return list<array<string, mixed>> */
    public function recall(string $query): array
    {
        $q = Harmony::signatureOf(['kind' => 'query', 'outcome' => 'info', 'detail' => $query]);
        $ranked = $this->records;
        usort($ranked, function ($a, $b) use ($q) {
            $sa = abs(Harmony::scoreHarmony($q, $a['signature'])['score']);
            $sb = abs(Harmony::scoreHarmony($q, $b['signature'])['score']);

            return $sb <=> $sa;
        });
        foreach ($ranked as &$row) {
            $row['reads'] = ($row['reads'] ?? 0) + 1;
            $row['lastReadAt'] = gmdate('c');
        }

        return $ranked;
    }

    public function all(): array
    {
        return $this->records;
    }

    private function newRecord(string $id, array $input, array $signature): array
    {
        return [
            'id' => $id,
            'at' => gmdate('c'),
            'kind' => $input['kind'],
            'outcome' => $input['outcome'],
            'detail' => $input['detail'],
            'signature' => $signature,
            'layers' => [],
            'links' => [],
            'depth' => 1,
            'reads' => 0,
        ];
    }
}
