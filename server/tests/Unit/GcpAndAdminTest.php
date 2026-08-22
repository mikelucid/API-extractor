<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\AmorphousFabric\AdminAuth;
use App\AmorphousFabric\DeclarativeSpec;
use App\AmorphousFabric\EnvironmentStore;
use App\AmorphousFabric\GcpSynthesizer;
use App\AmorphousFabric\SynthesizerFactory;
use Tests\TestCase;

final class GcpAndAdminTest extends TestCase
{
    public function test_gcp_synthesizer_returns_gcp_plan(): void
    {
        $plan = (new GcpSynthesizer())->synthesise(DeclarativeSpec::fromArray([
            'language' => 'node',
            'framework' => 'express',
            'traffic' => 'low',
            'provider' => 'gcp',
        ]));
        $this->assertSame('gcp', $plan['provider']);
        $this->assertFalse($plan['live_cloud']);
        $this->assertArrayHasKey('cloud_run', $plan['mix']);
    }

    public function test_synthesizer_factory_picks_provider(): void
    {
        $aws = SynthesizerFactory::make('aws');
        $gcp = SynthesizerFactory::make('gcp');
        $this->assertSame('aws', $aws->provider());
        $this->assertSame('gcp', $gcp->provider());
    }

    public function test_admin_auth_rejects_bad_token(): void
    {
        $auth = new AdminAuth('secret-token');
        $this->assertNull($auth->require(['admin_token' => 'secret-token']));
        $fail = $auth->require(['admin_token' => 'wrong']);
        $this->assertNotNull($fail);
        $this->assertSame('unauthorized', $fail['error']);
    }

    public function test_environment_store_persists(): void
    {
        $dir = sys_get_temp_dir().'/amorphous-test-'.bin2hex(random_bytes(4));
        mkdir($dir, 0777, true);
        $store = new EnvironmentStore($dir);
        $store->save(['id' => 'abc123', 'status' => 'materialised']);
        $found = $store->find('abc123');
        $this->assertNotNull($found);
        $this->assertSame('materialised', $found['status']);
    }
}
