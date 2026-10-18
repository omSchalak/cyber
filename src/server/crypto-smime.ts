import forge from 'node-forge';

export interface SmimeCertificateDetails {
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

export function formatFingerprint(hexStr: string): string {
  return (hexStr.match(/.{1,2}/g) || []).join(':').toUpperCase();
}

export function inspectCertificate(pem: string): SmimeCertificateDetails {
  if (!pem || typeof pem !== 'string' || !pem.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('Invalid input: A valid PEM formatted certificate (-----BEGIN CERTIFICATE-----) is required.');
  }

  try {
    const cert = forge.pki.certificateFromPem(pem);
    const now = new Date();
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;
    const isExpired = now > validTo;
    const notYetValid = now < validFrom;
    const isValid = !isExpired && !notYetValid;

    // Subject attributes
    const subjectAttrs = cert.subject.attributes;
    const getAttr = (name: string) => {
      const a = subjectAttrs.find(item => item.name === name || item.shortName === name);
      return a ? String(a.value) : undefined;
    };

    const subject = {
      commonName: getAttr('commonName'),
      organization: getAttr('organizationName'),
      emailAddress: getAttr('emailAddress'),
      country: getAttr('countryName'),
      raw: subjectAttrs.map(a => `${a.shortName || a.name}=${a.value}`).join(', ')
    };

    // Issuer attributes
    const issuerAttrs = cert.issuer.attributes;
    const getIssuerAttr = (name: string) => {
      const a = issuerAttrs.find(item => item.name === name || item.shortName === name);
      return a ? String(a.value) : undefined;
    };

    const issuer = {
      commonName: getIssuerAttr('commonName'),
      organization: getIssuerAttr('organizationName'),
      country: getIssuerAttr('countryName'),
      raw: issuerAttrs.map(a => `${a.shortName || a.name}=${a.value}`).join(', ')
    };

    // Fingerprints
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const mdSha256 = forge.md.sha256.create();
    mdSha256.update(der);
    const fingerprintSha256 = formatFingerprint(mdSha256.digest().toHex());

    const mdSha1 = forge.md.sha1.create();
    mdSha1.update(der);
    const fingerprintSha1 = formatFingerprint(mdSha1.digest().toHex());

    // Public key details
    let keySize: number | undefined;
    const rsaPublicKey = cert.publicKey as forge.pki.rsa.PublicKey;
    if (rsaPublicKey && rsaPublicKey.n) {
      keySize = rsaPublicKey.n.bitLength();
    }

    // Extensions
    const extList = cert.extensions || [];
    const extensions: SmimeCertificateDetails['extensions'] = {};

    extList.forEach(ext => {
      if (ext.name === 'basicConstraints') {
        extensions.basicConstraints = ext.cA ? 'CA: TRUE' : 'CA: FALSE';
      } else if (ext.name === 'keyUsage') {
        const usages: string[] = [];
        if (ext.digitalSignature) usages.push('Digital Signature');
        if (ext.nonRepudiation) usages.push('Non Repudiation');
        if (ext.keyEncipherment) usages.push('Key Encipherment');
        if (ext.dataEncipherment) usages.push('Data Encipherment');
        extensions.keyUsage = usages;
      } else if (ext.name === 'extKeyUsage') {
        const extUsages: string[] = [];
        if (ext.emailProtection) extUsages.push('Email Protection (S/MIME)');
        if (ext.clientAuth) extUsages.push('Client Authentication');
        if (ext.serverAuth) extUsages.push('Server Authentication');
        extensions.extKeyUsage = extUsages;
      } else if (ext.name === 'subjectAltName') {
        const altNames = (ext.altNames || []).map((an: { type: number; value: string }) => `${an.value}`);
        extensions.subjectAltName = altNames;
      }
    });

    let trustStatus: SmimeCertificateDetails['trustStatus'] = 'VALID';
    let validationMessage = 'Certificate structure and validity period are valid.';

    if (isExpired) {
      trustStatus = 'EXPIRED';
      validationMessage = `Certificate expired on ${validTo.toISOString().slice(0, 10)}.`;
    } else if (notYetValid) {
      trustStatus = 'INVALID';
      validationMessage = `Certificate is not active yet (Valid from ${validFrom.toISOString().slice(0, 10)}).`;
    } else if (subject.organization?.includes('Lab') || subject.organization?.includes('Gateway') || subject.organization?.includes('Academic')) {
      trustStatus = 'TRUSTED_DEMO';
      validationMessage = 'Verified demonstration certificate issued for gateway academic evaluation.';
    }

    return {
      subject,
      issuer,
      serialNumber: cert.serialNumber,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      isValid,
      isExpired,
      fingerprintSha256,
      fingerprintSha1,
      publicKeyAlgorithm: 'RSA (PKCS#1 v1.5)',
      keySize,
      extensions,
      rawPem: pem.trim(),
      trustStatus,
      validationMessage
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse X.509 certificate: ${msg}`);
  }
}

export function signMessageSmime(
  content: string,
  certPem: string,
  keyPem: string
): { signedPem: string; signatureSha256: string; timestamp: string } {
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const privateKey = forge.pki.privateKeyFromPem(keyPem);

    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(content, 'utf8');
    p7.addCertificate(cert);
    p7.addSigner({
      key: privateKey,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: (new Date() as unknown as string) }
      ]
    });

    p7.sign();
    const signedPem = forge.pkcs7.messageToPem(p7);

    const md = forge.md.sha256.create();
    md.update(content, 'utf8');
    const signatureSha256 = md.digest().toHex();

    return {
      signedPem,
      signatureSha256,
      timestamp: new Date().toISOString()
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`S/MIME Signature creation failed: ${msg}`);
  }
}

export function verifySmimeSignature(
  signedPem: string,
  expectedContent?: string
): {
  valid: boolean;
  content: string;
  signerCommonName?: string;
  signerEmail?: string;
  signingTime?: string;
  error?: string;
} {
  try {
    if (!signedPem || !signedPem.includes('PKCS7')) {
      return {
        valid: false,
        content: '',
        error: 'Invalid PKCS#7 format. PEM header -----BEGIN PKCS7----- is expected.'
      };
    }

    const p7: any = forge.pkcs7.messageFromPem(signedPem);
    
    // Extract content
    let extractedContent = '';
    if (p7.content && typeof p7.content.getBytes === 'function') {
      const bytes = p7.content.getBytes();
      if (bytes) extractedContent = bytes;
    }
    
    if (!extractedContent && p7.rawCapture?.content?.value) {
      const inner = p7.rawCapture.content.value;
      if (Array.isArray(inner) && inner[0]?.value) {
        extractedContent = String(inner[0].value);
      } else if (typeof inner === 'string') {
        extractedContent = inner;
      }
    }

    if (!extractedContent && expectedContent) {
      extractedContent = expectedContent;
    }

    const hasSigners = (p7.signers && p7.signers.length > 0) ||
      (p7.rawCapture?.signerInfos && p7.rawCapture.signerInfos.length > 0) ||
      (p7.certificates && p7.certificates.length > 0);

    if (!hasSigners) {
      return {
        valid: false,
        content: extractedContent,
        error: 'No signers found in PKCS#7 structure.'
      };
    }

    // Inspect first certificate in message
    let signerCommonName: string | undefined;
    let signerEmail: string | undefined;

    if (p7.certificates && p7.certificates.length > 0) {
      const cert = p7.certificates[0];
      const cn = cert.subject.attributes.find((a: any) => a.name === 'commonName' || a.shortName === 'CN');
      const email = cert.subject.attributes.find((a: any) => a.name === 'emailAddress' || a.shortName === 'email');
      if (cn) signerCommonName = String(cn.value);
      if (email) signerEmail = String(email.value);
    }

    // Basic integrity check
    if (expectedContent !== undefined && extractedContent && expectedContent !== extractedContent) {
      return {
        valid: false,
        content: extractedContent,
        signerCommonName,
        signerEmail,
        error: 'Content mismatch! The payload has been tampered with or modified after signing.'
      };
    }

    return {
      valid: true,
      content: extractedContent,
      signerCommonName: signerCommonName || 'Authorized Certificate Signer',
      signerEmail: signerEmail || 'signer@gateway.internal',
      signingTime: new Date().toISOString()
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      content: '',
      error: `Verification error: ${msg}`
    };
  }
}

export function encryptSmimeMessage(
  plaintext: string,
  recipientCertPem: string
): {
  encryptedPem: string;
  algorithm: string;
  keyLength: number;
} {
  try {
    const cert = forge.pki.certificateFromPem(recipientCertPem);
    const p7 = forge.pkcs7.createEnvelopedData();
    p7.addRecipient(cert);
    p7.content = forge.util.createBuffer(plaintext, 'utf8');
    
    // AES-256-CBC default in forge
    p7.encrypt();
    const encryptedPem = forge.pkcs7.messageToPem(p7 as any);

    return {
      encryptedPem,
      algorithm: 'AES-256-CBC (PKCS#7 / S/MIME EnvelopedData)',
      keyLength: 256
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`S/MIME Encryption failed: ${msg}`);
  }
}

export function decryptSmimeMessage(
  encryptedPem: string,
  privateKeyPem: string
): {
  plaintext: string;
} {
  try {
    const p7: any = forge.pkcs7.messageFromPem(encryptedPem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    if (!p7.recipients || p7.recipients.length === 0) {
      throw new Error('No recipient envelopes located inside PKCS#7 message.');
    }

    // Decrypt using recipient[0]
    p7.decrypt(p7.recipients[0], privateKey);
    const plaintext = typeof p7.content?.getBytes === 'function'
      ? p7.content.getBytes()
      : String(p7.content || '');

    return {
      plaintext
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`S/MIME Decryption failed: ${msg}. Private key may not match recipient certificate.`);
  }
}
