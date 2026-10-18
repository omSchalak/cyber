import {
  HealthCheckResponse,
  DashboardStats,
  AuditEvent,
  CertificateInfo,
  OpenPgpKeyInfo,
  ProcessedEmailResult
} from '../types';
import { API_ENDPOINTS } from './endpoints';

// Base URL: In production and standard local dev, empty string enables same-origin relative URLs (/api/...)
const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  let url = `${API_BASE_URL}${path}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  let bodyContent: string | undefined = undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyContent = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: bodyContent
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      'NETWORK_FAILURE',
      `Failed to connect to Gateway API at ${url}. ${msg}`,
      0
    );
  }

  // Parse response
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorCode = `HTTP_${res.status}`;
    let errorMessage = `HTTP error ${res.status}: ${res.statusText || 'Request failed'}`;
    let errorDetails: unknown = undefined;

    if (isJson) {
      try {
        const errorData = await res.json();
        if (errorData?.error) {
          errorCode = errorData.error.code || errorCode;
          errorMessage = errorData.error.message || errorMessage;
          errorDetails = errorData.error.details;
        }
      } catch {
        // Fallback to default
      }
    } else {
      try {
        const textData = await res.text();
        if (textData) {
          errorDetails = textData.slice(0, 300);
        }
      } catch {
        // Fallback
      }
    }

    throw new ApiError(errorCode, errorMessage, res.status, errorDetails);
  }

  if (res.status === 204) {
    return {} as T;
  }

  if (isJson) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

export const apiClient = {
  // 1. Health
  async getHealth(): Promise<HealthCheckResponse> {
    return request<HealthCheckResponse>(API_ENDPOINTS.HEALTH.path, { method: 'GET' });
  },

  // 2. Dashboard
  async getDashboard(): Promise<DashboardStats> {
    return request<DashboardStats>(API_ENDPOINTS.DASHBOARD.path, { method: 'GET' });
  },

  // 3. Audit Logs
  async getAuditLogs(params?: {
    search?: string;
    protocol?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    return request<{ events: AuditEvent[]; total: number }>(API_ENDPOINTS.AUDIT_LOGS.path, {
      method: 'GET',
      params
    });
  },

  async clearAuditLogs(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(API_ENDPOINTS.AUDIT_LOGS_CLEAR.path, {
      method: 'POST'
    });
  },

  // 4. Keys & Credentials
  async getKeys(checkEmail?: string): Promise<{
    smimeCertificates: any[];
    openpgpKeys: any[];
    recipientCheck?: any;
  }> {
    return request(API_ENDPOINTS.KEYS_LIST.path, {
      method: 'GET',
      params: { checkEmail }
    });
  },

  async checkRecipient(email: string): Promise<{
    email: string;
    hasSmime: boolean;
    hasOpenPgp: boolean;
    recommendedProtocol: 'smime' | 'openpgp' | 'none';
    statusMessage: string;
  }> {
    return request(API_ENDPOINTS.KEYS_CHECK_RECIPIENT.path, {
      method: 'POST',
      body: { email }
    });
  },

  // 5. S/MIME Operations
  async inspectSmimeCertificate(pemCertificate: string): Promise<{
    success: boolean;
    certificate: CertificateInfo;
  }> {
    return request(API_ENDPOINTS.SMIME_INSPECT_CERT.path, {
      method: 'POST',
      body: { pemCertificate }
    });
  },

  async signSmime(content: string, certPem: string, privateKeyPem: string): Promise<{
    success: boolean;
    signedPem: string;
    signatureSha256: string;
    timestamp: string;
  }> {
    return request(API_ENDPOINTS.SMIME_SIGN.path, {
      method: 'POST',
      body: { content, certPem, privateKeyPem }
    });
  },

  async verifySmimeSignature(signedPem: string, expectedContent?: string): Promise<{
    valid: boolean;
    content: string;
    signerCommonName?: string;
    signerEmail?: string;
    signingTime?: string;
    error?: string;
  }> {
    return request(API_ENDPOINTS.SMIME_VERIFY_SIGNATURE.path, {
      method: 'POST',
      body: { signedPem, expectedContent }
    });
  },

  async encryptSmime(plaintext: string, recipientCertPem: string): Promise<{
    success: boolean;
    encryptedPem: string;
    algorithm: string;
    keyLength: number;
  }> {
    return request(API_ENDPOINTS.SMIME_ENCRYPT.path, {
      method: 'POST',
      body: { plaintext, recipientCertPem }
    });
  },

  async decryptSmime(encryptedPem: string, privateKeyPem: string): Promise<{
    success: boolean;
    plaintext: string;
  }> {
    return request(API_ENDPOINTS.SMIME_DECRYPT.path, {
      method: 'POST',
      body: { encryptedPem, privateKeyPem }
    });
  },

  // 6. OpenPGP Operations
  async generateOpenPgpKey(name: string, email: string, passphrase?: string): Promise<{
    success: boolean;
    keyPair: {
      publicKey: string;
      privateKey: string;
      fingerprint: string;
      keyId: string;
    };
  }> {
    return request(API_ENDPOINTS.OPENPGP_GENERATE_KEY.path, {
      method: 'POST',
      body: { name, email, passphrase }
    });
  },

  async inspectOpenPgpKey(armoredKey: string): Promise<{
    success: boolean;
    keyInfo: OpenPgpKeyInfo;
  }> {
    return request(API_ENDPOINTS.OPENPGP_INSPECT_KEY.path, {
      method: 'POST',
      body: { armoredKey }
    });
  },

  async encryptOpenPgp(
    plaintext: string,
    recipientArmoredKey: string,
    signerPrivateKeyArmored?: string,
    signerPassphrase?: string
  ): Promise<{
    success: boolean;
    armoredMessage: string;
    algorithm: string;
    signed: boolean;
  }> {
    return request(API_ENDPOINTS.OPENPGP_ENCRYPT.path, {
      method: 'POST',
      body: { plaintext, recipientArmoredKey, signerPrivateKeyArmored, signerPassphrase }
    });
  },

  async decryptOpenPgp(
    armoredMessage: string,
    privateKeyArmored: string,
    passphrase?: string,
    verificationKeyArmored?: string
  ): Promise<{
    success: boolean;
    plaintext: string;
    signatureVerified: boolean;
    signerKeyId?: string;
  }> {
    return request(API_ENDPOINTS.OPENPGP_DECRYPT.path, {
      method: 'POST',
      body: { armoredMessage, privateKeyArmored, passphrase, verificationKeyArmored }
    });
  },

  async signOpenPgp(
    plaintext: string,
    privateKeyArmored: string,
    passphrase?: string,
    detached = false
  ): Promise<{
    success: boolean;
    signedPayload: string;
    type: 'cleartext' | 'detached';
  }> {
    return request(API_ENDPOINTS.OPENPGP_SIGN.path, {
      method: 'POST',
      body: { plaintext, privateKeyArmored, passphrase, detached }
    });
  },

  async verifyOpenPgp(
    signedPayload: string,
    publicKeyArmored: string,
    originalTextIfDetached?: string
  ): Promise<{
    valid: boolean;
    content: string;
    keyId?: string;
    error?: string;
  }> {
    return request(API_ENDPOINTS.OPENPGP_VERIFY.path, {
      method: 'POST',
      body: { signedPayload, publicKeyArmored, originalTextIfDetached }
    });
  },

  // 7. Gateway & Interoperability Operations
  async processGatewayMessage(payload: {
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    protocol?: 'auto' | 'smime' | 'openpgp';
    encrypt?: boolean;
    sign?: boolean;
    senderCertOrKey?: string;
    senderPrivateKey?: string;
    recipientCertOrKey?: string;
  }): Promise<ProcessedEmailResult> {
    return request<ProcessedEmailResult>(API_ENDPOINTS.GATEWAY_PROCESS.path, {
      method: 'POST',
      body: payload
    });
  },

  async simulateInteropScenario(scenarioId: string | number, customPayload?: string): Promise<{
    scenarioId: string;
    title: string;
    status: string;
    isCrossProtocol: boolean;
    senderProtocol: string;
    recipientProtocol: string;
    incomingVerification: string;
    gatewayDecision: string;
    finalOutput?: string;
    format?: string;
    securityNotes: string;
    error?: { code: string; message: string };
  }> {
    return request(API_ENDPOINTS.GATEWAY_SIMULATE_INTEROP.path, {
      method: 'POST',
      body: { scenarioId: String(scenarioId), customPayload }
    });
  }
};
