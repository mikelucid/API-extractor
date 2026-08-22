const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

export type Provider = 'aws' | 'gcp'

export type SpinSpec = {
  language: string
  framework: string
  traffic: 'low' | 'medium' | 'high'
  data_stores: string[]
  region?: string
  provider: Provider
  paid?: boolean
}

export type QuoteResponse = {
  ok: boolean
  plan: {
    provider: string
    region: string
    mix: Record<string, number>
    estimated_aws_usd: number
    template: string
  }
  quote: {
    aws_cost: number
    bill: number
    margin: number
    floor_applied: boolean
    line_item: string
  }
}

export type Environment = {
  id: string
  url: string
  status: string
  provider: string
  paid: boolean
  spot: boolean
  ttl_seconds: number | null
  created_at: string
  quote?: QuoteResponse['quote']
  plan?: QuoteResponse['plan']
  spec?: { language: string; framework: string; provider: string }
}

export const amorphousApi = {
  providers: () => request<{ ok: boolean; providers: unknown[] }>('/amorphous/providers'),
  quote: (spec: SpinSpec) =>
    request<QuoteResponse>('/amorphous/quote', { method: 'POST', body: JSON.stringify(spec) }),
  spin: (spec: SpinSpec) =>
    request<{ ok: boolean; environment: Environment; quote: QuoteResponse['quote'] }>(
      '/amorphous/spin',
      { method: 'POST', body: JSON.stringify(spec) },
    ),
  environments: () =>
    request<{ ok: boolean; environments: Environment[] }>('/amorphous/environments'),
}

export const adminApi = {
  overview: (token: string) =>
    request<{
      ok: boolean
      stats: Record<string, unknown>
      environments: Environment[]
      cloud_accounts: unknown[]
    }>('/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),

  connectCloud: (
    token: string,
    data: {
      provider: Provider
      label?: string
      account_id?: string
      project_id?: string
      access_key?: string
      secret_key?: string
      role_arn?: string
      service_account_json?: string
      region?: string
      live?: boolean
    },
  ) =>
    request('/admin/cloud/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  disconnectCloud: (token: string, accountId: string) =>
    request('/admin/cloud/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ account_id: accountId }),
    }),

  freeze: (token: string, environmentId: string) =>
    request('/admin/environment/freeze', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ environment_id: environmentId }),
    }),

  hibernate: (token: string, environmentId: string) =>
    request('/admin/environment/hibernate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ environment_id: environmentId }),
    }),

  destroy: (token: string, environmentId: string) =>
    request('/admin/environment/destroy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ environment_id: environmentId }),
    }),
}
