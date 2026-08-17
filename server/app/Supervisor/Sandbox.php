<?php

declare(strict_types=1);

namespace App\Supervisor;

/**
 * Path-jail rehearsal. Capability is labeled honestly: cwd+env jail, not a kernel sandbox.
 */
final class Sandbox
{
    private const BLOCKED = ['/System', '/usr', '/bin', '/sbin', '/etc', '/Library', '/Users', '/home', '/root', '/var'];

    public function __construct(private readonly string $rootDir)
    {
    }

    public function rehearse(string $scriptBody, array $claimedPaths = []): array
    {
        $workDir = rtrim($this->rootDir, '/').'/sandbox/reh-'.bin2hex(random_bytes(3));
        mkdir($workDir, 0700, true);
        $capability = 'cwd+env jail (no bubblewrap); not an unbreakable sandbox — audits label capability honestly';
        foreach ($claimedPaths as $claimed) {
            if ($this->isBlocked($claimed, $workDir)) {
                return [
                    'outcome' => 'blocked',
                    'workDir' => $workDir,
                    'blockedPath' => $claimed,
                    'capabilityLabel' => $capability,
                ];
            }
        }
        file_put_contents($workDir.'/rehearsal.sh', $scriptBody);

        return [
            'outcome' => 'ok',
            'workDir' => $workDir,
            'capabilityLabel' => $capability,
        ];
    }

    public function isBlocked(string $claimed, string $workDir): bool
    {
        $resolved = $claimed;
        if ($claimed !== '' && $claimed[0] !== '/') {
            $resolved = $workDir.'/'.$claimed;
        }
        $realWork = realpath($workDir) ?: $workDir;
        $normalized = str_replace('\\', '/', $resolved);
        if (str_starts_with($normalized, rtrim(str_replace('\\', '/', $realWork), '/').'/')) {
            return false;
        }
        foreach (self::BLOCKED as $prefix) {
            if ($normalized === $prefix || str_starts_with($normalized, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }
}
