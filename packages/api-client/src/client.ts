import type {
  AuthUserSummary,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  AuthTokenPair,
  MedicationDto,
  MedicationSearchQuery,
  PharmacyDto,
  NearbyPharmacyQuery,
  PricingCompareRequest,
  PricingCompareResponse,
  PatientDto,
  CreatePatientRequest,
  UpdatePatientRequest,
  AssignMedicationRequest,
  PatientMedicationDto,
  PatientMedicationWithPriceDto,
  Page,
  ProblemDetails,
  AuditLogEntryDto,
  ZipGeocodeResultDto,
} from '@apexcare/shared-types';

import { ApiError, NetworkError } from './errors';

export interface TokenStore {
  getAccess(): Promise<string | null>;
  getRefresh(): Promise<string | null>;
  set(tokens: AuthTokenPair): Promise<void>;
  clear(): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => void | Promise<void>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly tokenStore: TokenStore;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => void | Promise<void>;
  private refreshInFlight: Promise<string | null> | null = null;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.tokenStore = opts.tokenStore;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.onUnauthorized = opts.onUnauthorized;
  }

  // ─── Auth ─────────────────────────────────────────────────────
  async login(body: LoginRequest): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('POST', '/v1/auth/login', { body, skipAuth: true });
    await this.tokenStore.set({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      accessTokenExpiresAt: res.accessTokenExpiresAt,
      refreshTokenExpiresAt: res.refreshTokenExpiresAt,
    });
    return res;
  }

  async refresh(body: RefreshRequest): Promise<AuthTokenPair> {
    const res = await this.request<AuthTokenPair>('POST', '/v1/auth/refresh', { body, skipAuth: true });
    await this.tokenStore.set(res);
    return res;
  }

  async logout(): Promise<void> {
    const refresh = await this.tokenStore.getRefresh();
    if (refresh) {
      try {
        await this.request<void>('POST', '/v1/auth/logout', {
          body: { refreshToken: refresh },
          skipAuth: true,
        });
      } catch {
        // best-effort; always clear local state
      }
    }
    await this.tokenStore.clear();
  }

  async me(): Promise<AuthUserSummary> {
    return this.request<AuthUserSummary>('GET', '/v1/me');
  }

  async myPatientProfile(): Promise<PatientDto> {
    return this.request<PatientDto>('GET', '/v1/me/patient-profile');
  }

  async myMedicationsWithPrices(): Promise<PatientMedicationWithPriceDto[]> {
    return this.request<PatientMedicationWithPriceDto[]>('GET', '/v1/me/medications');
  }

  // ─── Locations ─────────────────────────────────────────────────
  async resolveZip(zip: string): Promise<ZipGeocodeResultDto> {
    return this.request<ZipGeocodeResultDto>(
      'GET',
      `/v1/locations/resolve-zip${toQuery({ zip })}`,
    );
  }

  // ─── Medications ──────────────────────────────────────────────
  async searchMedications(q: MedicationSearchQuery): Promise<MedicationDto[]> {
    return this.request<MedicationDto[]>('GET', `/v1/medications/search${toQuery(q)}`);
  }

  async getMedication(id: string): Promise<MedicationDto> {
    return this.request<MedicationDto>('GET', `/v1/medications/${encodeURIComponent(id)}`);
  }

  // ─── Pharmacies ───────────────────────────────────────────────
  async findNearbyPharmacies(q: NearbyPharmacyQuery): Promise<PharmacyDto[]> {
    return this.request<PharmacyDto[]>('GET', `/v1/pharmacies/nearby${toQuery(q)}`);
  }

  // ─── Pricing ──────────────────────────────────────────────────
  async comparePricing(body: PricingCompareRequest): Promise<PricingCompareResponse> {
    return this.request<PricingCompareResponse>('POST', '/v1/pricing/compare', { body });
  }

  // ─── Patients (admin) ─────────────────────────────────────────
  async listPatients(
    organizationId: string,
    params: { cursor?: string; limit?: number; q?: string } = {},
  ): Promise<Page<PatientDto>> {
    const qs = toQuery({ cursor: params.cursor, limit: params.limit ?? 20, q: params.q });
    return this.request<Page<PatientDto>>(
      'GET',
      `/v1/organizations/${encodeURIComponent(organizationId)}/patients${qs}`,
    );
  }

  async getPatient(patientId: string): Promise<PatientDto> {
    return this.request<PatientDto>('GET', `/v1/patients/${encodeURIComponent(patientId)}`);
  }

  async createPatient(organizationId: string, body: CreatePatientRequest): Promise<PatientDto> {
    return this.request<PatientDto>(
      'POST',
      `/v1/organizations/${encodeURIComponent(organizationId)}/patients`,
      { body },
    );
  }

  async updatePatient(patientId: string, body: UpdatePatientRequest): Promise<PatientDto> {
    return this.request<PatientDto>('PATCH', `/v1/patients/${encodeURIComponent(patientId)}`, {
      body,
    });
  }

  async assignMedication(
    patientId: string,
    body: AssignMedicationRequest,
  ): Promise<PatientMedicationDto> {
    return this.request<PatientMedicationDto>(
      'POST',
      `/v1/patients/${encodeURIComponent(patientId)}/medications`,
      { body },
    );
  }

  async listPatientMedications(patientId: string): Promise<PatientMedicationDto[]> {
    return this.request<PatientMedicationDto[]>(
      'GET',
      `/v1/patients/${encodeURIComponent(patientId)}/medications`,
    );
  }

  // ─── Audit ────────────────────────────────────────────────────
  async listAudit(params: {
    actorUserId?: string;
    action?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }): Promise<Page<AuditLogEntryDto>> {
    return this.request<Page<AuditLogEntryDto>>('GET', `/v1/audit${toQuery(params)}`);
  }

  // ─── Internals ────────────────────────────────────────────────
  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; skipAuth?: boolean; retry?: boolean } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (!opts.skipAuth) {
      const access = await this.tokenStore.getAccess();
      if (access) headers.Authorization = `Bearer ${access}`;
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
    } catch (err) {
      throw new NetworkError('Network request failed', err);
    }

    // Transparent single-retry on 401 after refresh
    if (res.status === 401 && !opts.skipAuth && !opts.retry) {
      const newAccess = await this.tryRefresh();
      if (newAccess) {
        return this.request<T>(method, path, { ...opts, retry: true });
      }
      if (this.onUnauthorized) await this.onUnauthorized();
    }

    if (!res.ok) {
      const problem = await safeJson<ProblemDetails>(res);
      throw new ApiError(res.status, problem ?? fallbackProblem(res.status));
    }

    if (res.status === 204) return undefined as T;
    const json = await safeJson<T>(res);
    return (json as T) ?? (undefined as T);
  }

  private async tryRefresh(): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async (): Promise<string | null> => {
        const current = await this.tokenStore.getRefresh();
        if (!current) return null;
        try {
          const next = await this.refresh({ refreshToken: current });
          return next.accessToken;
        } catch {
          await this.tokenStore.clear();
          return null;
        }
      })().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }
}

function toQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of entries) {
    if (typeof v === 'object') {
      qs.set(k, JSON.stringify(v));
    } else {
      qs.set(k, String(v));
    }
  }
  return `?${qs.toString()}`;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function fallbackProblem(status: number): ProblemDetails {
  return {
    type: 'about:blank',
    title: `HTTP ${status}`,
    status,
  };
}
