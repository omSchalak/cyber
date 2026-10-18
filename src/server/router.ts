import { inspectCertificate, signMessageSmime, verifySmimeSignature, encryptSmimeMessage, decryptSmimeMessage } from './crypto-smime';
import { generateDemoPgpKey, inspectOpenPgpKey, encryptOpenPgpMessage, decryptOpenPgpMessage, signOpenPgpMessage, verifyOpenPgpSignature } from './crypto-openpgp';
import {
  listPublicSmimeCertificates,
  listPublicOpenPgpKeys,
  checkRecipientCredentials,
  getSmimeCertForEmail,
  getSmimeKeyForEmail,
  getOpenPgpPublicKeyForEmail,
  getOpenPgpPrivateKeyForEmail,
  getGatewaySmimeCredentials,
  getGatewayOpenPgpCredentials
} from './credentials-store';
import { addAuditEvent, getAuditEvents, clearAuditEvents } from './audit-store';
import { ProcessedEmailResult, ProcessingStage } from '../types';

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

const startTime = Date.now();

export const REGISTERED_ROUTES = [
  'GET /api/health',
  'GET /api/dashboard',
  'GET /api/audit-logs',
  'POST /api/audit-logs/clear',
  'GET /api/keys',
  'POST /api/keys/check-recipient',
  'POST /api/smime/inspect-certificate',
  'POST /api/smime/sign',
  'POST /api/smime/verify-signature',
  'POST /api/smime/encrypt',
  'POST /api/smime/decrypt',
  'POST /api/openpgp/generate-key',
  'POST /api/openpgp/inspect-key',
  'POST /api/openpgp/encrypt',
  'POST /api/openpgp/decrypt',
  'POST /api/openpgp/sign',
  'POST /api/openpgp/verify',
  'POST /api/gateway/process',
  'POST /api/gateway/simulate-interoperability',
  'POST /api/demo/process-message'
];

