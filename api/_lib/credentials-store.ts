import credsData from '../../generated_creds.json';
import { inspectCertificate } from './crypto-smime';
import { inspectOpenPgpKey } from './crypto-openpgp';

export interface PublicCredentialItem {
  id: string;
  type: 'SMIME_CERTIFICATE' | 'OPENPGP_PUBLIC_KEY';
  ownerName: string;
  email: string;
  organization?: string;
  fingerprint: string;
  keyId?: string;
  algorithm: string;
  validFrom: string;
  validTo: string | null;
  trustStatus:
    | 'TRUSTED_DEMO'
    | 'VALID'
    | 'EXPIRED'
    | 'UNTRUSTED_CA'
    | 'INVALID'
    | 'DEMO_KEY'
    | 'REVOKED'
    | 'UNVERIFIED';
  isExpired: boolean;
  rawPublicCredential: string;
  notes: string;
}

// In-memory credential registry initialized with generated credentials
const smimeRegistry: Array<{
  id: string;
  ownerName: string;
  email: string;
  certPem: string;
  keyPem?: string; // Kept strictly on server for authorized gateway demo processing
  notes: string;
}> = [
  {
    id: 'smime-alice',
    ownerName: 'Alice Smith',
    email: 'alice@gateway.internal',
    certPem: credsData.aliceSmime.certPem,
    keyPem: credsData.aliceSmime.keyPem,
    notes: 'Demonstration S/MIME Certificate & Key for Alice'
  },
  {
    id: 'smime-bob',
    ownerName: 'Bob Jones',
    email: 'bob@gateway.internal',
    certPem: credsData.bobSmime.certPem,
    keyPem: credsData.bobSmime.keyPem,
    notes: 'Demonstration S/MIME Certificate & Key for Bob'
  },
  {
    id: 'smime-gateway',
    ownerName: 'Mansi Chalak (Gateway Operator)',
    email: 'gateway@gateway.internal',
    certPem: credsData.gatewaySmime.certPem,
    keyPem: credsData.gatewaySmime.keyPem,
    notes: 'Gateway Authority Certificate for cross-protocol signing & verification'
  },
  {
    id: 'smime-expired-carol',
    ownerName: 'Carol Expired',
    email: 'carol@external.org',
    certPem: credsData.expiredSmime.certPem,
    keyPem: credsData.expiredSmime.keyPem,
    notes: 'Expired S/MIME Certificate for testing error boundaries'
  }
];

const openpgpRegistry: Array<{
  id: string;
  ownerName: string;
  email: string;
  publicKeyArmored: string;
  privateKeyArmored?: string;
  notes: string;
}> = [
  {
    id: 'pgp-alice',
    ownerName: 'Alice Smith',
    email: 'alice@gateway.internal',
    publicKeyArmored: credsData.alicePgp.publicKey,
    privateKeyArmored: credsData.alicePgp.privateKey,
    notes: 'OpenPGP Keypair for Alice'
  },
  {
    id: 'pgp-bob',
    ownerName: 'Bob Jones',
    email: 'bob@gateway.internal',
    publicKeyArmored: credsData.bobPgp.publicKey,
    privateKeyArmored: credsData.bobPgp.privateKey,
    notes: 'OpenPGP Keypair for Bob'
  },
  {
    id: 'pgp-gateway',
    ownerName: 'Mansi Chalak (Gateway Operator)',
    email: 'gateway@gateway.internal',
    publicKeyArmored: credsData.gatewayPgp.publicKey,
    privateKeyArmored: credsData.gatewayPgp.privateKey,
    notes: 'Gateway OpenPGP Key for cross-protocol signing & verification'
  }
];

export function getSmimeCertForEmail(email: string): string | null {
  const norm = email.trim().toLowerCase();
  const found = smimeRegistry.find(item => item.email.toLowerCase() === norm);
  return found ? found.certPem : null;
}

export function getSmimeKeyForEmail(email: string): string | null {
  const norm = email.trim().toLowerCase();
  const found = smimeRegistry.find(item => item.email.toLowerCase() === norm);
  return found?.keyPem || null;
}

export function getOpenPgpPublicKeyForEmail(email: string): string | null {
  const norm = email.trim().toLowerCase();
  const found = openpgpRegistry.find(item => item.email.toLowerCase() === norm);
  return found ? found.publicKeyArmored : null;
}

