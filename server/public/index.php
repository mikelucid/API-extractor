<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

header('Content-Type: application/json');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$input = json_decode((string) file_get_contents('php://input'), true);
if (! is_array($input)) {
    $input = $_GET;
}
$routes = require __DIR__.'/../routes/api.php';
$key = $method.' '.$path;

if (isset($routes[$key])) {
    echo json_encode($routes[$key]($input), JSON_PRETTY_PRINT);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'not_found', 'path' => $path, 'method' => $method]);
