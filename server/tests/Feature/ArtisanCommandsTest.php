<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Console\Kernel as Artisan;
use Tests\TestCase;

final class ArtisanCommandsTest extends TestCase
{
    public function test_artisan_list_and_gate_and_decide(): void
    {
        $dir = $this->tmpDir();
        putenv('ROOTV2_DATA_DIR='.$dir);
        ob_start();
        $list = Artisan::handle(['artisan', 'list']);
        $help = ob_get_clean();
        $this->assertSame(0, $list);
        $this->assertStringContainsString('rootv2:decide', $help);

        ob_start();
        $gate = Artisan::handle(['artisan', 'rootv2:gate', 'diagnose local agent']);
        $gateOut = ob_get_clean();
        $this->assertSame(0, $gate);
        $this->assertStringContainsString('"allowed": true', $gateOut);

        ob_start();
        $decide = Artisan::handle(['artisan', 'rootv2:decide', 'diagnose local agent']);
        $decideOut = ob_get_clean();
        $this->assertSame(0, $decide);
        $this->assertStringContainsString('local_diagnose', $decideOut);
        putenv('ROOTV2_DATA_DIR');
    }
}
