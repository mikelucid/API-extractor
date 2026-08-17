<?php

declare(strict_types=1);

namespace App\Decision;

final class Types
{
    public const ACTIONS = ['contain', 'hold', 'escalate'];

    public const THREAT_KINDS = [
        'disallowed_host',
        'runaway_spawn',
        'constitution_breach',
        'sandbox_escape',
    ];
}
