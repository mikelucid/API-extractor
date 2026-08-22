<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class HttpRoutesTest extends TestCase
{
    public function test_api_table_exposes_document_endpoints(): void
    {
        $routes = require dirname(__DIR__, 2).'/routes/api.php';
        foreach ([
            'GET /api/map',
            'GET /api/status',
            'POST /api/decide',
            'POST /api/observe',
            'POST /api/memory',
            'POST /api/amorphous/spin',
            'POST /api/identity/enroll',
            'POST /api/gwav/prompt',
            'POST /api/gwav/orbit',
            'POST /api/gwav/export-ollama',
            'POST /api/gwav/search',
            'POST /api/gwav/resonate',
        ] as $key) {
            $this->assertArrayHasKey($key, $routes);
        }
        $map = $routes['GET /api/map']([]);
        $this->assertSame('app/MorphicMemory', $map['documents']['morphic_memory']);
    }
}
