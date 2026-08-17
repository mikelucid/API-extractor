<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Gwav\Orbit;
use App\Gwav\Prompt;
use App\Gwav\Vault;
use App\Supervisor\Kernel;

final class GwavController
{
    public function index(): array
    {
        return ['cards' => (new Vault(Kernel::boot()->dataDir))->list()];
    }

    public function seed(): array
    {
        $vault = new Vault(Kernel::boot()->dataDir);

        return ['ids' => array_map(static fn ($f) => $f['header']['id'], $vault->seedOrbit())];
    }

    public function prompt(array $input): array
    {
        $vault = new Vault(Kernel::boot()->dataDir);
        if ($vault->list() === []) {
            $vault->seedOrbit();
        }
        $id = (string) ($input['id'] ?? 'ruby');

        return Prompt::run($vault->load($id), (string) ($input['text'] ?? ''));
    }

    public function orbit(array $input): array
    {
        $vault = new Vault(Kernel::boot()->dataDir);
        if ($vault->list() === []) {
            $vault->seedOrbit();
        }
        $steps = Orbit::run($vault, (string) ($input['seed'] ?? 'diagnose local agent'), (int) ($input['steps'] ?? 6));

        return ['steps' => $steps, 'jsonl' => Orbit::toJsonl($steps), 'costUsd' => 0];
    }

    public function exportOllama(array $input): array
    {
        $vault = new Vault(Kernel::boot()->dataDir);
        if ($vault->list() === []) {
            $vault->seedOrbit();
        }
        $id = (string) ($input['id'] ?? 'origin');
        $file = $vault->load($id);

        return ['modelfile' => \App\Gwav\Codec::toOllamaModelfile($file), 'chime' => \App\Gwav\Waveform::chime((int) $file['header']['carrierHz'])];
    }
}
