export type SecurityProtocol = 'smime' | 'openpgp' | 'auto';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CertificateInfo {
  subject: {
    commonName?: string;
    organization?: string;
    emailAddress?: string;
    country?: string;
    raw: string;
  };
  issuer: {
    commonName?: string;
    organization?: string;
    country?: string;
    raw: string;
  };
  serialNumber: string;
  validFrom: string;
  validTo: string;
  isValid: boolean;
  isExpired: boolean;
  fingerprintSha256: string;
  fingerprintSha1: string;
  publicKeyAlgorithm: string;
  keySize?: number;
  extensions: {
    basicConstraints?: string;
    keyUsage?: string[];
    extKeyUsage?: string[];
    subjectAltName?: string[];
  };
  rawPem: string;
  trustStatus: 'TRUSTED_DEMO' | 'VALID' | 'EXPIRED' | 'UNTRUSTED_CA' | 'INVALID';
  validationMessage: string;
}

export interface OpenPgpKeyInfo {
  keyId: string;
  fingerprint: string;
  userIDs: Array<{ name: string; email: string }>;
  algorithm: string;
  bits?: number;
  creationTime: string;
  expirationTime: string | null;
  isPrivate: boolean;
  armoredKey: string;
  trustStatus: 'DEMO_KEY' | 'VALID' | 'EXPIRED' | 'REVOKED' | 'UNVERIFIED';
}

export interface ProcessingStage {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details: string;
  timestamp?: string;
}

export interface ProcessedEmailResult {
  success: boolean;
  messageId: string;
  timestamp: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  detectedSenderProtocol: string;
  targetRecipientProtocol: string;
  isCrossProtocol: boolean;
  stages: ProcessingStage[];
  outputMessage: {
    headers: Record<string, string>;
    rawPayload: string;
    format: 'S/MIME-PKCS7' | 'OpenPGP-ASCII-Armor' | 'Plaintext';
  };
  securityReport: {
    encrypted: boolean;
    encryptionAlgorithm?: string;
    signed: boolean;
    signatureVerified?: boolean;
    signerIdentity?: string;
    gatewaySignatureApplied: boolean;
    gatewaySignerIdentity?: string;
    trustAssessment: string;
  };
  auditEventId: string;
  deliveryNotice: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  category: 'S/MIME' | 'OpenPGP' | 'Gateway Interop' | 'Credential Management' | 'System Health';
  protocol: 'S/MIME' | 'OpenPGP' | 'Cross-Protocol' | 'System';
  operation: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'VALIDATION_ERROR';
  senderEmail?: string;
  recipientEmail?: string;
  verificationOutcome?: string;
  details: string;
  isDemo: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  gatewayOperator: string;
  cryptographicEngines: {
    openpgp: {
      status: 'active' | 'unavailable';
      version: string;
    };
    smime: {
      status: 'active' | 'unavailable';
      engine: string;
    };
  };
  supportedProtocols: string[];
  registeredEndpoints: string[];
}

export interface DashboardStats {
  apiHealth: HealthCheckResponse;
  totalOperations: number;
  smimeOperations: number;
  openpgpOperations: number;
  crossProtocolOperations: number;
  successfulOperations: number;
  failedOperations: number;
  signaturesVerified: number;
  recentAuditEvents: AuditEvent[];
  protocolDistribution: {
    smime: number;
    openpgp: number;
    crossProtocol: number;
  };
}

export interface InteropScenario {
  id: string;
  title: string;
  description: string;
  senderProtocol: 'S/MIME' | 'OpenPGP';
  recipientProtocol: 'S/MIME' | 'OpenPGP' | 'Unknown';
  senderEmail: string;
  recipientEmail: string;
  category: 'direct' | 'cross-protocol' | 'failure-case';
  expectedOutcome: 'SUCCESS' | 'VALIDATION_ERROR' | 'DECRYPTION_FAILED' | 'SIGNATURE_INVALID' | 'UNSUPPORTED';
  keyNotes: string;
}
