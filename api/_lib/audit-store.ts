import { AuditEvent } from '../../src/types';

// In-memory audit event store initialized with demonstration events
let auditEvents: AuditEvent[] = [
  {
    id: 'AUD-88210',
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    category: 'Gateway Interop',
    protocol: 'Cross-Protocol',
    operation: 'S/MIME to OpenPGP Conversion',
    status: 'SUCCESS',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    verificationOutcome: 'Signature Verified (Alice Smith X.509) -> Trans-encrypted to Bob Jones OpenPGP',
    details: 'Verified inbound CMS signed data; decrypted at gateway boundary; re-encrypted with OpenPGP KeyID 0x247AB3; Gateway operator signature appended.',
    isDemo: true
  },
  {
    id: 'AUD-88209',
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    category: 'S/MIME',
    protocol: 'S/MIME',
    operation: 'Certificate Parsing & Validation',
    status: 'SUCCESS',
    senderEmail: 'alice@gateway.internal',
    verificationOutcome: 'Valid Certificate (RSA 1024 / SHA-256)',
    details: 'Parsed X.509 certificate. Subject: CN=Alice Smith. Validity checked and confirmed active.',
    isDemo: true
  },
  {
    id: 'AUD-88208',
    timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    category: 'OpenPGP',
    protocol: 'OpenPGP',
    operation: 'Cleartext Signature Verification',
    status: 'SUCCESS',
    senderEmail: 'bob@gateway.internal',
    verificationOutcome: 'Signature Valid (Bob Jones Ed25519)',
    details: 'Verified RFC 4880 cleartext signature against public key fingerprint.',
    isDemo: true
  },
  {
    id: 'AUD-88207',
    timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    category: 'S/MIME',
    protocol: 'S/MIME',
    operation: 'Certificate Chain Verification',
    status: 'WARNING',
    senderEmail: 'carol@external.org',
    verificationOutcome: 'Certificate Expired',
    details: 'X.509 Certificate for carol@external.org expired. Gateway rejected automatic transmission.',
    isDemo: true
  },
  {
    id: 'AUD-88206',
    timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    category: 'System Health',
    protocol: 'System',
    operation: 'Cryptographic Engine Self-Test',
    status: 'SUCCESS',
    verificationOutcome: 'Self-Test PASSED',
    details: 'OpenPGP engine (v5.11) and S/MIME PKCS#7 engine verified. All tests functional.',
    isDemo: true
  }
];

export function addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const newEvent: AuditEvent = {
    id: `AUD-${Math.floor(10000 + Math.random() * 90000)}`,
    timestamp: new Date().toISOString(),
    ...event
  };

  // Safe sanitization check
  if (newEvent.details) {
    newEvent.details = newEvent.details
      .replace(/-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
      .replace(/passphrase=[^&,\s]+/gi, 'passphrase=[REDACTED]');
  }

  // Prepend new event
  auditEvents.unshift(newEvent);

  // Keep last 200 events in memory
  if (auditEvents.length > 200) {
    auditEvents = auditEvents.slice(0, 200);
  }

  return newEvent;
}

export function getAuditEvents(options?: {
  search?: string;
  protocol?: string;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): { events: AuditEvent[]; total: number } {
  let filtered = [...auditEvents];

  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(e =>
      e.id.toLowerCase().includes(q) ||
      e.operation.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      (e.senderEmail && e.senderEmail.toLowerCase().includes(q)) ||
      (e.recipientEmail && e.recipientEmail.toLowerCase().includes(q))
    );
  }

  if (options?.protocol && options.protocol !== 'All') {
    filtered = filtered.filter(e => e.protocol.toLowerCase() === options.protocol?.toLowerCase());
  }

  if (options?.status && options.status !== 'All') {
    filtered = filtered.filter(e => e.status.toLowerCase() === options.status?.toLowerCase());
  }

  if (options?.category && options.category !== 'All') {
    filtered = filtered.filter(e => e.category.toLowerCase() === options.category?.toLowerCase());
  }

  const total = filtered.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;
  const paged = filtered.slice(offset, offset + limit);

  return {
    events: paged,
    total
  };
}

export function clearAuditEvents(): void {
  auditEvents = [];
}
