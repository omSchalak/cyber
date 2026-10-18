import { describe, it, expect } from 'vitest';
import {
  inspectCertificate,
  signMessageSmime,
  verifySmimeSignature,
  encryptSmimeMessage,
  decryptSmimeMessage
} from '../src/server/crypto-smime';
import {
  generateDemoPgpKey,
  inspectOpenPgpKey,
  encryptOpenPgpMessage,
  decryptOpenPgpMessage,
  signOpenPgpMessage,
  verifyOpenPgpSignature
} from '../src/server/crypto-openpgp';
import credsData from '../generated_creds.json';

describe('S/MIME Cryptographic Engine', () => {
  it('correctly parses an active X.509 certificate and extracts extensions', () => {
    const certInfo = inspectCertificate(credsData.aliceSmime.certPem);
    expect(certInfo.isValid).toBe(true);
    expect(certInfo.isExpired).toBe(false);
    expect(certInfo.subject.commonName).toBe('Alice Smith');
    expect(certInfo.subject.emailAddress).toBe('alice@gateway.internal');
    expect(certInfo.fingerprintSha256).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    expect(certInfo.trustStatus).toBe('TRUSTED_DEMO');
  });

  it('correctly detects an expired certificate', () => {
    const certInfo = inspectCertificate(credsData.expiredSmime.certPem);
    expect(certInfo.isExpired).toBe(true);
    expect(certInfo.isValid).toBe(false);
    expect(certInfo.trustStatus).toBe('EXPIRED');
  });

  it('signs and verifies an S/MIME PKCS#7 message', () => {
    const testMessage = 'Cybersecurity Final Project: Confidential Report';
    const signed = signMessageSmime(
      testMessage,
      credsData.aliceSmime.certPem,
      credsData.aliceSmime.keyPem
    );
    expect(signed.signedPem).toContain('-----BEGIN PKCS7-----');

    // Verify valid signature
    const verification = verifySmimeSignature(signed.signedPem, testMessage);
    expect(verification.valid).toBe(true);
    expect(verification.content).toBe(testMessage);
    expect(verification.signerCommonName).toBe('Alice Smith');

    // Tampering test
    const tamperedVerification = verifySmimeSignature(signed.signedPem, 'Tampered Message Body');
    expect(tamperedVerification.valid).toBe(false);
    expect(tamperedVerification.error).toContain('mismatch');
  });

  it('encrypts and decrypts an S/MIME PKCS#7 EnvelopedData payload', () => {
    const secret = 'Highly Secret Gateway Token: 987654321';
    const encrypted = encryptSmimeMessage(secret, credsData.bobSmime.certPem);
    expect(encrypted.encryptedPem).toContain('-----BEGIN PKCS7-----');

    const decrypted = decryptSmimeMessage(encrypted.encryptedPem, credsData.bobSmime.keyPem);
    expect(decrypted.plaintext).toBe(secret);
  });
});

describe('OpenPGP Cryptographic Engine', () => {
  it('generates a valid OpenPGP key pair', async () => {
    const keyPair = await generateDemoPgpKey('Test User', 'test@gateway.internal');
    expect(keyPair.publicKey).toContain('BEGIN PGP PUBLIC KEY BLOCK');
    expect(keyPair.privateKey).toContain('BEGIN PGP PRIVATE KEY BLOCK');
    expect(keyPair.fingerprint).toBeDefined();
    expect(keyPair.keyId).toBeDefined();
  });

  it('inspects an OpenPGP public key', async () => {
    const inspected = await inspectOpenPgpKey(credsData.alicePgp.publicKey);
    expect(inspected.isPrivate).toBe(false);
    expect(inspected.userIDs[0].name).toBe('Alice Smith');
    expect(inspected.userIDs[0].email).toBe('alice@gateway.internal');
    expect(inspected.fingerprint).toBeDefined();
  });

  it('signs and verifies an OpenPGP cleartext message', async () => {
    const text = 'Cleartext Signed OpenPGP Statement for Mansi Chalak';
    const signed = await signOpenPgpMessage(text, credsData.alicePgp.privateKey);
    expect(signed.signedPayload).toContain('BEGIN PGP SIGNED MESSAGE');

    const verifyResult = await verifyOpenPgpSignature(
      signed.signedPayload,
      credsData.alicePgp.publicKey
    );
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.content).toBe(text);
  });

  it('encrypts and decrypts OpenPGP messages', async () => {
    const message = 'Confidential OpenPGP Data Packet';
    const encrypted = await encryptOpenPgpMessage(
      message,
      credsData.bobPgp.publicKey,
      credsData.alicePgp.privateKey
    );
    expect(encrypted.armoredMessage).toContain('BEGIN PGP MESSAGE');
    expect(encrypted.signed).toBe(true);

    const decrypted = await decryptOpenPgpMessage(
      encrypted.armoredMessage,
      credsData.bobPgp.privateKey,
      undefined,
      credsData.alicePgp.publicKey
    );
    expect(decrypted.plaintext).toBe(message);
    expect(decrypted.signatureVerified).toBe(true);
  });
});
