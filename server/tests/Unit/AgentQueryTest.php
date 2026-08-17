<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\AgentQuery\DecentralPolicy;
use App\AgentQuery\EmbeddingIndex;
use App\AgentQuery\InteractionLogger;
use App\AgentQuery\QueryRouter;
use App\AgentQuery\WireLogger;
use Tests\TestCase;

final class AgentQueryTest extends TestCase
{
    public function test_local_index_and_logs_without_dht(): void
    {
        $dir = $this->tmpDir();
        $index = new EmbeddingIndex();
        $index->upsert('a', 'contain disallowed host on local agent');
        $index->upsert('b', 'owner status health check');
        $logger = new InteractionLogger($dir);
        $router = new QueryRouter($index, $logger, DecentralPolicy::localOnly());
        $result = $router->ask('safety', 'contain local agent host');
        $this->assertSame('local_only', $result['transfer']);
        $this->assertStringContainsString('contain', $result['answer']);
        $this->assertCount(1, $logger->all());

        $wire = new WireLogger($dir);
        $entry = $wire->log('route', ['apiKey' => 'secret', 'text' => 'hi'], ['ok' => true]);
        $this->assertSame('[redacted]', $entry['request']['apiKey']);
        $this->assertSame('hi', $entry['request']['text']);
        $this->assertCount(1, $wire->readAll());
    }

    public function test_decentral_policy_forbids_torrent(): void
    {
        $this->expectException(\RuntimeException::class);
        (new DecentralPolicy(torrent: true))->assertNoPublicDecentralTransfer();
    }
}