export function getOpenPgpPrivateKeyForEmail(email: string): string | null {
  const norm = email.trim().toLowerCase();
  const found = openpgpRegistry.find(item => item.email.toLowerCase() === norm);
  return found?.privateKeyArmored || null;
}

export function getGatewaySmimeCredentials() {
  return {
    certPem: credsData.gatewaySmime.certPem,
    keyPem: credsData.gatewaySmime.keyPem
  };
}

export function getGatewayOpenPgpCredentials() {
  return {
    publicKey: credsData.gatewayPgp.publicKey,
    privateKey: credsData.gatewayPgp.privateKey
  };
}

export function listPublicSmimeCertificates(): PublicCredentialItem[] {
  return smimeRegistry.map(item => {
    try {
      const parsed = inspectCertificate(item.certPem);
      return {
        id: item.id,
        type: 'SMIME_CERTIFICATE',
        ownerName: item.ownerName,
        email: item.email,
        organization: parsed.subject.organization || 'Demonstration Org',
        fingerprint: parsed.fingerprintSha256,
        algorithm: parsed.publicKeyAlgorithm,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
        trustStatus: parsed.trustStatus,
        isExpired: parsed.isExpired,
        rawPublicCredential: item.certPem,
        notes: item.notes
      };
    } catch {
      return {
        id: item.id,
        type: 'SMIME_CERTIFICATE',
        ownerName: item.ownerName,
        email: item.email,
        fingerprint: 'UNKNOWN',
        algorithm: 'RSA',
        validFrom: new Date().toISOString(),
        validTo: null,
        trustStatus: 'INVALID',
        isExpired: false,
        rawPublicCredential: item.certPem,
        notes: item.notes
      };
    }
  });
}

export async function listPublicOpenPgpKeys(): Promise<PublicCredentialItem[]> {
  const results: PublicCredentialItem[] = [];
  for (const item of openpgpRegistry) {
    try {
      const parsed = await inspectOpenPgpKey(item.publicKeyArmored);
      results.push({
        id: item.id,
        type: 'OPENPGP_PUBLIC_KEY',
        ownerName: item.ownerName,
        email: item.email,
        organization: 'OpenPGP Web of Trust (Demo)',
        fingerprint: parsed.fingerprint,
        keyId: parsed.keyId,
        algorithm: parsed.algorithm,
        validFrom: parsed.creationTime,
        validTo: parsed.expirationTime,
        trustStatus: parsed.trustStatus,
        isExpired: Boolean(parsed.expirationTime && new Date() > new Date(parsed.expirationTime)),
        rawPublicCredential: item.publicKeyArmored,
        notes: item.notes
      });
    } catch {
      results.push({
        id: item.id,
        type: 'OPENPGP_PUBLIC_KEY',
        ownerName: item.ownerName,
        email: item.email,
        fingerprint: 'UNKNOWN',
        algorithm: 'OpenPGP',
        validFrom: new Date().toISOString(),
        validTo: null,
        trustStatus: 'UNVERIFIED',
        isExpired: false,
        rawPublicCredential: item.publicKeyArmored,
        notes: item.notes
      });
    }
  }
  return results;
}

export function checkRecipientCredentials(email: string) {
  const norm = email.trim().toLowerCase();
  const hasSmime = Boolean(smimeRegistry.find(item => item.email.toLowerCase() === norm));
  const hasOpenPgp = Boolean(openpgpRegistry.find(item => item.email.toLowerCase() === norm));

  let recommendedProtocol: 'smime' | 'openpgp' | 'none' = 'none';
  if (hasSmime && !hasOpenPgp) recommendedProtocol = 'smime';
  else if (hasOpenPgp && !hasSmime) recommendedProtocol = 'openpgp';
  else if (hasSmime && hasOpenPgp) recommendedProtocol = 'smime';

  return {
    email,
    hasSmime,
    hasOpenPgp,
    recommendedProtocol,
    statusMessage: hasSmime || hasOpenPgp
      ? `Recipient has registered credentials: ${[hasSmime ? 'S/MIME X.509' : null, hasOpenPgp ? 'OpenPGP' : null].filter(Boolean).join(' and ')}.`
      : `No registered credentials found for ${email}. Encrypted delivery will require importing recipient certificate or public key.`
  };
}
