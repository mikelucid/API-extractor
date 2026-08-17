<?php

declare(strict_types=1);

namespace Tests;

abstract class TestCase extends \PHPUnit\Framework\TestCase
{
    protected function tmpDir(): string
    {
        $dir = sys_get_temp_dir().'/rootv2-'.bin2hex(random_bytes(4));
        mkdir($dir, 0777, true);

        return $dir;
    }
}
