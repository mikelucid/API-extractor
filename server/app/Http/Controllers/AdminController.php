<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\AmorphousFabric\AdminAuth;
use App\AmorphousFabric\CloudAccountStore;
use App\AmorphousFabric\EnvironmentStore;
use App\AmorphousFabric\Pricing;
use App\AmorphousFabric\SpinUp;
use App\Supervisor\Kernel;

final class AdminController
{
    public function overview(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $kernel = Kernel::boot();
        $envs = $kernel->environments->all();
        $accounts = $kernel->cloudAccounts->all();

        $totalBill = 0.0;
        $totalAws = 0.0;
        foreach ($envs as $env) {
            $cost = (float) ($env['quote']['aws_cost'] ?? $env['plan']['estimated_cloud_usd'] ?? 0);
            $quote = $kernel->pricing->quote($cost);
            $totalBill += $quote['bill'];
            $totalAws += $cost;
        }

        return [
            'ok' => true,
            'stats' => [
                'environments' => count($envs),
                'cloud_accounts' => count($accounts),
                'active' => count(array_filter($envs, static fn (array $e): bool => ($e['status'] ?? '') === 'materialised')),
                'hibernated' => count(array_filter($envs, static fn (array $e): bool => ($e['status'] ?? '') === 'hibernated')),
                'frozen' => count(array_filter($envs, static fn (array $e): bool => ($e['status'] ?? '') === 'frozen')),
                'total_bill_usd' => round($totalBill, 2),
                'total_cloud_cost_usd' => round($totalAws, 2),
                'pricing' => [
                    'markup' => 1.25,
                    'floor_usd' => $kernel->pricing->quote(0)['bill'],
                    'line_item' => 'Your server fabric cost',
                ],
            ],
            'environments' => $envs,
            'cloud_accounts' => $accounts,
        ];
    }

    public function connectCloud(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $provider = strtolower((string) ($input['provider'] ?? 'aws'));
        if (! in_array($provider, ['aws', 'gcp'], true)) {
            return ['ok' => false, 'error' => 'invalid_provider'];
        }

        $kernel = Kernel::boot();
        $account = [
            'id' => bin2hex(random_bytes(6)),
            'provider' => $provider,
            'label' => (string) ($input['label'] ?? ucfirst($provider).' account'),
            'account_id' => (string) ($input['account_id'] ?? $input['project_id'] ?? ''),
            'region_default' => (string) ($input['region'] ?? ($provider === 'gcp' ? 'us-central1' : 'us-east-1')),
            'status' => 'connected',
            'live' => (bool) ($input['live'] ?? false),
            'created_at' => gmdate('c'),
        ];

        if ($provider === 'aws') {
            $account['access_key'] = (string) ($input['access_key'] ?? '');
            $account['secret_key'] = (string) ($input['secret_key'] ?? '');
            $account['role_arn'] = (string) ($input['role_arn'] ?? '');
        } else {
            $account['project_id'] = (string) ($input['project_id'] ?? '');
            $account['service_account_json'] = (string) ($input['service_account_json'] ?? '');
        }

        return ['ok' => true, 'account' => $kernel->cloudAccounts->save($account)];
    }

    public function disconnectCloud(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $id = (string) ($input['account_id'] ?? '');
        if ($id === '') {
            return ['ok' => false, 'error' => 'missing_account_id'];
        }

        Kernel::boot()->cloudAccounts->delete($id);

        return ['ok' => true, 'deleted' => $id];
    }

    public function freezeEnvironment(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $id = (string) ($input['environment_id'] ?? '');
        $env = Kernel::boot()->environments->updateStatus($id, 'frozen');

        return $env === null
            ? ['ok' => false, 'error' => 'not_found']
            : ['ok' => true, 'environment' => $env];
    }

    public function hibernateEnvironment(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $kernel = Kernel::boot();
        $id = (string) ($input['environment_id'] ?? '');
        $env = $kernel->environments->find($id);
        if ($env === null) {
            return ['ok' => false, 'error' => 'not_found'];
        }

        $hibernated = $kernel->spinUp->hibernate($env);
        $kernel->environments->save($hibernated);

        return ['ok' => true, 'environment' => $hibernated];
    }

    public function destroyEnvironment(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $id = (string) ($input['environment_id'] ?? '');
        Kernel::boot()->environments->delete($id);

        return ['ok' => true, 'deleted' => $id];
    }

    public function updatePricing(array $input): array
    {
        $auth = AdminAuth::fromEnv()->require($input);
        if ($auth !== null) {
            return $auth;
        }

        $markup = (float) ($input['markup'] ?? 1.25);
        $floor = (float) ($input['floor_usd'] ?? 29.0);
        $quote = (new Pricing($markup, $floor))->quote(40);

        return [
            'ok' => true,
            'preview' => $quote,
            'message' => 'Pricing preview only — set AMORPHOUS_MARKUP and AMORPHOUS_FLOOR_USD in env for persistence.',
        ];
    }
}
