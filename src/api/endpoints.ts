/**
 * Central API Route Inventory and Documentation
 * Every endpoint consumed by the frontend is registered here.
 */

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: 'System' | 'S/MIME' | 'OpenPGP' | 'Gateway' | 'Audit' | 'Credentials';
}

export const API_ENDPOINTS: Record<string, EndpointDefinition> = {
  HEALTH: {
    method: 'GET',
    path: '/api/health',
    description: 'System health check, cryptographic engine versions, and route status',
    category: 'System'
  },
  DASHBOARD: {
    method: 'GET',
    path: '/api/dashboard',
    description: 'Dashboard operational metrics, stats, recent activities, and protocol distribution',
    category: 'Gateway'
  },
  AUDIT_LOGS: {
    method: 'GET',
    path: '/api/audit-logs',
    description: 'Query security audit trail with filtering by protocol, status, and search keywords',
    category: 'Audit'
  },
  AUDIT_LOGS_CLEAR: {
    method: 'POST',
    path: '/api/audit-logs/clear',
    description: 'Reset local demonstration audit events',
    category: 'Audit'
  },
  KEYS_LIST: {
    method: 'GET',
    path: '/api/keys',
    description: 'Retrieve public X.509 S/MIME certificates and OpenPGP public keys inventory',
    category: 'Credentials'
  },
  KEYS_CHECK_RECIPIENT: {
    method: 'POST',
    path: '/api/keys/check-recipient',
    description: 'Check credential availability and protocol compatibility for recipient email',
    category: 'Credentials'
  },
  SMIME_INSPECT_CERT: {
    method: 'POST',
    path: '/api/smime/inspect-certificate',
    description: 'Parse, validate, and inspect X.509 Certificate PEM structure and extensions',
    category: 'S/MIME'
  },
  SMIME_SIGN: {
    method: 'POST',
    path: '/api/smime/sign',
    description: 'Create an S/MIME PKCS#7 / CMS signed data structure using RSA private key',
    category: 'S/MIME'
  },
  SMIME_VERIFY_SIGNATURE: {
    method: 'POST',
    path: '/api/smime/verify-signature',
    description: 'Verify S/MIME PKCS#7 signed structure against certificate and digest',
    category: 'S/MIME'
  },
  SMIME_ENCRYPT: {
    method: 'POST',
    path: '/api/smime/encrypt',
    description: 'Encrypt message into PKCS#7 EnvelopedData for recipient X.509 certificate',
    category: 'S/MIME'
  },
  SMIME_DECRYPT: {
    method: 'POST',
    path: '/api/smime/decrypt',
    description: 'Decrypt S/MIME PKCS#7 EnvelopedData using authorized matching private key',
    category: 'S/MIME'
  },
  OPENPGP_GENERATE_KEY: {
    method: 'POST',
    path: '/api/openpgp/generate-key',
    description: 'Generate real 2048-bit demonstration OpenPGP public/private key pair',
    category: 'OpenPGP'
  },
  OPENPGP_INSPECT_KEY: {
    method: 'POST',
    path: '/api/openpgp/inspect-key',
    description: 'Parse and inspect ASCII armored OpenPGP key parameters, fingerprint, and user IDs',
    category: 'OpenPGP'
  },
  OPENPGP_ENCRYPT: {
    method: 'POST',
    path: '/api/openpgp/encrypt',
    description: 'Encrypt message using recipient OpenPGP public key with optional signature',
    category: 'OpenPGP'
  },
  OPENPGP_DECRYPT: {
    method: 'POST',
    path: '/api/openpgp/decrypt',
    description: 'Decrypt RFC 4880 OpenPGP ciphertext using private key and passphrase',
    category: 'OpenPGP'
  },
  OPENPGP_SIGN: {
    method: 'POST',
    path: '/api/openpgp/sign',
    description: 'Create cleartext or detached OpenPGP digital signature',
    category: 'OpenPGP'
  },
  OPENPGP_VERIFY: {
    method: 'POST',
    path: '/api/openpgp/verify',
    description: 'Verify RFC 4880 OpenPGP cleartext or detached signature against public key',
    category: 'OpenPGP'
  },
  GATEWAY_PROCESS: {
    method: 'POST',
    path: '/api/gateway/process',
    description: 'Main email gateway processor: validates, inspects, encrypts, signs, and cross-translates',
    category: 'Gateway'
  },
  GATEWAY_SIMULATE_INTEROP: {
    method: 'POST',
    path: '/api/gateway/simulate-interoperability',
    description: 'Execute academic interoperability test scenarios with step-by-step audit verification',
    category: 'Gateway'
  }
};