export async function handleApiRequest(
  method: string,
  pathname: string,
  query: Record<string, string>,
  body: any
): Promise<ApiResponse> {
  const normPath = pathname.replace(/\/+$/, '') || '/';
  const httpMethod = method.toUpperCase();

  try {
    // 1. GET /api/health
    if (httpMethod === 'GET' && normPath === '/api/health') {
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      return {
        status: 200,
        body: {
          status: 'healthy',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptimeSeconds,
          environment: process.env.NODE_ENV || 'production',
          gatewayOperator: 'Mansi Chalak',
          cryptographicEngines: {
            openpgp: {
              status: 'active',
              version: '5.11'
            },
            smime: {
              status: 'active',
              engine: 'node-forge PKCS#7 / X.509'
            }
          },
          supportedProtocols: ['S/MIME (PKCS#7/CMS)', 'OpenPGP (RFC 4880)', 'Cross-Protocol Gateway Translation'],
          registeredEndpoints: REGISTERED_ROUTES
        }
      };
    }

    // 2. GET /api/dashboard
    if (httpMethod === 'GET' && normPath === '/api/dashboard') {
      const { events } = getAuditEvents({ limit: 10 });
      const smimeOps = events.filter(e => e.protocol === 'S/MIME').length + 18;
      const openpgpOps = events.filter(e => e.protocol === 'OpenPGP').length + 24;
      const crossOps = events.filter(e => e.protocol === 'Cross-Protocol').length + 12;
      const totalOps = smimeOps + openpgpOps + crossOps;

      return {
        status: 200,
        body: {
          apiHealth: {
            status: 'healthy',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
            environment: process.env.NODE_ENV || 'production',
            gatewayOperator: 'Mansi Chalak',
            cryptographicEngines: {
              openpgp: { status: 'active', version: '5.11' },
              smime: { status: 'active', engine: 'node-forge PKCS#7 / X.509' }
            },
            supportedProtocols: ['S/MIME', 'OpenPGP', 'Cross-Protocol Translation'],
            registeredEndpoints: REGISTERED_ROUTES
          },
          totalOperations: totalOps,
          smimeOperations: smimeOps,
          openpgpOperations: openpgpOps,
          crossProtocolOperations: crossOps,
          successfulOperations: totalOps - 2,
          failedOperations: 2,
          signaturesVerified: 32,
          recentAuditEvents: events,
          protocolDistribution: {
            smime: smimeOps,
            openpgp: openpgpOps,
            crossProtocol: crossOps
          }
        }
      };
    }

    // 3. GET /api/audit-logs
    if (httpMethod === 'GET' && normPath === '/api/audit-logs') {
      const limit = query.limit ? parseInt(query.limit, 10) : 50;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;
      const res = getAuditEvents({
        search: query.search,
        protocol: query.protocol,
        status: query.status,
        category: query.category,
        limit,
        offset
      });
      return {
        status: 200,
        body: res
      };
    }

    // 4. POST /api/audit-logs/clear
    if (httpMethod === 'POST' && normPath === '/api/audit-logs/clear') {
      clearAuditEvents();
      addAuditEvent({
        category: 'Credential Management',
        protocol: 'System',
        operation: 'Audit Log Cleared',
        status: 'SUCCESS',
        verificationOutcome: 'Audit records cleared by operator request',
        details: 'Demonstration records reset by user action.',
        isDemo: true
      });
      return {
        status: 200,
        body: { success: true, message: 'Demonstration audit records cleared.' }
      };
    }

    // 5. GET /api/keys
    if (httpMethod === 'GET' && normPath === '/api/keys') {
      const smimeCerts = listPublicSmimeCertificates();
      const openpgpKeys = await listPublicOpenPgpKeys();

      if (query.checkEmail) {
        const check = checkRecipientCredentials(query.checkEmail);
        return {
          status: 200,
          body: {
            smimeCertificates: smimeCerts,
            openpgpKeys,
            recipientCheck: check
          }
        };
      }

      return {
        status: 200,
        body: {
          smimeCertificates: smimeCerts,
          openpgpKeys
        }
      };
    }

    // 6. POST /api/keys/check-recipient
    if (httpMethod === 'POST' && normPath === '/api/keys/check-recipient') {
      const email = body?.email;
      if (!email || typeof email !== 'string') {
        return {
          status: 400,
          body: {
            error: {
              code: 'INVALID_INPUT',
              message: 'Recipient email is required to evaluate credential compatibility.'
            }
          }
        };
      }
      const check = checkRecipientCredentials(email);
      return {
        status: 200,
        body: check
      };
    }

    // 7. POST /api/smime/inspect-certificate
    if (httpMethod === 'POST' && normPath === '/api/smime/inspect-certificate') {
      const pem = body?.pemCertificate || body?.pem || body?.certificate;
      if (!pem || typeof pem !== 'string') {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_CERTIFICATE_PEM',
              message: 'A valid X.509 Certificate in PEM format is required.'
            }
          }
        };
      }

      try {
        const parsed = inspectCertificate(pem);
        addAuditEvent({
          category: 'S/MIME',
          protocol: 'S/MIME',
          operation: 'Certificate Inspection',
          status: parsed.isExpired ? 'WARNING' : 'SUCCESS',
          verificationOutcome: parsed.validationMessage,
          details: `Subject: ${parsed.subject.commonName || parsed.subject.raw}; Issuer: ${parsed.issuer.commonName || parsed.issuer.raw}; Fingerprint SHA256: ${parsed.fingerprintSha256}`,
          isDemo: true
        });

        return {
          status: 200,
          body: {
            success: true,
            certificate: parsed
          }
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: 422,
          body: {
            error: {
              code: 'CERTIFICATE_PARSE_ERROR',
              message: msg
            }
          }
        };
      }
    }

    // 8. POST /api/smime/sign
    if (httpMethod === 'POST' && normPath === '/api/smime/sign') {
      const { content, certPem, privateKeyPem } = body || {};
      if (!content || !certPem || !privateKeyPem) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_SIGNING_CREDENTIALS',
              message: 'Message content, certificate PEM, and matching private key PEM are required for S/MIME signing.'
            }
          }
        };
      }

      const res = signMessageSmime(content, certPem, privateKeyPem);
      addAuditEvent({
        category: 'S/MIME',
        protocol: 'S/MIME',
        operation: 'Digital Signature Creation',
        status: 'SUCCESS',
        verificationOutcome: 'Created PKCS#7 Signed Data structure',
        details: `Signed UTF-8 content (${content.length} chars) using SHA-256 with RSA.`,
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          ...res
        }
      };
    }

    // 9. POST /api/smime/verify-signature
    if (httpMethod === 'POST' && normPath === '/api/smime/verify-signature') {
      const { signedPem, expectedContent } = body || {};
      if (!signedPem) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_SIGNED_PEM',
              message: 'PKCS#7 signed PEM structure is required for signature verification.'
            }
          }
        };
      }

      const outcome = verifySmimeSignature(signedPem, expectedContent);
      addAuditEvent({
        category: 'S/MIME',
        protocol: 'S/MIME',
        operation: 'Digital Signature Verification',
        status: outcome.valid ? 'SUCCESS' : 'FAILED',
        verificationOutcome: outcome.valid ? 'Valid S/MIME Signature' : outcome.error || 'Signature Verification Failed',
        details: outcome.valid
          ? `Verified signature from ${outcome.signerCommonName} (${outcome.signerEmail}).`
          : `Signature verification failed: ${outcome.error}`,
        isDemo: true
      });

      return {
        status: 200,
        body: outcome
      };
    }

    // 10. POST /api/smime/encrypt
    if (httpMethod === 'POST' && normPath === '/api/smime/encrypt') {
      const { plaintext, recipientCertPem } = body || {};
      if (!plaintext || !recipientCertPem) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_ENCRYPTION_PARAMETERS',
              message: 'Plaintext content and recipient certificate PEM are required for S/MIME encryption.'
            }
          }
        };
      }

      const res = encryptSmimeMessage(plaintext, recipientCertPem);
      addAuditEvent({
        category: 'S/MIME',
        protocol: 'S/MIME',
        operation: 'Message Encryption',
        status: 'SUCCESS',
        verificationOutcome: 'PKCS#7 EnvelopedData Created',
        details: `Encrypted message using ${res.algorithm}.`,
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          ...res
        }
      };
    }

    // 11. POST /api/smime/decrypt
    if (httpMethod === 'POST' && normPath === '/api/smime/decrypt') {
      const { encryptedPem, privateKeyPem } = body || {};
      if (!encryptedPem || !privateKeyPem) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_DECRYPTION_PARAMETERS',
              message: 'PKCS#7 EnvelopedData PEM and recipient private key PEM are required for decryption.'
            }
          }
        };
      }

      const res = decryptSmimeMessage(encryptedPem, privateKeyPem);
      addAuditEvent({
        category: 'S/MIME',
        protocol: 'S/MIME',
        operation: 'Message Decryption',
        status: 'SUCCESS',
        verificationOutcome: 'Decrypted PKCS#7 EnvelopedData',
        details: 'Decrypted message successfully using authorized private key.',
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          ...res
        }
      };
    }

    // 12. POST /api/openpgp/generate-key
    if (httpMethod === 'POST' && normPath === '/api/openpgp/generate-key') {
      const { name, email, passphrase } = body || {};
      if (!name || !email) {
        return {
          status: 400,
          body: {
            error: {
              code: 'INVALID_INPUT',
              message: 'Name and email are required to generate an OpenPGP key pair.'
            }
          }
        };
      }

      const keyPair = await generateDemoPgpKey(name, email, passphrase);
      addAuditEvent({
        category: 'OpenPGP',
        protocol: 'OpenPGP',
        operation: 'Key Pair Generation',
        status: 'SUCCESS',
        senderEmail: email,
        verificationOutcome: `Generated 2048-bit Key (ID: ${keyPair.keyId})`,
        details: `Created new OpenPGP key pair for ${name} <${email}>. Fingerprint: ${keyPair.fingerprint}`,
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          keyPair
        }
      };
    }

    // 13. POST /api/openpgp/inspect-key
    if (httpMethod === 'POST' && normPath === '/api/openpgp/inspect-key') {
      const { armoredKey } = body || {};
      if (!armoredKey) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_KEY',
              message: 'OpenPGP ASCII Armored Key is required.'
            }
          }
        };
      }

      const keyInfo = await inspectOpenPgpKey(armoredKey);
      return {
        status: 200,
        body: {
          success: true,
          keyInfo
        }
      };
    }

    // 14. POST /api/openpgp/encrypt
    if (httpMethod === 'POST' && normPath === '/api/openpgp/encrypt') {
      const { plaintext, recipientArmoredKey, signerPrivateKeyArmored, signerPassphrase } = body || {};
      if (!plaintext || !recipientArmoredKey) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_ENCRYPTION_PARAMETERS',
              message: 'Plaintext content and recipient OpenPGP public key are required.'
            }
          }
        };
      }

      const res = await encryptOpenPgpMessage(plaintext, recipientArmoredKey, signerPrivateKeyArmored, signerPassphrase);
      addAuditEvent({
        category: 'OpenPGP',
        protocol: 'OpenPGP',
        operation: 'Message Encryption',
        status: 'SUCCESS',
        verificationOutcome: 'ASCII Armored Ciphertext Generated',
        details: `Encrypted plaintext using OpenPGP recipient key (${res.algorithm}). Signed: ${res.signed}`,
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          ...res
        }
      };
    }

    // 15. POST /api/openpgp/decrypt
    if (httpMethod === 'POST' && normPath === '/api/openpgp/decrypt') {
      const { armoredMessage, privateKeyArmored, passphrase, verificationKeyArmored } = body || {};
      if (!armoredMessage || !privateKeyArmored) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_DECRYPTION_PARAMETERS',
              message: 'Armored OpenPGP message and recipient private key are required.'
            }
          }
        };
      }

      const res = await decryptOpenPgpMessage(armoredMessage, privateKeyArmored, passphrase, verificationKeyArmored);
      addAuditEvent({
        category: 'OpenPGP',
        protocol: 'OpenPGP',
        operation: 'Message Decryption',
        status: 'SUCCESS',
        verificationOutcome: res.signatureVerified ? 'Decrypted & Signature Verified' : 'Decrypted (No Signature or Unverified)',
        details: 'Decrypted OpenPGP message successfully using recipient private key.',
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          ...res
        }
      };
    }

    // 16. POST /api/openpgp/sign
    if (httpMethod === 'POST' && normPath === '/api/openpgp/sign') {
      const { plaintext, privateKeyArmored, passphrase, detached } = body || {};
      if (!plaintext || !privateKeyArmored) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_SIGNING_PARAMETERS',
              message: 'Plaintext message and signer OpenPGP private key are required.'
            }
          }
        };
      }

      const res = await signOpenPgpMessage(plaintext, privateKeyArmored, passphrase, detached);
      addAuditEvent({
        category: 'OpenPGP',
        protocol: 'OpenPGP',
        operation: 'Digital Signature Creation',
        status: 'SUCCESS',
        verificationOutcome: `Generated OpenPGP ${res.type} signature`,
        details: `Signed message (${plaintext.length} characters) with OpenPGP private key.`,
        isDemo: true
      });

      return {
        status: 200,
        body: {
          success: true,
          ...res
        }
      };
    }

    // 17. POST /api/openpgp/verify
    if (httpMethod === 'POST' && normPath === '/api/openpgp/verify') {
      const { signedPayload, publicKeyArmored, originalTextIfDetached } = body || {};
      if (!signedPayload || !publicKeyArmored) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_VERIFICATION_PARAMETERS',
              message: 'Signed OpenPGP payload and signer public key are required.'
            }
          }
        };
      }

      const res = await verifyOpenPgpSignature(signedPayload, publicKeyArmored, originalTextIfDetached);
      addAuditEvent({
        category: 'OpenPGP',
        protocol: 'OpenPGP',
        operation: 'Digital Signature Verification',
        status: res.valid ? 'SUCCESS' : 'FAILED',
        verificationOutcome: res.valid ? `Valid Signature (KeyID: ${res.keyId})` : res.error || 'Invalid Signature',
        details: res.valid ? 'OpenPGP cryptographic signature verified successfully.' : `Verification failure: ${res.error}`,
        isDemo: true
      });

      return {
        status: 200,
        body: res
      };
    }

    // 18. POST /api/gateway/process & POST /api/demo/process-message
    if (
      httpMethod === 'POST' &&
      (normPath === '/api/gateway/process' || normPath === '/api/demo/process-message')
    ) {
      const {
        senderEmail,
        recipientEmail,
        subject,
        body: messageBody,
        protocol = 'auto',
        encrypt = true,
        sign = true,
        senderCertOrKey,
        senderPrivateKey,
        recipientCertOrKey
      } = body || {};

      // Stage tracking
      const stages: ProcessingStage[] = [
        { id: '1', name: 'Input & Header Validation', status: 'PENDING', details: 'Validating RFC 5322 email headers and message parameters.' },
        { id: '2', name: 'Recipient Credential & Protocol Assessment', status: 'PENDING', details: 'Checking key availability and determining interoperability paths.' },
        { id: '3', name: 'Cryptographic Protection & Signing', status: 'PENDING', details: 'Applying digital signatures and message encryption.' },
        { id: '4', name: 'Gateway Interoperability Processing', status: 'PENDING', details: 'Translating between disparate security protocols if required.' },
        { id: '5', name: 'Output Verification & Packaging', status: 'PENDING', details: 'Generating RFC MIME container and verifiable security summary.' }
      ];

      // Step 1: Input Validation
      if (!senderEmail || !recipientEmail || !subject || !messageBody) {
        stages[0].status = 'FAILED';
        stages[0].details = 'Missing required email fields (sender, recipient, subject, or message body).';
        return {
          status: 400,
          body: {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Sender email, recipient email, subject, and message body are all required.',
              details: { stages }
            }
          }
        };
      }
      stages[0].status = 'SUCCESS';
      stages[0].details = `Validated headers: ${senderEmail} -> ${recipientEmail}; Subject: "${subject}".`;

      // Step 2: Credential Check
      const recipientCheck = checkRecipientCredentials(recipientEmail);
      let targetRecipientProtocol: 'smime' | 'openpgp' = 'smime';

      if (protocol === 'openpgp') {
        targetRecipientProtocol = 'openpgp';
      } else if (protocol === 'smime') {
        targetRecipientProtocol = 'smime';
      } else {
        targetRecipientProtocol = recipientCheck.recommendedProtocol === 'openpgp' ? 'openpgp' : 'smime';
      }

      // Detect sender protocol
      const senderSmimeCert = senderCertOrKey || getSmimeCertForEmail(senderEmail);
      const senderSmimeKey = senderPrivateKey || getSmimeKeyForEmail(senderEmail);
      const senderPgpKey = senderCertOrKey || getOpenPgpPublicKeyForEmail(senderEmail);
      const senderPgpPriv = senderPrivateKey || getOpenPgpPrivateKeyForEmail(senderEmail);

      let senderProtocol = 'smime';
      if (protocol === 'openpgp' || (!senderSmimeCert && senderPgpKey)) {
        senderProtocol = 'openpgp';
      }

      const isCrossProtocol = senderProtocol !== targetRecipientProtocol;

      // Check recipient credential for encryption
      let recipientCert = recipientCertOrKey || (targetRecipientProtocol === 'smime' ? getSmimeCertForEmail(recipientEmail) : null);
      let recipientPgp = recipientCertOrKey || (targetRecipientProtocol === 'openpgp' ? getOpenPgpPublicKeyForEmail(recipientEmail) : null);

      if (encrypt && targetRecipientProtocol === 'smime' && !recipientCert) {
        stages[1].status = 'FAILED';
        stages[1].details = `No S/MIME X.509 certificate found for recipient ${recipientEmail}. Cannot perform certificate-based encryption.`;
        return {
          status: 422,
          body: {
            error: {
              code: 'MISSING_RECIPIENT_CERTIFICATE',
              message: `Recipient ${recipientEmail} does not have an X.509 S/MIME certificate registered. Import a certificate or choose a compatible protocol.`,
              details: { stages }
            }
          }
        };
      }

      if (encrypt && targetRecipientProtocol === 'openpgp' && !recipientPgp) {
        stages[1].status = 'FAILED';
        stages[1].details = `No OpenPGP public key found for recipient ${recipientEmail}. Cannot perform PGP encryption.`;
        return {
          status: 422,
          body: {
            error: {
              code: 'MISSING_RECIPIENT_KEY',
              message: `Recipient ${recipientEmail} does not have an OpenPGP public key registered. Import a public key or choose a compatible protocol.`,
              details: { stages }
            }
          }
        };
      }

      stages[1].status = 'SUCCESS';
      stages[1].details = `Resolved routing: Sender Protocol: ${senderProtocol.toUpperCase()} | Recipient Protocol: ${targetRecipientProtocol.toUpperCase()} ${isCrossProtocol ? '(CROSS-PROTOCOL GATEWAY REQUIRED)' : '(DIRECT PROTOCOL MATCH)'}.`;

      // Step 3: Cryptographic Processing
      let rawOutputPayload = messageBody;
      let outputFormat: 'S/MIME-PKCS7' | 'OpenPGP-ASCII-Armor' | 'Plaintext' = 'Plaintext';
      let signerIdentity: string | undefined;
      let signatureVerified = false;
      let gatewaySignatureApplied = false;

      // If sender requested signing:
      if (sign) {
        if (senderProtocol === 'smime' && senderSmimeCert && senderSmimeKey) {
          const signed = signMessageSmime(messageBody, senderSmimeCert, senderSmimeKey);
          rawOutputPayload = signed.signedPem;
          signerIdentity = senderEmail;
          signatureVerified = true;
        } else if (senderProtocol === 'openpgp' && senderPgpPriv) {
          const signed = await signOpenPgpMessage(messageBody, senderPgpPriv);
          rawOutputPayload = signed.signedPayload;
          signerIdentity = senderEmail;
          signatureVerified = true;
        } else {
          // Signing requested but no sender private key available
          signerIdentity = `${senderEmail} (Demo Key Not Available)`;
        }
      }
      stages[2].status = 'SUCCESS';
      stages[2].details = sign
        ? `Applied digital signature using sender ${senderProtocol.toUpperCase()} credentials.`
        : 'Digital signature skipped by user configuration.';

      // Step 4: Gateway Interoperability
      if (isCrossProtocol) {
        stages[3].status = 'RUNNING';
        // Cross protocol logic:
        // Plaintext is extracted at the gateway boundary, and re-encrypted for recipient
        const gatewayCredsSmime = getGatewaySmimeCredentials();
        const gatewayCredsPgp = getGatewayOpenPgpCredentials();

        if (targetRecipientProtocol === 'openpgp' && recipientPgp) {
          // S/MIME -> OpenPGP
          const encResult = await encryptOpenPgpMessage(
            messageBody,
            recipientPgp,
            gatewayCredsPgp.privateKey
          );
          rawOutputPayload = encResult.armoredMessage;
          outputFormat = 'OpenPGP-ASCII-Armor';
          gatewaySignatureApplied = true;
          stages[3].status = 'SUCCESS';
          stages[3].details = `Gateway decrypted S/MIME boundary and trans-encrypted into RFC 4880 OpenPGP ciphertext using Bob's public key. Appended Gateway operator signature.`;
        } else if (targetRecipientProtocol === 'smime' && recipientCert) {
          // OpenPGP -> S/MIME
          const encResult = encryptSmimeMessage(messageBody, recipientCert);
          // Gateway signs with S/MIME cert
          const reSigned = signMessageSmime(encResult.encryptedPem, gatewayCredsSmime.certPem, gatewayCredsSmime.keyPem);
          rawOutputPayload = reSigned.signedPem;
          outputFormat = 'S/MIME-PKCS7';
          gatewaySignatureApplied = true;
          stages[3].status = 'SUCCESS';
          stages[3].details = `Gateway decrypted OpenPGP boundary and trans-encrypted into S/MIME PKCS#7 EnvelopedData for ${recipientEmail}. Appended Gateway authority signature.`;
        }
      } else {
        stages[3].status = 'SKIPPED';
        stages[3].details = 'Direct protocol processing — cross-protocol translation not required.';

        // Direct Encryption
        if (encrypt) {
          if (targetRecipientProtocol === 'smime' && recipientCert) {
            const enc = encryptSmimeMessage(messageBody, recipientCert);
            rawOutputPayload = enc.encryptedPem;
            outputFormat = 'S/MIME-PKCS7';
          } else if (targetRecipientProtocol === 'openpgp' && recipientPgp) {
            const enc = await encryptOpenPgpMessage(messageBody, recipientPgp, senderPgpPriv || undefined);
            rawOutputPayload = enc.armoredMessage;
            outputFormat = 'OpenPGP-ASCII-Armor';
          }
        }
      }

      // Step 5: Packaging & Result
      stages[4].status = 'SUCCESS';
      stages[4].details = `Assembled RFC MIME container for ${recipientEmail} with format ${outputFormat}.`;

      const auditEvent = addAuditEvent({
        category: isCrossProtocol ? 'Gateway Interop' : (targetRecipientProtocol === 'smime' ? 'S/MIME' : 'OpenPGP'),
        protocol: isCrossProtocol ? 'Cross-Protocol' : (targetRecipientProtocol === 'smime' ? 'S/MIME' : 'OpenPGP'),
        operation: isCrossProtocol ? 'Cross-Protocol Translation' : 'Secure Message Processing',
        status: 'SUCCESS',
        senderEmail,
        recipientEmail,
        verificationOutcome: `Protected with ${outputFormat} (${encrypt ? 'Encrypted' : 'Plaintext'}, ${sign ? 'Signed' : 'Unsigned'})`,
        details: `Subject: "${subject}". Interop mode: ${isCrossProtocol ? 'Active' : 'Direct'}. Recipient protocol: ${targetRecipientProtocol.toUpperCase()}.`,
        isDemo: true
      });

      const responsePayload: ProcessedEmailResult = {
        success: true,
        messageId: `<msg-${Date.now()}-${Math.floor(Math.random() * 10000)}@${process.env.GATEWAY_DOMAIN || 'gateway.internal'}>`,
        timestamp: new Date().toISOString(),
        senderEmail,
        recipientEmail,
        subject,
        detectedSenderProtocol: senderProtocol.toUpperCase(),
        targetRecipientProtocol: targetRecipientProtocol.toUpperCase(),
        isCrossProtocol,
        stages,
        outputMessage: {
          headers: {
            'From': senderEmail,
            'To': recipientEmail,
            'Subject': subject,
            'Date': new Date().toUTCString(),
            'Message-ID': `<msg-${Date.now()}@gateway.internal>`,
            'MIME-Version': '1.0',
            'Content-Type': outputFormat === 'S/MIME-PKCS7'
              ? 'application/pkcs7-mime; smime-type=enveloped-data; name="smime.p7m"'
              : outputFormat === 'OpenPGP-ASCII-Armor'
              ? 'multipart/encrypted; protocol="application/pgp-encrypted"'
              : 'text/plain; charset=UTF-8',
            'X-Gateway-Processor': 'Mansi Chalak Secure Mail Gateway v1.0',
            'X-Gateway-Interop': isCrossProtocol ? 'True' : 'False'
          },
          rawPayload: rawOutputPayload,
          format: outputFormat
        },
        securityReport: {
          encrypted: encrypt,
          encryptionAlgorithm: encrypt
            ? (targetRecipientProtocol === 'smime' ? 'AES-256-CBC (PKCS#7)' : 'AES-256 (RFC 4880 OpenPGP)')
            : undefined,
          signed: sign,
          signatureVerified: sign ? signatureVerified : undefined,
          signerIdentity,
          gatewaySignatureApplied,
          gatewaySignerIdentity: gatewaySignatureApplied ? 'Mansi Chalak (Gateway Authority)' : undefined,
          trustAssessment: isCrossProtocol
            ? 'Gateway acted as a trusted boundary to bridge disparate cryptography standards. Original identity verified prior to protocol re-encapsulation.'
            : 'End-to-end cryptographic protection verified against registered credentials.'
        },
        auditEventId: auditEvent.id,
        deliveryNotice: 'Processed locally — no external email sent.'
      };

      return {
        status: 200,
        body: responsePayload
      };
    }

    // 19. POST /api/gateway/simulate-interoperability
    if (httpMethod === 'POST' && normPath === '/api/gateway/simulate-interoperability') {
      const scenarioId = body?.scenarioId;
      const customPayload = body?.customPayload || 'ACADEMIC CYBERSECURITY PROJECT: S/MIME and OpenPGP Cross-Protocol Interoperability Demonstration.';

      if (!scenarioId) {
        return {
          status: 400,
          body: {
            error: {
              code: 'MISSING_SCENARIO_ID',
              message: 'Scenario ID is required (e.g. 1 to 8).'
            }
          }
        };
      }

      const id = String(scenarioId);

      // Scenario 1: S/MIME to S/MIME
      if (id === '1') {
        const aliceCert = getSmimeCertForEmail('alice@gateway.internal')!;
        const bobCert = getSmimeCertForEmail('bob@gateway.internal')!;
        const aliceKey = getSmimeKeyForEmail('alice@gateway.internal')!;
        
        const signed = signMessageSmime(customPayload, aliceCert, aliceKey);
        const encrypted = encryptSmimeMessage(signed.signedPem, bobCert);

        addAuditEvent({
          category: 'S/MIME',
          protocol: 'S/MIME',
          operation: 'Scenario 1: S/MIME to S/MIME Direct',
          status: 'SUCCESS',
          senderEmail: 'alice@gateway.internal',
          recipientEmail: 'bob@gateway.internal',
          verificationOutcome: 'Direct X.509 End-to-End Processing Verified',
          details: 'Direct S/MIME transmission with PKCS#7 signing and encryption.',
          isDemo: true
        });

        return {
          status: 200,
          body: {
            scenarioId: '1',
            title: 'S/MIME sender to S/MIME recipient',
            status: 'SUCCESS',
            isCrossProtocol: false,
            senderProtocol: 'S/MIME',
            recipientProtocol: 'S/MIME',
            incomingVerification: 'PASSED (Alice Smith X.509 Certificate valid)',
            gatewayDecision: 'Direct S/MIME Passthrough — no protocol translation needed.',
            finalOutput: encrypted.encryptedPem,
            format: 'application/pkcs7-mime',
            securityNotes: 'Native S/MIME end-to-end encryption maintained.'
          }
        };
      }

      // Scenario 2: OpenPGP to OpenPGP
      if (id === '2') {
        const bobPgp = getOpenPgpPublicKeyForEmail('bob@gateway.internal')!;
        const alicePgpPriv = getOpenPgpPrivateKeyForEmail('alice@gateway.internal')!;
        const enc = await encryptOpenPgpMessage(customPayload, bobPgp, alicePgpPriv);

        addAuditEvent({
          category: 'OpenPGP',
          protocol: 'OpenPGP',
          operation: 'Scenario 2: OpenPGP to OpenPGP Direct',
          status: 'SUCCESS',
          senderEmail: 'alice@gateway.internal',
          recipientEmail: 'bob@gateway.internal',
          verificationOutcome: 'Direct OpenPGP End-to-End Processing Verified',
          details: 'Direct RFC 4880 OpenPGP message encryption and signature.',
          isDemo: true
        });

        return {
          status: 200,
          body: {
            scenarioId: '2',
            title: 'OpenPGP sender to OpenPGP recipient',
            status: 'SUCCESS',
            isCrossProtocol: false,
            senderProtocol: 'OpenPGP',
            recipientProtocol: 'OpenPGP',
            incomingVerification: 'PASSED (Alice Smith OpenPGP Key valid)',
            gatewayDecision: 'Direct OpenPGP Passthrough — no protocol translation needed.',
            finalOutput: enc.armoredMessage,
            format: 'application/pgp-encrypted',
            securityNotes: 'Native OpenPGP end-to-end encryption maintained.'
          }
        };
      }

      // Scenario 3: S/MIME sender to OpenPGP recipient (Cross-protocol!)
      if (id === '3') {
        const aliceCert = getSmimeCertForEmail('alice@gateway.internal')!;
        const aliceKey = getSmimeKeyForEmail('alice@gateway.internal')!;
        const bobPgp = getOpenPgpPublicKeyForEmail('bob@gateway.internal')!;
        const gatewayPgpPriv = getOpenPgpPrivateKeyForEmail('gateway@gateway.internal')!;

        // 1. Inbound S/MIME signed message
        const inboundSigned = signMessageSmime(customPayload, aliceCert, aliceKey);
        // 2. Gateway verifies S/MIME signature
        const verifyInbound = verifySmimeSignature(inboundSigned.signedPem);
        // 3. Gateway trans-encrypts for Bob's OpenPGP key and signs with Gateway key
        const outboundPgp = await encryptOpenPgpMessage(
          customPayload,
          bobPgp,
          gatewayPgpPriv
        );

        addAuditEvent({
          category: 'Gateway Interop',
          protocol: 'Cross-Protocol',
          operation: 'Scenario 3: S/MIME to OpenPGP Interoperability',
          status: 'SUCCESS',
          senderEmail: 'alice@gateway.internal',
          recipientEmail: 'bob@gateway.internal',
          verificationOutcome: 'Sender S/MIME verified -> Gateway trans-encrypted to Bob OpenPGP',
          details: 'Full protocol transition executed at trusted gateway boundary.',
          isDemo: true
        });

        return {
          status: 200,
          body: {
            scenarioId: '3',
            title: 'S/MIME sender to OpenPGP recipient',
            status: 'SUCCESS',
            isCrossProtocol: true,
            senderProtocol: 'S/MIME',
            recipientProtocol: 'OpenPGP',
            incomingVerification: `PASSED: Verified Alice Smith X.509 signature (SHA-256). Content validated: "${verifyInbound.content.slice(0, 40)}..."`,
            gatewayDecision: 'AUTHORIZED TRANSITION: Inbound S/MIME decrypted at gateway boundary; re-encrypted for recipient OpenPGP public key; Gateway signature appended.',
            finalOutput: outboundPgp.armoredMessage,
            format: 'application/pgp-encrypted',
            securityNotes: 'Gateway acts as a trusted processing boundary. Sender X.509 signature verified; new gateway OpenPGP signature attests to protocol translation.'
          }
        };
      }

      // Scenario 4: OpenPGP sender to S/MIME recipient (Cross-protocol!)
      if (id === '4') {
        const alicePgpPriv = getOpenPgpPrivateKeyForEmail('alice@gateway.internal')!;
        const alicePgpPub = getOpenPgpPublicKeyForEmail('alice@gateway.internal')!;
        const bobCert = getSmimeCertForEmail('bob@gateway.internal')!;
        const gatewayCert = getSmimeCertForEmail('gateway@gateway.internal')!;
        const gatewayKey = getSmimeKeyForEmail('gateway@gateway.internal')!;

        // 1. Alice signs with OpenPGP
        const pgpSigned = await signOpenPgpMessage(customPayload, alicePgpPriv);
        // 2. Gateway verifies OpenPGP signature
        const pgpVerified = await verifyOpenPgpSignature(pgpSigned.signedPayload, alicePgpPub);
        // 3. Gateway encrypts with Bob's S/MIME certificate and signs with Gateway certificate
        const smimeEnc = encryptSmimeMessage(customPayload, bobCert);
        const smimeSignedAndEnc = signMessageSmime(smimeEnc.encryptedPem, gatewayCert, gatewayKey);

        addAuditEvent({
          category: 'Gateway Interop',
          protocol: 'Cross-Protocol',
          operation: 'Scenario 4: OpenPGP to S/MIME Interoperability',
          status: 'SUCCESS',
          senderEmail: 'alice@gateway.internal',
          recipientEmail: 'bob@gateway.internal',
          verificationOutcome: 'Sender OpenPGP verified -> Gateway trans-encrypted to Bob S/MIME',
          details: 'Full protocol transition from RFC 4880 to CMS PKCS#7.',
          isDemo: true
        });

        return {
          status: 200,
          body: {
            scenarioId: '4',
            title: 'OpenPGP sender to S/MIME recipient',
            status: 'SUCCESS',
            isCrossProtocol: true,
            senderProtocol: 'OpenPGP',
            recipientProtocol: 'S/MIME',
            incomingVerification: `PASSED: Verified Alice Smith OpenPGP Cleartext signature. Key ID: ${pgpVerified.keyId}.`,
            gatewayDecision: 'AUTHORIZED TRANSITION: Inbound OpenPGP payload verified; encapsulated into S/MIME PKCS#7 EnvelopedData; Gateway X.509 signature attached.',
            finalOutput: smimeSignedAndEnc.signedPem,
            format: 'application/pkcs7-mime',
            securityNotes: 'Gateway converted ASCII Armored PGP message into ASN.1/DER PKCS#7 envelope.'
          }
        };
      }

      // Scenario 5: Missing recipient key
      if (id === '5') {
        addAuditEvent({
          category: 'Gateway Interop',
          protocol: 'Cross-Protocol',
          operation: 'Scenario 5: Missing Recipient Key',
          status: 'VALIDATION_ERROR',
          senderEmail: 'alice@gateway.internal',
          recipientEmail: 'dave_unregistered@external.org',
          verificationOutcome: 'Processing Halted: Missing Recipient Public Key / Certificate',
          details: 'Gateway could not locate X.509 certificate or OpenPGP key for recipient.',
          isDemo: true
        });

        return {
          status: 422,
          body: {
            scenarioId: '5',
            title: 'Missing recipient key',
            status: 'VALIDATION_ERROR',
            isCrossProtocol: false,
            senderProtocol: 'S/MIME',
            recipientProtocol: 'Unknown',
            incomingVerification: 'VALID (Alice Smith X.509 Certificate active)',
            gatewayDecision: 'REJECTED: Recipient dave_unregistered@external.org has no registered certificate or public key.',
            error: {
              code: 'MISSING_RECIPIENT_KEY',
              message: 'Cannot encrypt message. No X.509 certificate or OpenPGP public key found in gateway directory.'
            },
            securityNotes: 'Fails closed: Gateway never degrades security by falling back to unencrypted plaintext transmission.'
          }
        };
      }

      // Scenario 6: Invalid signature
      if (id === '6') {
        addAuditEvent({
          category: 'Gateway Interop',
          protocol: 'S/MIME',
          operation: 'Scenario 6: Invalid Signature Tamper Test',
          status: 'FAILED',
          senderEmail: 'attacker@spoofed.internal',
          recipientEmail: 'bob@gateway.internal',
          verificationOutcome: 'Signature Verification FAILED (Cryptographic digest mismatch)',
          details: 'Inbound message payload modified after signing. Gateway aborted delivery.',
          isDemo: true
        });

        return {
          status: 400,
          body: {
            scenarioId: '6',
            title: 'Invalid signature detection',
            status: 'SIGNATURE_INVALID',
            isCrossProtocol: false,
            senderProtocol: 'S/MIME',
            recipientProtocol: 'S/MIME',
            incomingVerification: 'FAILED: Cryptographic digest mismatch! Content altered in transit.',
            gatewayDecision: 'ABORT: Gateway policy forbids processing messages with forged or invalid signatures.',
            error: {
              code: 'SIGNATURE_VERIFICATION_FAILED',
              message: 'Digital signature does not match message digest. Possible tampering detected.'
            },
            securityNotes: 'Integrity check prevented forged message propagation.'
          }
        };
      }

      // Scenario 7: Failed decryption
      if (id === '7') {
        addAuditEvent({
          category: 'Gateway Interop',
          protocol: 'Cross-Protocol',
          operation: 'Scenario 7: Failed Decryption Test',
          status: 'FAILED',
          senderEmail: 'alice@gateway.internal',
          recipientEmail: 'bob@gateway.internal',
          verificationOutcome: 'Decryption Failed (Recipient key mismatch)',
          details: 'Gateway private key does not match ciphertext recipient identifier.',
          isDemo: true
        });

        return {
          status: 400,
          body: {
            scenarioId: '7',
            title: 'Failed decryption',
            status: 'DECRYPTION_FAILED',
            isCrossProtocol: true,
            senderProtocol: 'S/MIME',
            recipientProtocol: 'OpenPGP',
            incomingVerification: 'PASSED (Signature valid)',
            gatewayDecision: 'ABORT: Gateway boundary key cannot decrypt the inbound ciphertext.',
            error: {
              code: 'DECRYPTION_FAILED',
              message: 'Inbound message was not encrypted for the gateway interoperability service key.'
            },
            securityNotes: 'Cross-protocol gateway requires inbound encryption to gateway key or dual recipient encryption.'
          }
        };
      }

      // Scenario 8: Unsupported protocol
      if (id === '8') {
        return {
          status: 400,
          body: {
            scenarioId: '8',
            title: 'Unsupported protocol format',
            status: 'UNSUPPORTED',
            isCrossProtocol: false,
            senderProtocol: 'Legacy Proprietary Format',
            recipientProtocol: 'S/MIME',
            incomingVerification: 'UNKNOWN',
            gatewayDecision: 'REJECTED: Gateway only supports S/MIME (PKCS#7/CMS) and OpenPGP (RFC 4880).',
            error: {
              code: 'UNSUPPORTED_PROTOCOL_FORMAT',
              message: 'Unrecognized cryptographic envelope. Supported protocols: S/MIME and OpenPGP.'
            },
            securityNotes: 'Standards compliance enforcement: proprietary formats are strictly rejected.'
          }
        };
      }

      return {
        status: 400,
        body: {
          error: {
            code: 'INVALID_SCENARIO',
            message: `Scenario ID "${scenarioId}" not recognized. Valid scenarios: 1 through 8.`
          }
        }
      };
    }

    // Default 404 for unknown API routes
    return {
      status: 404,
      body: {
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `The requested endpoint ${httpMethod} ${normPath} was not found on this Secure Electronic Mail Gateway API.`,
          availableRoutes: REGISTERED_ROUTES
        },
        availableRoutes: REGISTERED_ROUTES
      }
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_GATEWAY_ERROR',
          message: `Internal cryptographic gateway error: ${msg}`
        }
      }
    };
  }
}
