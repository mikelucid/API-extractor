<?php

declare(strict_types=1);

namespace App\AgentQuery;

/**
 * Routes an owner query against the local embedding index + interaction log.
 */
final class QueryRouter
{
    public function __construct(
        private readonly EmbeddingIndex $index,
        private readonly InteractionLogger $interactions,
        private readonly DecentralPolicy $policy = new DecentralPolicy(),
    ) {
        $this->policy->assertNoPublicDecentralTransfer();
    }

    public function ask(string $topic, string $request): array
    {
        $hits = $this->index->query($request, 3);
        $best = $hits[0]['text'] ?? 'No local document matched.';
        $entry = $this->interactions->addEntry([
            'topic' => $topic,
            'request' => $request,
            'bestAnswer' => $best,
            'apiUsed' => 'local_embedding_index',
            'rating' => $hits[0]['score'] ?? 0,
            'tags' => ['local', 'no-dht'],
        ]);

        return [
            'answer' => $best,
            'hits' => $hits,
            'transfer' => 'local_only',
            'entry' => $entry,
        ];
    }
}
