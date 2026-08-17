<?php

declare(strict_types=1);

namespace App\AgentQuery;

/**
 * Explicit non-implementation of the PDF torrent/DHT decentral layer.
 */
final class DecentralPolicy
{
    public function __construct(
        public readonly bool $torrent = false,
        public readonly bool $dht = false,
        public readonly bool $peerRecognition = false,
        public readonly bool $advertising = false,
        public readonly bool $allowlistedLocalPeersOnly = true,
    ) {
    }

    public static function localOnly(): self
    {
        return new self();
    }

    public function assertNoPublicDecentralTransfer(): void
    {
        if ($this->torrent || $this->dht) {
            throw new \RuntimeException('Public torrent/DHT transfer is forbidden in Rootv2 defaults');
        }
    }
}
