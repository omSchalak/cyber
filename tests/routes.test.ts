import { describe, it, expect } from 'vitest';
import { handleApiRequest, REGISTERED_ROUTES } from '../src/server/router';
import credsData from '../generated_creds.json';

describe('Gateway API Routes & Endpoints Coverage', () => {
  it('GET /api/health returns 200 with engine statuses and inventory', async () => {
    const res = await handleApiRequest('GET', '/api/health', {}, null);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.gatewayOperator).toBe('Mansi Chalak');
    expect(res.body.cryptographicEngines.openpgp.status).toBe('active');
    expect(res.body.cryptographicEngines.smime.status).toBe('active');
    expect(res.body.registeredEndpoints.length).toBeGreaterThan(15);
  });

  it('GET /api/dashboard returns complete metrics and audit events', async () => {
    const res = await handleApiRequest('GET', '/api/dashboard', {}, null);
    expect(res.status).toBe(200);
    expect(res.body.totalOperations).toBeGreaterThan(0);
    expect(res.body.protocolDistribution).toBeDefined();
    expect(Array.isArray(res.body.recentAuditEvents)).toBe(true);
  });

  it('GET /api/keys returns public credentials without leaking private keys', async () => {
    const res = await handleApiRequest('GET', '/api/keys', {}, null);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.smimeCertificates)).toBe(true);
    expect(Array.isArray(res.body.openpgpKeys)).toBe(true);

    const jsonString = JSON.stringify(res.body);
    expect(jsonString).not.toContain('PRIVATE KEY');
  });

  it('POST /api/keys/check-recipient validates recipient protocol compatibility', async () => {
    const res = await handleApiRequest('POST', '/api/keys/check-recipient', {}, {
      email: 'bob@gateway.internal'
    });
    expect(res.status).toBe(200);
    expect(res.body.hasSmime).toBe(true);
    expect(res.body.hasOpenPgp).toBe(true);
  });

  it('POST /api/smime/inspect-certificate parses certificate PEM', async () => {
    const res = await handleApiRequest('POST', '/api/smime/inspect-certificate', {}, {
      pemCertificate: credsData.aliceSmime.certPem
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.certificate.subject.commonName).toBe('Alice Smith');
  });

  it('POST /api/gateway/process executes full 5-stage processing', async () => {
    const res = await handleApiRequest('POST', '/api/gateway/process', {}, {
      senderEmail: 'alice@gateway.internal',
      recipientEmail: 'bob@gateway.internal',
      subject: 'Quarterly Security Review',
      body: 'This is an end-to-end encrypted and signed gateway message.',
      protocol: 'auto',
      encrypt: true,
      sign: true
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stages.length).toBe(5);
    expect(res.body.outputMessage.rawPayload).toBeDefined();
    expect(res.body.deliveryNotice).toContain('Processed locally');
  });

  it('POST /api/gateway/process fails cleanly when recipient key is missing', async () => {
    const res = await handleApiRequest('POST', '/api/gateway/process', {}, {
      senderEmail: 'alice@gateway.internal',
      recipientEmail: 'unregistered_person@external.com',
      subject: 'Secret to Unregistered Recipient',
      body: 'Should fail encryption due to missing key',
      protocol: 'smime',
      encrypt: true,
      sign: true
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_RECIPIENT_CERTIFICATE');
    expect(res.body.error.details.stages[1].status).toBe('FAILED');
  });

  it('POST /api/gateway/simulate-interoperability tests all 8 scenarios', async () => {
    for (let id = 1; id <= 8; id++) {
      const res = await handleApiRequest('POST', '/api/gateway/simulate-interoperability', {}, {
        scenarioId: id
      });
      expect(res.body).toBeDefined();
      if (id <= 4) {
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('SUCCESS');
      } else {
        // Scenarios 5 to 8 are negative/failure boundary tests
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    }
  });

  it('Returns structured JSON 404 for unknown API routes', async () => {
    const res = await handleApiRequest('GET', '/api/nonexistent-route', {}, null);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.availableRoutes).toBeDefined();
  });
});
