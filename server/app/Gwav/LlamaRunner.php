<?php

declare(strict_types=1);

namespace App\Gwav;

final class LlamaRunner
{
    private const BINS = ['llama-cli', 'llama.cpp', 'main'];

    public static function resolveBin(): ?string
    {
        $env = getenv('LLAMA_CPP_BIN');
        if ($env && is_executable($env)) {
            return $env;
        }
        foreach (self::BINS as $bin) {
            $found = trim((string) shell_exec('which '.escapeshellarg($bin).' 2>/dev/null'));
            if ($found !== '') {
                return $found;
            }
        }

        return null;
    }

    public static function run(string $ggufPath, string $systemDirective, string $userText, float $temp = 0.7, float $topP = 0.9): array
    {
        $bin = self::resolveBin();
        if ($bin === null) {
            return ['ok' => false, 'backend' => 'llama.cpp', 'reason' => 'llama.cpp binary not found'];
        }
        if (! GgufPath::isValidGguf($ggufPath)) {
            return ['ok' => false, 'backend' => 'llama.cpp', 'reason' => 'Invalid GGUF sidecar'];
        }
        $prompt = $systemDirective."\n\nOwner: ".$userText."\n\nAssistant:";
        $cmd = escapeshellarg($bin).' -m '.escapeshellarg($ggufPath)
            .' -p '.escapeshellarg($prompt)
            .' -n 256 --temp '.escapeshellarg((string) $temp)
            .' --top-p '.escapeshellarg((string) $topP).' -no-cnv 2>&1';
        $out = shell_exec($cmd);
        if (! is_string($out) || trim($out) === '') {
            return ['ok' => false, 'backend' => 'llama.cpp', 'reason' => 'llama.cpp returned empty output'];
        }

        return ['ok' => true, 'backend' => 'llama.cpp', 'answer' => trim($out)];
    }
}
