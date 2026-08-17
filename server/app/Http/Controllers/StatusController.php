<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class StatusController
{
    public function show(): array
    {
        return Kernel::boot()->status();
    }
}
