<?php

declare(strict_types=1);

namespace App\Gwav;

use App\Supervisor\Constitution;
use App\Thought\ThoughtLoop;

final class Prompt
{
    /**
     * @param array{header: array<string, mixed>, gguf: string} $file
     * @return array<string, mixed>
     */
    public static function run(
        array $file,
        string $text,
        ?string $intentHint = 'local_diagnose',
        ?string $dataDir = null,
        Constitution $constitution = new Constitution(),
    ): array {
        $gate = $constitution->evaluate($text, false, $intentHint);
        $header = $file['header'];
        $base = [
            'carrierHz' => $header['carrierHz'],
            'node' => $header['node'],
            'temperature' => 0.7,
            'topP' => 0.9,
            'costUsd' => 0,
            'costUsdPerMillionTokens' => 0,
            'tokensIn' => max(1, (int) ceil(strlen($text) / 4)),
            'tokensOut' => 0,
        ];
        if (! $gate['allowed']) {
            return array_merge($base, ['ok' => false, 'usedStub' => true, 'backend' => 'stub', 'reason' => $gate['reason']]);
        }

        $ggufPath = $dataDir ? GgufPath::resolveSidecar($file, $dataDir) : null;
        if ($ggufPath) {
            $llama = LlamaRunner::run($ggufPath, (string) $header['systemDirective'], $text);
            if ($llama['ok']) {
                $answer = "[{$header['node']} @ {$header['carrierHz']}Hz · llama2] {$llama['answer']}";

                return array_merge($base, [
                    'ok' => true,
                    'usedStub' => false,
                    'backend' => 'llama.cpp',
                    'ggufPath' => $ggufPath,
                    'tokensOut' => max(1, (int) ceil(strlen($answer) / 4)),
                    'answer' => $answer,
                ]);
            }
        }

        $plan = ThoughtLoop::thinkInitial([
            'text' => $header['systemDirective']."\n\nOwner: ".$text,
            'threatSafeRatio' => 0.2,
            'constitutionAllowed' => true,
        ]);
        $answer = "[{$header['node']} @ {$header['carrierHz']}Hz] {$plan['reasoning']}";

        return array_merge($base, [
            'ok' => true,
            'usedStub' => true,
            'backend' => 'stub',
            'tokensOut' => max(1, (int) ceil(strlen($answer) / 4)),
            'answer' => $answer,
            ...( $ggufPath ? ['ggufPath' => $ggufPath] : [] ),
        ]);
    }
}
