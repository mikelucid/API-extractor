<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

interface CloudProviderInterface
{
    public function provider(): string;

    public function synthesise(DeclarativeSpec $spec): array;
}
