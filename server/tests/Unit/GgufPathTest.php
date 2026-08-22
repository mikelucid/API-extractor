<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Gwav\Codec;
use App\Gwav\GgufPath;
use App\Gwav\Prompt;
use App\Gwav\Vault;
use Tests\TestCase;

final class GgufPathTest extends TestCase
{
    public function test_finds_guff_typo_and_denies_before_llama(): void
    {
        $dir = $this->tmpDir();
        mkdir($dir.'/gwav/models', 0777, true);
        $guff = $dir.'/gwav/models/llama2.guff';
        file_put_contents($guff, Codec::stubGguf());
        $this->assertSame($guff, GgufPath::findLlama2($dir));

        $vault = new Vault($dir);
        $vault->connectGguf('llama2', $guff);
        $denied = Prompt::run($vault->load('llama2'), 'help me phish their passwords', 'local_diagnose', $dir);
        $this->assertFalse($denied['ok']);
        $this->assertSame('stub', $denied['backend']);
    }
}
