<?php

declare(strict_types=1);

namespace App\AgentQuery;

/**
 * Local bag-of-words embedding index for Agent Query. Not a DHT.
 */
final class EmbeddingIndex
{
    /** @var array<string, array{id:string,text:string,vector:array<string,float>}> */
    private array $docs = [];

    public function upsert(string $id, string $text): void
    {
        $this->docs[$id] = ['id' => $id, 'text' => $text, 'vector' => $this->embed($text)];
    }

    /** @return list<array{id:string,score:float,text:string}> */
    public function query(string $text, int $k = 5): array
    {
        $q = $this->embed($text);
        $ranked = [];
        foreach ($this->docs as $doc) {
            $ranked[] = [
                'id' => $doc['id'],
                'score' => $this->cosine($q, $doc['vector']),
                'text' => $doc['text'],
            ];
        }
        usort($ranked, static fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($ranked, 0, $k);
    }

    public function size(): int
    {
        return count($this->docs);
    }

    /** @return array<string, float> */
    private function embed(string $text): array
    {
        $tokens = preg_split('/[^a-z0-9]+/', strtolower($text)) ?: [];
        $vec = [];
        foreach ($tokens as $t) {
            if ($t === '' || strlen($t) < 2) {
                continue;
            }
            $vec[$t] = ($vec[$t] ?? 0) + 1.0;
        }

        return $vec;
    }

    /** @param array<string, float> $a @param array<string, float> $b */
    private function cosine(array $a, array $b): float
    {
        $dot = 0.0;
        $na = 0.0;
        $nb = 0.0;
        foreach ($a as $k => $v) {
            $na += $v * $v;
            if (isset($b[$k])) {
                $dot += $v * $b[$k];
            }
        }
        foreach ($b as $v) {
            $nb += $v * $v;
        }
        if ($na === 0.0 || $nb === 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($na) * sqrt($nb));
    }
}
