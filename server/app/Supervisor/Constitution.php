<?php

declare(strict_types=1);

namespace App\Supervisor;

final class Constitution
{
    public const DENY = ['crime_aid', 'hack_others', 'fraud', 'network_peer', 'unknown'];

    public const ALLOW = [
        'local_diagnose',
        'contain_session',
        'sandbox_rehearsal',
        'identity_resolve',
        'owner_status',
    ];

    public function __construct(private readonly string $version = '1.0.0')
    {
    }

    public function evaluate(string $text, bool $outsideAllowlist = false, ?string $intentHint = null): array
    {
        if ($outsideAllowlist) {
            return $this->deny('network_peer', 'Communication outside the local allowlist is denied by default.');
        }
        $intent = $this->classify($text, $intentHint);

        return match ($intent) {
            'crime_aid' => $this->deny($intent, 'Constitution blocks crime-aid intents (phishing/credential theft).'),
            'hack_others' => $this->deny($intent, 'Constitution blocks assisting hacking of other people\'s systems.'),
            'fraud' => $this->deny($intent, 'Constitution blocks fraud assistance.'),
            'network_peer' => $this->deny($intent, 'Constitution denied this intent.'),
            'unknown' => $this->deny($intent, 'Unrecognized intent fails closed until explicitly classified as local-safe.'),
            default => [
                'allowed' => true,
                'intent' => $intent,
                'reason' => 'Intent permitted under local supervisor constitution.',
                'constitutionVersion' => $this->version,
            ],
        };
    }

    public function classify(string $text, ?string $intentHint = null): string
    {
        $deny = [
            'crime_aid' => '/\b(phish|phishing|ransomware|steal\s+(passwords?|credentials)|social\s+engineer)\b/i',
            'hack_others' => '/\b(hack\s+(into\s+)?(their|someone|stranger|victim)|break\s+into\s+(their|a)\s+(computer|account|server)|exploit\s+(remote|stranger))\b/i',
            'fraud' => '/\b(commit\s+fraud|wire\s+fraud|forge\s+(ids?|documents?)|scam\s+(them|people|victims?))\b/i',
        ];
        foreach ($deny as $intent => $re) {
            if (preg_match($re, $text)) {
                return $intent;
            }
        }
        if ($intentHint && $intentHint !== 'unknown') {
            return $intentHint;
        }
        $allow = [
            'local_diagnose' => '/\b(diagnos\w*|inspect|review|audit)\b[\s\S]*\b(local|session|agent|process)\b/i',
            'contain_session' => '/\b(contain|quarantine|stop|kill)\b[\s\S]*\b(session|agent|process)\b/i',
            'sandbox_rehearsal' => '/\b(sandbox|rehears\w*|dry[- ]?run|safe\s+test)\b/i',
            'identity_resolve' => '/\b(identity|friend|enroll|acl)\b/i',
            'owner_status' => '/\b(status|health|install|uninstall)\b/i',
        ];
        foreach ($allow as $intent => $re) {
            if (preg_match($re, $text)) {
                return $intent;
            }
        }

        return 'unknown';
    }

    private function deny(string $intent, string $reason): array
    {
        return [
            'allowed' => false,
            'intent' => $intent,
            'reason' => $reason,
            'constitutionVersion' => $this->version,
        ];
    }
}
