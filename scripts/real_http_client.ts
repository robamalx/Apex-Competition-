/**
 * APEX ARENA Real HTTP Test Client
 * Phase 1 Implementation: Real application path client using global fetch
 */

export interface HttpResponse<T = any> {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
}

export class ApexRealHttpClient {
  public baseUrl: string;
  public token: string | null = null;
  public currentUser: any = null;

  constructor(baseUrl: string = 'http://127.0.0.1:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public async request<T = any>(
    method: string,
    path: string,
    body?: any,
    extraHeaders: Record<string, string> = {}
  ): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const init: RequestInit = {
      method,
      headers
    };

    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(url, init);
      let data: any;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return {
        status: res.status,
        ok: res.ok,
        data,
        headers: res.headers
      };
    } catch (err: any) {
      return {
        status: 0,
        ok: false,
        data: { error: `Network/Connection Error: ${err.message}` } as any,
        headers: new Headers()
      };
    }
  }

  // --- Auth APIs ---
  public async register(userData: {
    name: string;
    username: string;
    email: string;
    password?: string;
    phone?: string;
    referredBy?: string;
  }) {
    const res = await this.request('POST', '/api/auth/register', {
      password: 'Password123!',
      ...userData
    });
    if (res.ok && res.data?.token) {
      this.token = res.data.token;
      this.currentUser = res.data.user;
    }
    return res;
  }

  public async login(identifier: string, password: string = 'Password123!') {
    const res = await this.request('POST', '/api/auth/login', {
      identifier,
      password
    });
    if (res.ok && res.data?.token) {
      this.token = res.data.token;
      this.currentUser = res.data.user;
    }
    return res;
  }

  public async getMe() {
    return this.request('GET', '/api/auth/me');
  }

  // --- Phone Verification APIs ---
  public async requestPhoneOtp(phone?: string, preferMock: boolean = true) {
    return this.request('POST', '/api/auth/phone/request-otp', {
      phone,
      channel: 'SMS',
      preferMock
    });
  }

  public async verifyPhoneOtp(challengeId: string, otp: string) {
    const res = await this.request('POST', '/api/auth/phone/verify-otp', {
      challengeId,
      otp
    });
    if (res.ok && res.data?.user) {
      this.currentUser = res.data.user;
    }
    return res;
  }

  // --- Wallet APIs ---
  public async getWalletBalance() {
    return this.request('GET', '/api/wallet/balance');
  }

  public async deposit(amountETB: number, method: string = 'CBE_BIRR', referenceId?: string, idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const ref = referenceId || `DEP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this.request('POST', '/api/wallet/deposit', {
      amountETB,
      method,
      paymentReference: ref,
      referenceId: ref,
      idempotencyKey
    }, headers);
  }

  public async withdraw(amountETB: number, phoneOrAccount: string, method: string = 'CBE_BIRR', idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    return this.request('POST', '/api/wallet/withdraw', {
      amountETB,
      destinationAccount: phoneOrAccount,
      phoneOrAccount,
      method,
      idempotencyKey
    }, headers);
  }

  // --- Admin Wallet Review APIs ---
  public async reviewWallet(txId: string, action: 'APPROVE' | 'REJECT', notes?: string) {
    return this.request('POST', '/api/admin/wallet/review', {
      transactionId: txId,
      txId,
      action,
      notes: notes || `Harness review action: ${action}`
    });
  }

  public async getWalletReconciliation() {
    return this.request('GET', '/api/admin/wallet/reconciliation');
  }

  // --- Competition APIs ---
  public async listCompetitions() {
    return this.request('GET', '/api/competitions');
  }

  public async getCompetition(id: string) {
    return this.request('GET', `/api/competitions/${id}`);
  }

  public async createCompetition(compData: any) {
    return this.request('POST', '/api/competitions', compData);
  }

  public async joinCompetition(id: string, selections: any[], idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    return this.request('POST', `/api/competitions/${id}/join`, {
      selections,
      idempotencyKey
    }, headers);
  }

  public async enterCompetition(id: string, selections: any[], idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    return this.request('POST', `/api/competitions/${id}/enter`, {
      selections,
      idempotencyKey
    }, headers);
  }

  public async setFixtureResult(fixtureId: string, homeScore: number, awayScore: number) {
    return this.request('POST', `/api/fixtures/${fixtureId}/result`, {
      homeScore,
      awayScore
    });
  }

  public async settleCompetition(id: string) {
    return this.request('POST', `/api/admin/competitions/${id}/settle`, {});
  }

  public async getSettlement(id: string) {
    return this.request('GET', `/api/competitions/${id}/settlement`);
  }

  public async refundEntry(id: string, targetUserId: string, reason?: string) {
    return this.request('POST', `/api/competitions/${id}/refund-entry`, {
      targetUserId,
      reason: reason || 'Test harness refund'
    });
  }

  public async getLeaderboard(id: string) {
    return this.request('GET', `/api/competitions/${id}/leaderboard`);
  }

  public async getScorecard(id: string) {
    return this.request('GET', `/api/competitions/${id}/my-scorecard`);
  }

  // --- Fixtures APIs ---
  public async getFixtures() {
    return this.request('GET', '/api/fixtures');
  }
}
