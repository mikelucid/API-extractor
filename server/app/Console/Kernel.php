<?php

declare(strict_types=1);

namespace App\Console;

use App\Http\Controllers\MapController;
use App\Supervisor\Persona;

/**
 * Laravel-style artisan command map for the Rootv2 server.
 */
final class Kernel
{
    public static function handle(array $argv): int
    {
        $command = $argv[1] ?? 'list';
        $args = array_slice($argv, 2);
        $dataDir = getenv('ROOTV2_DATA_DIR') ?: (getenv('CURSOR_ROOTV2_DATA_DIR') ?: dirname(__DIR__, 2).'/storage/app/rootv2');
        $app = \App\Supervisor\Kernel::boot($dataDir);

        switch ($command) {
            case 'list':
            case 'help':
                echo "Rootv2 artisan\n";
                echo "  test                         Run PHPUnit\n";
                echo "  map                          Document → folder map\n";
                echo "  up                           Health\n";
                echo "  rootv2:status                Supervisor status\n";
                echo "  rootv2:gate \"<text>\"         Constitution gate\n";
                echo "  rootv2:decide \"<text>\"       Router → gate → thought → tools\n";
                echo "  rootv2:observe --kind= --confidence= --session=\n";
                echo "  rootv2:memory-recall \"<q>\"   Harmonic recall\n";
                echo "  rootv2:memory-add --kind= --outcome= --detail=\n";
                echo "  rootv2:spin-up --language=php --framework=laravel --traffic=low\n";
                echo "  rootv2:persona               Load institutional persona\n";
                echo "  rootv2:gwav-seed             Forge six orbital .gwav cards\n";
                echo "  rootv2:gwav-list\n";
                echo "  rootv2:gwav-prompt --id=ruby \"diagnose local agent\"\n";
                echo "  rootv2:gwav-orbit --seed= \"diagnose local agent\"\n";
                echo "  rootv2:gwav-export --id=origin\n";
                return 0;
            case 'test':
                passthru(dirname(__DIR__, 2).'/vendor/bin/phpunit --colors=always', $code);

                return $code ?? 1;
            case 'map':
                echo json_encode((new MapController())->show(), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'up':
        echo json_encode(['ok' => true, 'service' => 'agent'], JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:status':
                echo json_encode($app->status(), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:gate':
                $text = self::positional($args) ?? '';
                echo json_encode($app->constitution->evaluate($text), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:decide':
                $text = self::positional($args) ?? '';
                echo json_encode($app->decide($text), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:observe':
                $opts = self::options($args);
                $hit = [
                    'kind' => $opts['kind'] ?? 'disallowed_host',
                    'confidence' => (float) ($opts['confidence'] ?? 0.9),
                ];
                $candidate = isset($opts['agent']) ? ['id' => $opts['agent']] : [];
                echo json_encode($app->observe([$hit], $opts['session'] ?? 'session', $candidate), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:memory-recall':
                echo json_encode($app->memory->recall(self::positional($args) ?? ''), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:memory-add':
                $opts = self::options($args);
                echo json_encode($app->memory->ingest([
                    'kind' => $opts['kind'] ?? 'info',
                    'outcome' => $opts['outcome'] ?? 'info',
                    'detail' => $opts['detail'] ?? '',
                ]), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:spin-up':
                echo json_encode($app->spin(self::options($args)), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:persona':
                echo json_encode(Persona::load(self::options($args)), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:gwav-seed':
                echo json_encode(array_map(
                    static fn ($f) => $f['header']['id'],
                    (new \App\Gwav\Vault($dataDir))->seedOrbit(),
                ), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:gwav-list':
                echo json_encode((new \App\Gwav\Vault($dataDir))->list(), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:gwav-prompt':
                $opts = self::options($args);
                $id = $opts['id'] ?? 'ruby';
                $vault = new \App\Gwav\Vault($dataDir);
                if ($vault->list() === []) {
                    $vault->seedOrbit();
                }
                echo json_encode(\App\Gwav\Prompt::run($vault->load($id), self::positional($args) ?? ''), JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:gwav-orbit':
                $opts = self::options($args);
                $vault = new \App\Gwav\Vault($dataDir);
                if ($vault->list() === []) {
                    $vault->seedOrbit();
                }
                $steps = \App\Gwav\Orbit::run($vault, $opts['seed'] ?? 'diagnose local agent', (int) ($opts['steps'] ?? 6));
                echo json_encode(['steps' => $steps, 'jsonl' => \App\Gwav\Orbit::toJsonl($steps)], JSON_PRETTY_PRINT), PHP_EOL;

                return 0;
            case 'rootv2:gwav-export':
                $opts = self::options($args);
                $vault = new \App\Gwav\Vault($dataDir);
                if ($vault->list() === []) {
                    $vault->seedOrbit();
                }
                $file = $vault->load($opts['id'] ?? 'origin');
                echo \App\Gwav\Codec::toOllamaModelfile($file), PHP_EOL;

                return 0;
            default:
                fwrite(STDERR, "Unknown command: {$command}\n");

                return 1;
        }
    }

    private static function positional(array $args): ?string
    {
        foreach ($args as $arg) {
            if (! str_starts_with($arg, '--')) {
                return $arg;
            }
        }

        return null;
    }

    /** @return array<string, string> */
    private static function options(array $args): array
    {
        $out = [];
        foreach ($args as $arg) {
            if (preg_match('/^--([^=]+)=(.*)$/', $arg, $m)) {
                $out[$m[1]] = $m[2];
            }
        }

        return $out;
    }
}
