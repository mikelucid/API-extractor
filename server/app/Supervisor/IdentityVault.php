<?php

declare(strict_types=1);

namespace App\Supervisor;

use App\SealedVault\SealedVault;

/**
 * Friend-gated identity. No silent stranger ID or internet-wide scrape.
 */
final class IdentityVault
{
    /** @var array<string, array<string, mixed>> */
    private array $profiles = [];

    /** @var array<string, list<string>> */
    private array $friends = [];

    public function __construct(
        private readonly SealedVault $vault,
        private readonly AuditLog $audit = new AuditLog(),
    ) {
    }

    public function enroll(string $id, array $fields, string $consent = 'owner_added'): void
    {
        $sealed = $this->vault->seal(json_encode($fields, JSON_THROW_ON_ERROR));
        $this->profiles[$id] = ['id' => $id, 'consent' => $consent, 'sealed' => $sealed];
        $this->audit->append(['kind' => 'identity_enroll', 'subjectId' => $id, 'allowed' => true]);
    }

    public function addFriendship(string $a, string $b): void
    {
        $this->friends[$a][] = $b;
        $this->friends[$b][] = $a;
        $this->friends[$a] = array_values(array_unique($this->friends[$a]));
        $this->friends[$b] = array_values(array_unique($this->friends[$b]));
    }

    public function resolve(string $requesterId, string $subjectId): array
    {
        $allowed = $requesterId === $subjectId || in_array($subjectId, $this->friends[$requesterId] ?? [], true);
        $this->audit->append([
            'kind' => 'identity_access',
            'requesterId' => $requesterId,
            'subjectId' => $subjectId,
            'allowed' => $allowed,
            'summary' => $allowed ? 'Friend-gated resolve allowed.' : 'Non-friend denied.',
        ]);
        if (! $allowed || ! isset($this->profiles[$subjectId])) {
            return ['allowed' => false, 'reason' => 'Non-friend denied or unknown subject.', 'data' => null];
        }
        $fields = json_decode($this->vault->open($this->profiles[$subjectId]['sealed']), true);

        return ['allowed' => true, 'reason' => 'Friend-gated resolve allowed.', 'data' => $fields];
    }

    public static function unsupportedApis(): array
    {
        return [
            'scrapeInternetIdentities' => false,
            'silentBiometricMatch' => false,
            'autoDiscoverStrangers' => false,
        ];
    }
}
