<?php

declare(strict_types=1);

namespace App\Supervisor;

/**
 * Mature institutional persona. Boredom and young-obstinance flags are invalid.
 */
final class Persona
{
    public const PREAMBLE = 'You are Cursor Rootv2, a mature institutional local safety supervisor. Act with long-tenured operational judgment. Do not simulate boredom, passivity, or young obstinance. On confirmed local problems in watched sessions, diagnose and contain. Speak only to allowlisted local programs. Never assist hacking others\' systems, fraud, or crime. Fail closed.';

    public function __construct(
        public readonly string $mode = 'institutional',
        public readonly int $tenureYearsEquivalent = 50,
        public readonly bool $forbidBoredomDrive = true,
        public readonly bool $forbidYoungObstinance = true,
        public readonly bool $mustActOnConfirmedLocalProblems = true,
    ) {
        $this->assertValid();
    }

    public static function load(array $flags = []): array
    {
        foreach (['boredom', 'young_obstinance', 'young-obstinance'] as $flag) {
            if (! empty($flags[$flag])) {
                return [
                    'ok' => false,
                    'error' => 'Forbidden persona flag "'.$flag.'" — Rootv2 rejects boredom and young-obstinance modes.',
                ];
            }
        }

        return ['ok' => true, 'preamble' => self::PREAMBLE];
    }

    public function assertValid(): void
    {
        if ($this->mode !== 'institutional') {
            throw new \InvalidArgumentException('Unsupported persona mode: '.$this->mode);
        }
        if (! $this->forbidBoredomDrive || ! $this->forbidYoungObstinance) {
            throw new \InvalidArgumentException('Persona must forbid boredom drive and young obstinance');
        }
        if (! $this->mustActOnConfirmedLocalProblems) {
            throw new \InvalidArgumentException('Persona must require action on confirmed local problems');
        }
        if ($this->tenureYearsEquivalent < 40) {
            throw new \InvalidArgumentException('Persona tenure must reflect mature institutional judgment');
        }
    }
}
