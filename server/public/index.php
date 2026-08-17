<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

header('Content-Type: application/json');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$routes = require __DIR__.'/../routes/api.php';

if (isset($routes[$path])) {
    echo json_encode($routes[$path](), JSON_PRETTY_PRINT);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'not_found', 'path' => $path]);
