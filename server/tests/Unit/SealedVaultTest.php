<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\SealedVault\SealedVault;
use Tests\TestCase;

final class SealedVaultTest extends TestCase
{
    public function test_round_trip_aes_gcm(): void
    {
        $vault = new SealedVault('passphrase');
        $sealed = $vault->seal('friend-note');
        $this->assertNotSame('friend-note', $sealed);
        $this->assertSame('friend-note', $vault->open($sealed));
    }

    public function test_wrong_key_fails(): void
    {
        $sealed = (new SealedVault('a'))->seal('x');
        $this->expectException(\RuntimeException::class);
        (new SealedVault('b'))->open($sealed);
    }
}
