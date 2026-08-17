<?php

declare(strict_types=1);

namespace App\SealedVault;

/**
 * Ordinary AES-256-GCM sealed-at-rest storage.
 *
 * The chalcogenic-alloy / nano-laser whitepaper is not implemented: no materials
 * work, no optical voxel encoding, no weapons-adjacent research.
 */
final class SealedVault
{
    public function __construct(private readonly string $passphrase)
    {
    }

    public function seal(string $plaintext): string
    {
        $key = hash('sha256', $this->passphrase, true);
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false) {
            throw new \RuntimeException('Seal failed.');
        }

        return base64_encode($iv.$tag.$cipher);
    }

    public function open(string $sealed): string
    {
        $raw = base64_decode($sealed, true);
        if ($raw === false || strlen($raw) < 28) {
            throw new \RuntimeException('Invalid sealed blob.');
        }
        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $cipher = substr($raw, 28);
        $key = hash('sha256', $this->passphrase, true);
        $plain = openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($plain === false) {
            throw new \RuntimeException('Open failed.');
        }

        return $plain;
    }
}
