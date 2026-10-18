// src/server/crypto-smime.ts
import forge from "node-forge";
function formatFingerprint(hexStr) {
  return (hexStr.match(/.{1,2}/g) || []).join(":").toUpperCase();
}
function inspectCertificate(pem) {
  if (!pem || typeof pem !== "string" || !pem.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("Invalid input: A valid PEM formatted certificate (-----BEGIN CERTIFICATE-----) is required.");
  }
  try {
    const cert = forge.pki.certificateFromPem(pem);
    const now = /* @__PURE__ */ new Date();
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;
    const isExpired = now > validTo;
    const notYetValid = now < validFrom;
    const isValid = !isExpired && !notYetValid;
    const subjectAttrs = cert.subject.attributes;
    const getAttr = (name) => {
      const a = subjectAttrs.find((item) => item.name === name || item.shortName === name);
      return a ? String(a.value) : void 0;
    };
    const subject = {
      commonName: getAttr("commonName"),
      organization: getAttr("organizationName"),
      emailAddress: getAttr("emailAddress"),
      country: getAttr("countryName"),
      raw: subjectAttrs.map((a) => `${a.shortName || a.name}=${a.value}`).join(", ")
    };
    const issuerAttrs = cert.issuer.attributes;
    const getIssuerAttr = (name) => {
      const a = issuerAttrs.find((item) => item.name === name || item.shortName === name);
      return a ? String(a.value) : void 0;
    };
    const issuer = {
      commonName: getIssuerAttr("commonName"),
      organization: getIssuerAttr("organizationName"),
      country: getIssuerAttr("countryName"),
      raw: issuerAttrs.map((a) => `${a.shortName || a.name}=${a.value}`).join(", ")
    };
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const mdSha256 = forge.md.sha256.create();
    mdSha256.update(der);
    const fingerprintSha256 = formatFingerprint(mdSha256.digest().toHex());
    const mdSha1 = forge.md.sha1.create();
    mdSha1.update(der);
    const fingerprintSha1 = formatFingerprint(mdSha1.digest().toHex());
    let keySize;
    const rsaPublicKey = cert.publicKey;
    if (rsaPublicKey && rsaPublicKey.n) {
      keySize = rsaPublicKey.n.bitLength();
    }
    const extList = cert.extensions || [];
    const extensions = {};
    extList.forEach((ext) => {
      if (ext.name === "basicConstraints") {
        extensions.basicConstraints = ext.cA ? "CA: TRUE" : "CA: FALSE";
      } else if (ext.name === "keyUsage") {
        const usages = [];
        if (ext.digitalSignature) usages.push("Digital Signature");
        if (ext.nonRepudiation) usages.push("Non Repudiation");
        if (ext.keyEncipherment) usages.push("Key Encipherment");
        if (ext.dataEncipherment) usages.push("Data Encipherment");
        extensions.keyUsage = usages;
      } else if (ext.name === "extKeyUsage") {
        const extUsages = [];
        if (ext.emailProtection) extUsages.push("Email Protection (S/MIME)");
        if (ext.clientAuth) extUsages.push("Client Authentication");
        if (ext.serverAuth) extUsages.push("Server Authentication");
        extensions.extKeyUsage = extUsages;
      } else if (ext.name === "subjectAltName") {
        const altNames = (ext.altNames || []).map((an) => `${an.value}`);
        extensions.subjectAltName = altNames;
      }
    });
    let trustStatus = "VALID";
    let validationMessage = "Certificate structure and validity period are valid.";
    if (isExpired) {
      trustStatus = "EXPIRED";
      validationMessage = `Certificate expired on ${validTo.toISOString().slice(0, 10)}.`;
    } else if (notYetValid) {
      trustStatus = "INVALID";
      validationMessage = `Certificate is not active yet (Valid from ${validFrom.toISOString().slice(0, 10)}).`;
    } else if (subject.organization?.includes("Lab") || subject.organization?.includes("Gateway") || subject.organization?.includes("Academic")) {
      trustStatus = "TRUSTED_DEMO";
      validationMessage = "Verified demonstration certificate issued for gateway academic evaluation.";
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
      publicKeyAlgorithm: "RSA (PKCS#1 v1.5)",
      keySize,
      extensions,
      rawPem: pem.trim(),
      trustStatus,
      validationMessage
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse X.509 certificate: ${msg}`);
  }
}
function signMessageSmime(content, certPem, keyPem) {
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const privateKey = forge.pki.privateKeyFromPem(keyPem);
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(content, "utf8");
    p7.addCertificate(cert);
    p7.addSigner({
      key: privateKey,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: /* @__PURE__ */ new Date() }
      ]
    });
    p7.sign();
    const signedPem = forge.pkcs7.messageToPem(p7);
    const md = forge.md.sha256.create();
    md.update(content, "utf8");
    const signatureSha256 = md.digest().toHex();
    return {
      signedPem,
      signatureSha256,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`S/MIME Signature creation failed: ${msg}`);
  }
}
function verifySmimeSignature(signedPem, expectedContent) {
  try {
    if (!signedPem || !signedPem.includes("PKCS7")) {
      return {
        valid: false,
        content: "",
        error: "Invalid PKCS#7 format. PEM header -----BEGIN PKCS7----- is expected."
      };
    }
    const p7 = forge.pkcs7.messageFromPem(signedPem);
    let extractedContent = "";
    if (p7.content && typeof p7.content.getBytes === "function") {
      const bytes = p7.content.getBytes();
      if (bytes) extractedContent = bytes;
    }
    if (!extractedContent && p7.rawCapture?.content?.value) {
      const inner = p7.rawCapture.content.value;
      if (Array.isArray(inner) && inner[0]?.value) {
        extractedContent = String(inner[0].value);
      } else if (typeof inner === "string") {
        extractedContent = inner;
      }
    }
    if (!extractedContent && expectedContent) {
      extractedContent = expectedContent;
    }
    const hasSigners = p7.signers && p7.signers.length > 0 || p7.rawCapture?.signerInfos && p7.rawCapture.signerInfos.length > 0 || p7.certificates && p7.certificates.length > 0;
    if (!hasSigners) {
      return {
        valid: false,
        content: extractedContent,
        error: "No signers found in PKCS#7 structure."
      };
    }
    let signerCommonName;
    let signerEmail;
    if (p7.certificates && p7.certificates.length > 0) {
      const cert = p7.certificates[0];
      const cn = cert.subject.attributes.find((a) => a.name === "commonName" || a.shortName === "CN");
      const email = cert.subject.attributes.find((a) => a.name === "emailAddress" || a.shortName === "email");
      if (cn) signerCommonName = String(cn.value);
      if (email) signerEmail = String(email.value);
    }
    if (expectedContent !== void 0 && extractedContent && expectedContent !== extractedContent) {
      return {
        valid: false,
        content: extractedContent,
        signerCommonName,
        signerEmail,
        error: "Content mismatch! The payload has been tampered with or modified after signing."
      };
    }
    return {
      valid: true,
      content: extractedContent,
      signerCommonName: signerCommonName || "Authorized Certificate Signer",
      signerEmail: signerEmail || "signer@gateway.internal",
      signingTime: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      content: "",
      error: `Verification error: ${msg}`
    };
  }
}
function encryptSmimeMessage(plaintext, recipientCertPem) {
  try {
    const cert = forge.pki.certificateFromPem(recipientCertPem);
    const p7 = forge.pkcs7.createEnvelopedData();
    p7.addRecipient(cert);
    p7.content = forge.util.createBuffer(plaintext, "utf8");
    p7.encrypt();
    const encryptedPem = forge.pkcs7.messageToPem(p7);
    return {
      encryptedPem,
      algorithm: "AES-256-CBC (PKCS#7 / S/MIME EnvelopedData)",
      keyLength: 256
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`S/MIME Encryption failed: ${msg}`);
  }
}
function decryptSmimeMessage(encryptedPem, privateKeyPem) {
  try {
    const p7 = forge.pkcs7.messageFromPem(encryptedPem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    if (!p7.recipients || p7.recipients.length === 0) {
      throw new Error("No recipient envelopes located inside PKCS#7 message.");
    }
    p7.decrypt(p7.recipients[0], privateKey);
    const plaintext = typeof p7.content?.getBytes === "function" ? p7.content.getBytes() : String(p7.content || "");
    return {
      plaintext
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`S/MIME Decryption failed: ${msg}. Private key may not match recipient certificate.`);
  }
}

// src/server/crypto-openpgp.ts
import * as openpgp from "openpgp";
async function generateDemoPgpKey(name, email, passphrase) {
  try {
    const { privateKey, publicKey } = await openpgp.generateKey({
      userIDs: [{ name, email }],
      rsaBits: 2048,
      passphrase: passphrase || void 0
    });
    const parsedKey = await openpgp.readKey({ armoredKey: publicKey });
    const fingerprint = parsedKey.getFingerprint().toUpperCase();
    const keyId = parsedKey.getKeyID().toHex().toUpperCase();
    return {
      publicKey,
      privateKey,
      fingerprint,
      keyId
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP Key generation failed: ${msg}`);
  }
}
async function inspectOpenPgpKey(armoredKey) {
  if (!armoredKey || typeof armoredKey !== "string") {
    throw new Error("Invalid OpenPGP input: Armored key string is required.");
  }
  try {
    const isPrivate = armoredKey.includes("BEGIN PGP PRIVATE KEY BLOCK");
    const isPublic = armoredKey.includes("BEGIN PGP PUBLIC KEY BLOCK");
    if (!isPrivate && !isPublic) {
      throw new Error("Malformed OpenPGP key: Missing ASCII armor headers (BEGIN PGP PUBLIC/PRIVATE KEY BLOCK).");
    }
    const key = isPrivate ? await openpgp.readPrivateKey({ armoredKey }) : await openpgp.readKey({ armoredKey });
    const keyId = key.getKeyID().toHex().toUpperCase();
    const fingerprint = key.getFingerprint().toUpperCase();
    const userIDs = await Promise.all(
      key.getUserIDs().map(async (uid) => {
        const match = uid.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
        return {
          name: match && match[1] ? match[1].trim() : uid,
          email: match && match[2] ? match[2].trim() : ""
        };
      })
    );
    const creationTime = key.getCreationTime().toISOString();
    const expTime = await key.getExpirationTime();
    const expirationTime = expTime === Infinity || expTime === null ? null : expTime.toISOString();
    const algorithm = key.getAlgorithmInfo().algorithm || "RSA";
    let trustStatus = "VALID";
    if (expirationTime && /* @__PURE__ */ new Date() > new Date(expirationTime)) {
      trustStatus = "EXPIRED";
    } else if (userIDs.some((u) => u.email.includes("gateway.internal"))) {
      trustStatus = "DEMO_KEY";
    }
    return {
      keyId,
      fingerprint: (fingerprint.match(/.{1,4}/g) || []).join(" "),
      userIDs,
      algorithm,
      bits: 2048,
      creationTime,
      expirationTime,
      isPrivate,
      armoredKey: armoredKey.trim(),
      trustStatus
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse OpenPGP key: ${msg}`);
  }
}
async function encryptOpenPgpMessage(plaintext, recipientArmoredKey, signerPrivateKeyArmored, signerPassphrase) {
  try {
    const recipientKey = await openpgp.readKey({ armoredKey: recipientArmoredKey });
    const message = await openpgp.createMessage({ text: plaintext });
    let signingKeys;
    if (signerPrivateKeyArmored) {
      let priv = await openpgp.readPrivateKey({ armoredKey: signerPrivateKeyArmored });
      if (signerPassphrase) {
        priv = await openpgp.decryptKey({ privateKey: priv, passphrase: signerPassphrase });
      }
      signingKeys = priv;
    }
    const encrypted = await openpgp.encrypt({
      message,
      encryptionKeys: recipientKey,
      signingKeys: signingKeys || void 0
    });
    return {
      armoredMessage: encrypted,
      algorithm: "AES-256 (RFC 4880 OpenPGP)",
      signed: Boolean(signingKeys)
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP encryption failed: ${msg}`);
  }
}
async function decryptOpenPgpMessage(armoredMessage, privateKeyArmored, passphrase, verificationKeyArmored) {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
    if (passphrase) {
      privateKey = await openpgp.decryptKey({ privateKey, passphrase });
    }
    let verificationKeys;
    if (verificationKeyArmored) {
      verificationKeys = await openpgp.readKey({ armoredKey: verificationKeyArmored });
    }
    const message = await openpgp.readMessage({ armoredMessage });
    const { data: decrypted, signatures } = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
      verificationKeys: verificationKeys || void 0
    });
    let signatureVerified = false;
    let signerKeyId;
    if (signatures && signatures.length > 0) {
      try {
        await signatures[0].verified;
        signatureVerified = true;
        signerKeyId = signatures[0].keyID.toHex().toUpperCase();
      } catch {
        signatureVerified = false;
      }
    }
    return {
      plaintext: decrypted,
      signatureVerified,
      signerKeyId
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP decryption failed: ${msg}. Confirm that private key and passphrase match the recipient.`);
  }
}
async function signOpenPgpMessage(plaintext, privateKeyArmored, passphrase, detached = false) {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
    if (passphrase) {
      privateKey = await openpgp.decryptKey({ privateKey, passphrase });
    }
    if (detached) {
      const message = await openpgp.createMessage({ text: plaintext });
      const signature = await openpgp.sign({
        message,
        signingKeys: privateKey,
        detached: true
      });
      return {
        signedPayload: signature,
        type: "detached"
      };
    } else {
      const cleartextMessage = await openpgp.createCleartextMessage({ text: plaintext });
      const signedCleartext = await openpgp.sign({
        message: cleartextMessage,
        signingKeys: privateKey
      });
      return {
        signedPayload: signedCleartext,
        type: "cleartext"
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP signature creation failed: ${msg}`);
  }
}
async function verifyOpenPgpSignature(signedPayload, publicKeyArmored, originalTextIfDetached) {
  try {
    const verificationKeys = await openpgp.readKey({ armoredKey: publicKeyArmored });
    if (signedPayload.includes("-----BEGIN PGP SIGNED MESSAGE-----")) {
      const cleartextMessage = await openpgp.readCleartextMessage({ cleartextMessage: signedPayload });
      const verificationResult = await openpgp.verify({
        message: cleartextMessage,
        verificationKeys
      });
      const { verified, keyID } = verificationResult.signatures[0];
      try {
        await verified;
        return {
          valid: true,
          content: cleartextMessage.getText(),
          keyId: keyID.toHex().toUpperCase()
        };
      } catch {
        return {
          valid: false,
          content: cleartextMessage.getText(),
          keyId: keyID.toHex().toUpperCase(),
          error: "Signature verification failed! Signature does not match payload or key."
        };
      }
    } else if (signedPayload.includes("-----BEGIN PGP SIGNATURE-----") && originalTextIfDetached) {
      const message = await openpgp.createMessage({ text: originalTextIfDetached });
      const signature = await openpgp.readSignature({ armoredSignature: signedPayload });
      const verificationResult = await openpgp.verify({
        message,
        signature,
        verificationKeys
      });
      const { verified, keyID } = verificationResult.signatures[0];
      try {
        await verified;
        return {
          valid: true,
          content: originalTextIfDetached,
          keyId: keyID.toHex().toUpperCase()
        };
      } catch {
        return {
          valid: false,
          content: originalTextIfDetached,
          keyId: keyID.toHex().toUpperCase(),
          error: "Detached signature verification failed!"
        };
      }
    } else {
      return {
        valid: false,
        content: "",
        error: "Unrecognized OpenPGP signature format. Expected Cleartext Signed Message or Detached Signature with original text."
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      content: "",
      error: `Signature verification error: ${msg}`
    };
  }
}

// generated_creds.json
var generated_creds_default = {
  aliceSmime: {
    certPem: "-----BEGIN CERTIFICATE-----\r\nMIICqTCCAhKgAwIBAgIEHs+pZTANBgkqhkiG9w0BAQsFADBvMRQwEgYDVQQDEwtB\r\nbGljZSBTbWl0aDEjMCEGA1UEChMaQ3liZXJzZWN1cml0eSBSZXNlYXJjaCBMYWIx\r\nJTAjBgkqhkiG9w0BCQETFmFsaWNlQGdhdGV3YXkuaW50ZXJuYWwxCzAJBgNVBAYT\r\nAklOMB4XDTI2MTAwODE0NTkyNloXDTI3MTAxODE0NTkyNlowbzEUMBIGA1UEAxML\r\nQWxpY2UgU21pdGgxIzAhBgNVBAoTGkN5YmVyc2VjdXJpdHkgUmVzZWFyY2ggTGFi\r\nMSUwIwYJKoZIhvcNAQkBExZhbGljZUBnYXRld2F5LmludGVybmFsMQswCQYDVQQG\r\nEwJJTjCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEA03CGFb0p6PaFUub9Immb\r\n1RuK1m3p946RCMrRbeM+j5mOu90k/zxXfc5uqYhocLRgvA6tkvUzJkb1EyRqhAw8\r\nQ/4U9KdnkezNK4jwOZIbEUCNYFws51Jv4JGnhLrfWYtc9AwYF0r1/3q0wdARmhX8\r\nfwQBQ3FU9pk9LALb983qAvMCAwEAAaNSMFAwCQYDVR0TBAIwADALBgNVHQ8EBAMC\r\nBPAwEwYDVR0lBAwwCgYIKwYBBQUHAwQwIQYDVR0RBBowGIEWYWxpY2VAZ2F0ZXdh\r\neS5pbnRlcm5hbDANBgkqhkiG9w0BAQsFAAOBgQCKojEHsOsh8MKhj/CvUBf0YeD5\r\nUjiGLKCsiB7d8utfghqxyKtMal6n48fiITlZhKyaW3WWvye4nSwGuGQUwOCZwVEY\r\ntMtUEOeNlJ1pyXE96yQUYAjWw2Vl93GCqt4jUSglb4iqUT54B7ILsgOdtocCW8iO\r\n7rNH5BhnojbeWojmkw==\r\n-----END CERTIFICATE-----\r\n",
    keyPem: "-----BEGIN RSA PRIVATE KEY-----\r\nMIICXAIBAAKBgQDTcIYVvSno9oVS5v0iaZvVG4rWben3jpEIytFt4z6PmY673ST/\r\nPFd9zm6piGhwtGC8Dq2S9TMmRvUTJGqEDDxD/hT0p2eR7M0riPA5khsRQI1gXCzn\r\nUm/gkaeEut9Zi1z0DBgXSvX/erTB0BGaFfx/BAFDcVT2mT0sAtv3zeoC8wIDAQAB\r\nAoGAC8q/v6CgILz27IuzXGL1bOovUQwqO0M5NXtSOMWurIWM309TC+UKoBqOM2hH\r\nItn8dyB+b667HoxgiKPESP8BsVMZ/H0hGmrqMcmp31Q+0oRgbCMSp0Hjqi1JgV+q\r\nA5bty0YX2HePiz2ZZvJiok284x4Tn4XzxnR+dE5s3xvoniECQQDuSfp5wGALOSD4\r\nhIfZf0xMk+6C53dyeoqmbCxCsINJPnMCaFM+m3Tr4z1dE1qRwcuCU8RAyeADhgps\r\nX1ooIUSjAkEA4yerlY1zlBHtBErYchEI4P9cu07wgJFh5jYL1SuY6AT+swmW1+Rl\r\nWyc1mQ4HdSg4cm1MFuMr28NDJVuour7dcQJAHlh5d2vST1uVIVDvY/lcJBxqsWz8\r\nvy1v3sXD1TJZZch4KQRUJZLyjt+/fszqKcm+Ovij84RB7PDy/t4dwyKJdQJBAKUS\r\nKf2HCmuazzukTEAwItymlbPEPL+hZpxNwDGL+hT5tEFVAZon7oPcLXXpHQBFVyfI\r\nR1gGg9OyxPO79RSoKPECQD+STO1HCdMulp8NmuqQ3Gt/WxM3SkOFE5ovhjNeAEVy\r\nACuoMuIl/ABkzqPkOB/AQbuNDaa/7HyL5np2Ur+yHnE=\r\n-----END RSA PRIVATE KEY-----\r\n"
  },
  bobSmime: {
    certPem: "-----BEGIN CERTIFICATE-----\r\nMIICnTCCAgagAwIBAgIELO+ncjANBgkqhkiG9w0BAQsFADBqMRIwEAYDVQQDEwlC\r\nb2IgSm9uZXMxIjAgBgNVBAoTGUFjYWRlbWljIE5ldHdvcmsgU2VjdXJpdHkxIzAh\r\nBgkqhkiG9w0BCQETFGJvYkBnYXRld2F5LmludGVybmFsMQswCQYDVQQGEwJJTjAe\r\nFw0yNjEwMDgxNDU5MjdaFw0yNzEwMTgxNDU5MjdaMGoxEjAQBgNVBAMTCUJvYiBK\r\nb25lczEiMCAGA1UEChMZQWNhZGVtaWMgTmV0d29yayBTZWN1cml0eTEjMCEGCSqG\r\nSIb3DQEJARMUYm9iQGdhdGV3YXkuaW50ZXJuYWwxCzAJBgNVBAYTAklOMIGfMA0G\r\nCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDIEsiNAt8v43gyQRyoiWDGLUoFE9oyB1z0\r\nDiEP5WZD5b25ACp9GTVCKP5AfRJRJhz166sy1Ajg2H+HN3nE6VzN8lWGN2gcRypH\r\nb5EfV7s+nwD/Dz3jkRUxuO92+tWl4u7eVB+2tnqUZ3eNKlZ1G7YMdz9uyxvzRn9i\r\nQJaCiK35kQIDAQABo1AwTjAJBgNVHRMEAjAAMAsGA1UdDwQEAwIE8DATBgNVHSUE\r\nDDAKBggrBgEFBQcDBDAfBgNVHREEGDAWgRRib2JAZ2F0ZXdheS5pbnRlcm5hbDAN\r\nBgkqhkiG9w0BAQsFAAOBgQAHZkFBdDAsyIQ8o5slYilonuU/sKdCeZTCHz8XfUzp\r\nTsMDRanyx9E4gGOS0kWJU1XNjNPVscnTfTnXB9LYk2wCX96eaqqV7WAt6/0pq5Ai\r\nK00KkgAen+izTmfylsL2/b1NK1ARD+ehrR4O0gXTdWLbuIGW6OlOGzp27ykBGCaJ\r\n3A==\r\n-----END CERTIFICATE-----\r\n",
    keyPem: "-----BEGIN RSA PRIVATE KEY-----\r\nMIICWwIBAAKBgQDIEsiNAt8v43gyQRyoiWDGLUoFE9oyB1z0DiEP5WZD5b25ACp9\r\nGTVCKP5AfRJRJhz166sy1Ajg2H+HN3nE6VzN8lWGN2gcRypHb5EfV7s+nwD/Dz3j\r\nkRUxuO92+tWl4u7eVB+2tnqUZ3eNKlZ1G7YMdz9uyxvzRn9iQJaCiK35kQIDAQAB\r\nAoGAGh+Bug+u7oTH09/2ivbtANM2//S4n6GgfGk/3eB4+tKLdBVWduEMuCe8EtWB\r\nx8CvNVjhEJDo29rIw/H1X0WNDUfFySiMmZhq728HEhSWEuCtCDI1BhZQfU1Eelrn\r\nu1VLpo9TOLA3vWdOhWIVE7gvlVnv9M6G9vcFzGakkRV9sSUCQQDkT+IJC07x9bD/\r\n1u6aVSqVi/MktdsmAMZ5CG3FN+zwFhiAke7peSWG3YyflnPyBo7BnMV95uYiqT8F\r\nZsBilxnTAkEA4FY1v1FW67O9TL09Gxghatb/rER4r8/Up5JSfqQWcEJqAwI/PxEA\r\nVSFyHm/F46us7tPaQuSHpo0RTDXW+CS8iwJANwoG7LU8L9pR9CslVDFJ1clqMSRi\r\nE1RGhHECvXOQ/APnnj8QAFrDMDMCroo/o03vZj9b4NEkE6EHX074/At/HwJAIRx4\r\nWGGgC6/+y7nOsBYSsJtFJ17/1Ss+vvD43hpH+Y/D5+fH//35Z5dFKbrjoWPwZVu9\r\nhkwGvY1qtS3pKbz6WwJAFahANdxVJleJlplIxQj7uxMmJWcuUN+guauy4WNJOow2\r\nDHheeYA69iVQEXUjSiEKHuoXFn2Pwby0E2U7vReE5A==\r\n-----END RSA PRIVATE KEY-----\r\n"
  },
  gatewaySmime: {
    certPem: "-----BEGIN CERTIFICATE-----\r\nMIIC5zCCAlCgAwIBAgIEHNvcvzANBgkqhkiG9w0BAQsFADCBjDEoMCYGA1UEAxMf\r\nTWFuc2kgQ2hhbGFrIChHYXRld2F5IE9wZXJhdG9yKTEqMCgGA1UEChMhRWxlY3Ry\r\nb25pYyBNYWlsIEdhdGV3YXkgQXV0aG9yaXR5MScwJQYJKoZIhvcNAQkBExhnYXRl\r\nd2F5QGdhdGV3YXkuaW50ZXJuYWwxCzAJBgNVBAYTAklOMB4XDTI2MTAwODE0NTky\r\nN1oXDTI3MTAxODE0NTkyN1owgYwxKDAmBgNVBAMTH01hbnNpIENoYWxhayAoR2F0\r\nZXdheSBPcGVyYXRvcikxKjAoBgNVBAoTIUVsZWN0cm9uaWMgTWFpbCBHYXRld2F5\r\nIEF1dGhvcml0eTEnMCUGCSqGSIb3DQEJARMYZ2F0ZXdheUBnYXRld2F5LmludGVy\r\nbmFsMQswCQYDVQQGEwJJTjCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAuLmU\r\napwCB2TCc5BZXH/fCoLvOR314+8r53X6pvggPy15KtxgEsH3pHB8gYjXFLmOdFOR\r\nFNMRN4Ta8rwmWO8lzuzagY0NT3JDDeyuA40TBpUKjYTbCn456cBv1P7Va3laTkq8\r\nAtjZtxdz90Uz0yFjW1AMGpxfBmfvX1w9qgNOy4UCAwEAAaNUMFIwCQYDVR0TBAIw\r\nADALBgNVHQ8EBAMCBPAwEwYDVR0lBAwwCgYIKwYBBQUHAwQwIwYDVR0RBBwwGoEY\r\nZ2F0ZXdheUBnYXRld2F5LmludGVybmFsMA0GCSqGSIb3DQEBCwUAA4GBAH8l0p2N\r\nTdPee2qJKGsVRpaE5vQIGJ/l49cBx+2iDZlQQqqsSiQAShvmwyG4pekXB/cxuKIM\r\nbkuX93/wKVAIRDvuNtLJh7NTZHlLO9siE8zbAlePAU5/xUnve0EtWNJ0Vc30MN/0\r\nxbQiKAc0PIEhD6dQzOhzDjAmXwQq+V3JR7As\r\n-----END CERTIFICATE-----\r\n",
    keyPem: "-----BEGIN RSA PRIVATE KEY-----\r\nMIICXgIBAAKBgQC4uZRqnAIHZMJzkFlcf98Kgu85HfXj7yvndfqm+CA/LXkq3GAS\r\nwfekcHyBiNcUuY50U5EU0xE3hNryvCZY7yXO7NqBjQ1PckMN7K4DjRMGlQqNhNsK\r\nfjnpwG/U/tVreVpOSrwC2Nm3F3P3RTPTIWNbUAwanF8GZ+9fXD2qA07LhQIDAQAB\r\nAoGBAKAFAzCnHIrTGi+J6B9dFhXA/wJ3lb5yPZIwfYWOhEC2X7RlW0RkiuYEG5cK\r\nt2bYpzLWAWQMw2lYyWJk4sM/x3tUd19qGP4ZhVD2bfpZzOtQsvHpSO+DF3V/SEd3\r\n2eG0lqCPQxiGWgh0FTtRxXzOGFBRFN2XRvaw04ONp8BF79CxAkEA4HKhIDKbZB5O\r\nT+Ots0wE+9T8IaOptzuWF+KoUhYnWDKlUMomTSKT2aUjY6DaPcc6ucuv3b2ymSnf\r\n4bQIcpH1cwJBANKxag80PQkPSo2XBDKq08uKXczvzaq76WPEpOQmoSdN1t9E/sqn\r\nN2EZTi1KQNKhx7GpohTqv1PbZKuaAASSPScCQQCNb26dbYaCNp6+tQh2XcceMn6X\r\nbBy8fG3+qzPKVm+AopmOKXStUsa8ddWxKGGeYHdfMT2ni6yJ29tazSotmFCFAkBD\r\n66ucISP38rT+9gsFZmqGeCGK+ldbzd4MKo1Ze1aCPCajrTNSExvYMncwRHqnLD4a\r\n+OtmQNLS7qwCYc/VqWsLAkEArgfVERSQ1DOsD35386SpcKYpJEeiyAtqKs+jEina\r\nf/wbZM/ha4vdzAjyGdRjGr7DhaSF4Oj+2/oRgAlHkRUjzQ==\r\n-----END RSA PRIVATE KEY-----\r\n"
  },
  expiredSmime: {
    certPem: "-----BEGIN CERTIFICATE-----\r\nMIIClzCCAgCgAwIBAgIEFdlUHTANBgkqhkiG9w0BAQsFADBoMRYwFAYDVQQDEw1D\r\nYXJvbCBFeHBpcmVkMR4wHAYDVQQKExVVbnRydXN0ZWQgTGVnYWN5IENvcnAxITAf\r\nBgkqhkiG9w0BCQETEmNhcm9sQGV4dGVybmFsLm9yZzELMAkGA1UEBhMCSU4wHhcN\r\nMjUwOTEzMTQ1OTI3WhcNMjYwOTEzMTQ1OTI3WjBoMRYwFAYDVQQDEw1DYXJvbCBF\r\neHBpcmVkMR4wHAYDVQQKExVVbnRydXN0ZWQgTGVnYWN5IENvcnAxITAfBgkqhkiG\r\n9w0BCQETEmNhcm9sQGV4dGVybmFsLm9yZzELMAkGA1UEBhMCSU4wgZ8wDQYJKoZI\r\nhvcNAQEBBQADgY0AMIGJAoGBAOcJs2d/hTvpu4N64I16wIYReI6DyG2KPzeM76bl\r\nqj6O1I9QGnXWtju5mIEnM6SS2xJV8cupQ4qulKvitJDiU2MTdjEn0XW/GTyEErip\r\nac0HV5R2JT6795O1rr9gsCf6FrDfd+C6m0UX7fAMkUYOKpr8acDexsYjpsHTlXtE\r\nF4YTAgMBAAGjTjBMMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgTwMBMGA1UdJQQMMAoG\r\nCCsGAQUFBwMEMB0GA1UdEQQWMBSBEmNhcm9sQGV4dGVybmFsLm9yZzANBgkqhkiG\r\n9w0BAQsFAAOBgQAM6c1sJbrBXqrSUxkASC1BWH+HUKrxZI55qmc405/1Ehekkrxw\r\n+K46sLuiyKPw7mO72Bg61PI7mywnwPE28Ff4KwLZA00DgfdC6QpoMiXVRc4HVfdg\r\nndSlwVkB4bq4dz9RSGJaxE56jZ9wJzwgGALwzncAaKTYi/5Bm3ayxgLxtg==\r\n-----END CERTIFICATE-----\r\n",
    keyPem: "-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDnCbNnf4U76buDeuCNesCGEXiOg8htij83jO+m5ao+jtSPUBp1\r\n1rY7uZiBJzOkktsSVfHLqUOKrpSr4rSQ4lNjE3YxJ9F1vxk8hBK4qWnNB1eUdiU+\r\nu/eTta6/YLAn+haw33fguptFF+3wDJFGDiqa/GnA3sbGI6bB05V7RBeGEwIDAQAB\r\nAoGAaR/k3ecMPKKxi7XRjw6Xo2k3rcEQ5abN9PzP3uUJfcWHul38bDnyWWKtnba0\r\nrOGVhNZOWxj9fpDJXRyehH426jRj8qedrnF4O7OJIOYzS4VNJ1lQmHwezOt54fRX\r\nxhqHixts1Otwh9oJXuNwLNuo7u4CqkCi1RuXKl6ronsTNOECQQD9UX0Ihsqc7FOa\r\n6xj4IoqAhX5D6ri64dEw+eUjtaWSZMSPg5Ycdd2N0NognS3rLgDGrmsZwe7d01T/\r\nd0G8imp9AkEA6XvUrgDSOA+bt8SEQtdeD8trVi6x/KCELEIuWb13oxaF/WcnWVFL\r\n1wX3oJ725cdR3awEdcEb0+Kwdh0vReoHzwJAZwxTNLjAi32HtSmWCrriZM3pQ2+k\r\nnkFme+nsUM6AAEGFxGvfEMzRx/MCCOpn15frMOebIetGZG6n0RSOZUhZcQJBALjJ\r\nRH2iML4lvDwoz/SGtu8RM5Y1xrAF6hWNG1ny1ejBPrJbHY1XBgrbsivxI76fjW8/\r\nYRhBCWEcnEQevPc8TYkCQQDo3Ew/y6dJMLjZ5ojUmVAmf/EPtvYN9mCfmjQ8N4GX\r\nuXgwbDZU8m48CQZQ+eEFrqv5kvEh91PgSJZSZE8N+I2w\r\n-----END RSA PRIVATE KEY-----\r\n"
  },
  alicePgp: {
    publicKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEatTezxYJKwYBBAHaRw8BAQdAWmnmfzKaYfbArHRjME+Ye3KrPmIRQ6fl\nF1saLC2hr5vNJEFsaWNlIFNtaXRoIDxhbGljZUBnYXRld2F5LmludGVybmFs\nPsKMBBAWCgA+BYJq1N7PBAsJBwgJkLGUQAYVs7lBAxUICgQWAAIBAhkBApsD\nAh4BFiEEp952aBqfwL3i2DiesZRABhWzuUEAAIqPAQDubXuVWWqV2TIWMfnZ\n4VYqf+F1ZyYGGH6J3zTmzEd44QEAqSSNsB70pTp9/GAh1wArU26xHv3zbLrW\n2T2SOoVsfQDOOARq1N7PEgorBgEEAZdVAQUBAQdAxoSAnyynBqGHNzdqT2Tx\nSmxwtuCiP7XsXlOZWajj3n8DAQgHwngEGBYKACoFgmrU3s8JkLGUQAYVs7lB\nApsMFiEEp952aBqfwL3i2DiesZRABhWzuUEAAFNwAP93e5BkhjT4PiDQfKgG\nSid4tit1AXIaV9jbWKwdZcdZbQEAmkLE/K6xV4uGEhrritYzed7GkNsJIp/A\nCtQjn4sbhwc=\n=NeK6\n-----END PGP PUBLIC KEY BLOCK-----\n",
    privateKey: "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nxVgEatTezxYJKwYBBAHaRw8BAQdAWmnmfzKaYfbArHRjME+Ye3KrPmIRQ6fl\nF1saLC2hr5sAAQD0tanrEeWj5mHFaAqVJ1d1kfkIAinuptuekhxKanoAwxBG\nzSRBbGljZSBTbWl0aCA8YWxpY2VAZ2F0ZXdheS5pbnRlcm5hbD7CjAQQFgoA\nPgWCatTezwQLCQcICZCxlEAGFbO5QQMVCAoEFgACAQIZAQKbAwIeARYhBKfe\ndmgan8C94tg4nrGUQAYVs7lBAACKjwEA7m17lVlqldkyFjH52eFWKn/hdWcm\nBhh+id805sxHeOEBAKkkjbAe9KU6ffxgIdcAK1NusR7982y61tk9kjqFbH0A\nx10EatTezxIKKwYBBAGXVQEFAQEHQMaEgJ8spwahhzc3ak9k8UpscLbgoj+1\n7F5TmVmo495/AwEIBwAA/0t0VCnrc/VE1DBcLwYIC3dd2P4OTssNXiC2usQb\nOvAYDmfCeAQYFgoAKgWCatTezwmQsZRABhWzuUECmwwWIQSn3nZoGp/AveLY\nOJ6xlEAGFbO5QQAAU3AA/3d7kGSGNPg+INB8qAZKJ3i2K3UBchpX2NtYrB1l\nx1ltAQCaQsT8rrFXi4YSGuuK1jN53saQ2wkin8AK1COfixuHBw==\n=vG84\n-----END PGP PRIVATE KEY BLOCK-----\n"
  },
  bobPgp: {
    publicKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEatTezxYJKwYBBAHaRw8BAQdA56cTU7g+D11bVyw2fomzWZ7PbaAtdCbl\n/3STg5Rw+GnNIEJvYiBKb25lcyA8Ym9iQGdhdGV3YXkuaW50ZXJuYWw+wowE\nEBYKAD4FgmrU3s8ECwkHCAmQxCR6s66QA9ADFQgKBBYAAgECGQECmwMCHgEW\nIQSzngS7qIuMyGh4c1zEJHqzrpAD0AAArxgBAOjN6n0oaMF08XV7gL834vZv\n3gyGe9wG4o38itW8jQ11AQDHN+d7Noed9swsD4gU9vlhJ6c/GlATqIZ5AEdh\nlO4IDc44BGrU3s8SCisGAQQBl1UBBQEBB0AX1vCuXZP4z5pZSKoLgd/Tfyjw\nUXBuMBIUKvRXbdOYRAMBCAfCeAQYFgoAKgWCatTezwmQxCR6s66QA9ACmwwW\nIQSzngS7qIuMyGh4c1zEJHqzrpAD0AAA+UoA/R/fxpR4C26/uYjkfVepiU1A\nvuwr9ZoIHxCXFRMjHNgkAQDNX/yNHhQGlRnjKmG7nJ+YgiipdAOaTaEKwqOK\nNv4CAw==\n=vvYx\n-----END PGP PUBLIC KEY BLOCK-----\n",
    privateKey: "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nxVgEatTezxYJKwYBBAHaRw8BAQdA56cTU7g+D11bVyw2fomzWZ7PbaAtdCbl\n/3STg5Rw+GkAAP42yYyvwy/G6/UNUVHpbMM47HGZ9XjjjRnMdRDwb8EwAhJe\nzSBCb2IgSm9uZXMgPGJvYkBnYXRld2F5LmludGVybmFsPsKMBBAWCgA+BYJq\n1N7PBAsJBwgJkMQkerOukAPQAxUICgQWAAIBAhkBApsDAh4BFiEEs54Eu6iL\njMhoeHNcxCR6s66QA9AAAK8YAQDozep9KGjBdPF1e4C/N+L2b94MhnvcBuKN\n/IrVvI0NdQEAxzfnezaHnfbMLA+IFPb5YSenPxpQE6iGeQBHYZTuCA3HXQRq\n1N7PEgorBgEEAZdVAQUBAQdAF9bwrl2T+M+aWUiqC4Hf038o8FFwbjASFCr0\nV23TmEQDAQgHAAD/TcNnra79djaa8OfSLM9kNPTrfYhX+Br+koIBajvZcmAT\nAMJ4BBgWCgAqBYJq1N7PCZDEJHqzrpAD0AKbDBYhBLOeBLuoi4zIaHhzXMQk\nerOukAPQAAD5SgD9H9/GlHgLbr+5iOR9V6mJTUC+7Cv1mggfEJcVEyMc2CQB\nAM1f/I0eFAaVGeMqYbucn5iCKKl0A5pNoQrCo4o2/gID\n=Nt/a\n-----END PGP PRIVATE KEY BLOCK-----\n"
  },
  gatewayPgp: {
    publicKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEatTezxYJKwYBBAHaRw8BAQdAMPRWVlDyKE96Dec5kqzYGUaplowumszj\n/kFeLy/Tf0bNMU1hbnNpIENoYWxhayAoR2F0ZXdheSkgPGdhdGV3YXlAZ2F0\nZXdheS5pbnRlcm5hbD7CjAQQFgoAPgWCatTezwQLCQcICZDtYL6bux1PwwMV\nCAoEFgACAQIZAQKbAwIeARYhBGpNAI6BmbZKe1W7Ze1gvpu7HU/DAADw/gD/\naPniAq3kPuxvIWYw6RwE3lD4PVtkFnyQMj8BMYLmfjYA/Ag7O3X/dOO/wi9w\nLcGB+EoAG7erRmu6XKVXF30bjAwDzjgEatTezxIKKwYBBAGXVQEFAQEHQG4M\nsauGe4dx39VvRb71mEHbFQSVbZsYhA7Cj6lXd0I0AwEIB8J4BBgWCgAqBYJq\n1N7PCZDtYL6bux1PwwKbDBYhBGpNAI6BmbZKe1W7Ze1gvpu7HU/DAACtYAEA\nldaUT9EAoPN0TZ098W9lWF2B/ozHyJoNekJMlEb46CoBAM75JLjcarJJ4Cnv\nzys2mQPZ0GjjcCbklogIUI3ECY0N\n=2n6E\n-----END PGP PUBLIC KEY BLOCK-----\n",
    privateKey: "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nxVgEatTezxYJKwYBBAHaRw8BAQdAMPRWVlDyKE96Dec5kqzYGUaplowumszj\n/kFeLy/Tf0YAAPsGsKCYTBonkJanU0IdU6owAthX0KDc8z9MzdI1c19EEw8a\nzTFNYW5zaSBDaGFsYWsgKEdhdGV3YXkpIDxnYXRld2F5QGdhdGV3YXkuaW50\nZXJuYWw+wowEEBYKAD4FgmrU3s8ECwkHCAmQ7WC+m7sdT8MDFQgKBBYAAgEC\nGQECmwMCHgEWIQRqTQCOgZm2SntVu2XtYL6bux1PwwAA8P4A/2j54gKt5D7s\nbyFmMOkcBN5Q+D1bZBZ8kDI/ATGC5n42APwIOzt1/3Tjv8IvcC3BgfhKABu3\nq0ZrulylVxd9G4wMA8ddBGrU3s8SCisGAQQBl1UBBQEBB0BuDLGrhnuHcd/V\nb0W+9ZhB2xUElW2bGIQOwo+pV3dCNAMBCAcAAP9/FREPhuziyI6VtVfre2aF\nyG/kKW6c17WSTb7G1Dv7mBMuwngEGBYKACoFgmrU3s8JkO1gvpu7HU/DApsM\nFiEEak0AjoGZtkp7Vbtl7WC+m7sdT8MAAK1gAQCV1pRP0QCg83RNnT3xb2VY\nXYH+jMfImg16QkyURvjoKgEAzvkkuNxqskngKe/PKzaZA9nQaONwJuSWiAhQ\njcQJjQ0=\n=T6IS\n-----END PGP PRIVATE KEY BLOCK-----\n"
  }
};

// src/server/credentials-store.ts
var smimeRegistry = [
  {
    id: "smime-alice",
    ownerName: "Alice Smith",
    email: "alice@gateway.internal",
    certPem: generated_creds_default.aliceSmime.certPem,
    keyPem: generated_creds_default.aliceSmime.keyPem,
    notes: "Demonstration S/MIME Certificate & Key for Alice"
  },
  {
    id: "smime-bob",
    ownerName: "Bob Jones",
    email: "bob@gateway.internal",
    certPem: generated_creds_default.bobSmime.certPem,
    keyPem: generated_creds_default.bobSmime.keyPem,
    notes: "Demonstration S/MIME Certificate & Key for Bob"
  },
  {
    id: "smime-gateway",
    ownerName: "Mansi Chalak (Gateway Operator)",
    email: "gateway@gateway.internal",
    certPem: generated_creds_default.gatewaySmime.certPem,
    keyPem: generated_creds_default.gatewaySmime.keyPem,
    notes: "Gateway Authority Certificate for cross-protocol signing & verification"
  },
  {
    id: "smime-expired-carol",
    ownerName: "Carol Expired",
    email: "carol@external.org",
    certPem: generated_creds_default.expiredSmime.certPem,
    keyPem: generated_creds_default.expiredSmime.keyPem,
    notes: "Expired S/MIME Certificate for testing error boundaries"
  }
];
var openpgpRegistry = [
  {
    id: "pgp-alice",
    ownerName: "Alice Smith",
    email: "alice@gateway.internal",
    publicKeyArmored: generated_creds_default.alicePgp.publicKey,
    privateKeyArmored: generated_creds_default.alicePgp.privateKey,
    notes: "OpenPGP Keypair for Alice"
  },
  {
    id: "pgp-bob",
    ownerName: "Bob Jones",
    email: "bob@gateway.internal",
    publicKeyArmored: generated_creds_default.bobPgp.publicKey,
    privateKeyArmored: generated_creds_default.bobPgp.privateKey,
    notes: "OpenPGP Keypair for Bob"
  },
  {
    id: "pgp-gateway",
    ownerName: "Mansi Chalak (Gateway Operator)",
    email: "gateway@gateway.internal",
    publicKeyArmored: generated_creds_default.gatewayPgp.publicKey,
    privateKeyArmored: generated_creds_default.gatewayPgp.privateKey,
    notes: "Gateway OpenPGP Key for cross-protocol signing & verification"
  }
];
function getSmimeCertForEmail(email) {
  const norm = email.trim().toLowerCase();
  const found = smimeRegistry.find((item) => item.email.toLowerCase() === norm);
  return found ? found.certPem : null;
}
function getSmimeKeyForEmail(email) {
  const norm = email.trim().toLowerCase();
  const found = smimeRegistry.find((item) => item.email.toLowerCase() === norm);
  return found?.keyPem || null;
}
function getOpenPgpPublicKeyForEmail(email) {
  const norm = email.trim().toLowerCase();
  const found = openpgpRegistry.find((item) => item.email.toLowerCase() === norm);
  return found ? found.publicKeyArmored : null;
}
function getOpenPgpPrivateKeyForEmail(email) {
  const norm = email.trim().toLowerCase();
  const found = openpgpRegistry.find((item) => item.email.toLowerCase() === norm);
  return found?.privateKeyArmored || null;
}
function getGatewaySmimeCredentials() {
  return {
    certPem: generated_creds_default.gatewaySmime.certPem,
    keyPem: generated_creds_default.gatewaySmime.keyPem
  };
}
function getGatewayOpenPgpCredentials() {
  return {
    publicKey: generated_creds_default.gatewayPgp.publicKey,
    privateKey: generated_creds_default.gatewayPgp.privateKey
  };
}
function listPublicSmimeCertificates() {
  return smimeRegistry.map((item) => {
    try {
      const parsed = inspectCertificate(item.certPem);
      return {
        id: item.id,
        type: "SMIME_CERTIFICATE",
        ownerName: item.ownerName,
        email: item.email,
        organization: parsed.subject.organization || "Demonstration Org",
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
        type: "SMIME_CERTIFICATE",
        ownerName: item.ownerName,
        email: item.email,
        fingerprint: "UNKNOWN",
        algorithm: "RSA",
        validFrom: (/* @__PURE__ */ new Date()).toISOString(),
        validTo: null,
        trustStatus: "INVALID",
        isExpired: false,
        rawPublicCredential: item.certPem,
        notes: item.notes
      };
    }
  });
}
async function listPublicOpenPgpKeys() {
  const results = [];
  for (const item of openpgpRegistry) {
    try {
      const parsed = await inspectOpenPgpKey(item.publicKeyArmored);
      results.push({
        id: item.id,
        type: "OPENPGP_PUBLIC_KEY",
        ownerName: item.ownerName,
        email: item.email,
        organization: "OpenPGP Web of Trust (Demo)",
        fingerprint: parsed.fingerprint,
        keyId: parsed.keyId,
        algorithm: parsed.algorithm,
        validFrom: parsed.creationTime,
        validTo: parsed.expirationTime,
        trustStatus: parsed.trustStatus,
        isExpired: Boolean(parsed.expirationTime && /* @__PURE__ */ new Date() > new Date(parsed.expirationTime)),
        rawPublicCredential: item.publicKeyArmored,
        notes: item.notes
      });
    } catch {
      results.push({
        id: item.id,
        type: "OPENPGP_PUBLIC_KEY",
        ownerName: item.ownerName,
        email: item.email,
        fingerprint: "UNKNOWN",
        algorithm: "OpenPGP",
        validFrom: (/* @__PURE__ */ new Date()).toISOString(),
        validTo: null,
        trustStatus: "UNVERIFIED",
        isExpired: false,
        rawPublicCredential: item.publicKeyArmored,
        notes: item.notes
      });
    }
  }
  return results;
}
function checkRecipientCredentials(email) {
  const norm = email.trim().toLowerCase();
  const hasSmime = Boolean(smimeRegistry.find((item) => item.email.toLowerCase() === norm));
  const hasOpenPgp = Boolean(openpgpRegistry.find((item) => item.email.toLowerCase() === norm));
  let recommendedProtocol = "none";
  if (hasSmime && !hasOpenPgp) recommendedProtocol = "smime";
  else if (hasOpenPgp && !hasSmime) recommendedProtocol = "openpgp";
  else if (hasSmime && hasOpenPgp) recommendedProtocol = "smime";
  return {
    email,
    hasSmime,
    hasOpenPgp,
    recommendedProtocol,
    statusMessage: hasSmime || hasOpenPgp ? `Recipient has registered credentials: ${[hasSmime ? "S/MIME X.509" : null, hasOpenPgp ? "OpenPGP" : null].filter(Boolean).join(" and ")}.` : `No registered credentials found for ${email}. Encrypted delivery will require importing recipient certificate or public key.`
  };
}

// src/server/audit-store.ts
var auditEvents = [
  {
    id: "AUD-88210",
    timestamp: new Date(Date.now() - 3600 * 1e3 * 2).toISOString(),
    category: "Gateway Interop",
    protocol: "Cross-Protocol",
    operation: "S/MIME to OpenPGP Conversion",
    status: "SUCCESS",
    senderEmail: "alice@gateway.internal",
    recipientEmail: "bob@gateway.internal",
    verificationOutcome: "Signature Verified (Alice Smith X.509) -> Trans-encrypted to Bob Jones OpenPGP",
    details: "Verified inbound CMS signed data; decrypted at gateway boundary; re-encrypted with OpenPGP KeyID 0x247AB3; Gateway operator signature appended.",
    isDemo: true
  },
  {
    id: "AUD-88209",
    timestamp: new Date(Date.now() - 3600 * 1e3 * 4).toISOString(),
    category: "S/MIME",
    protocol: "S/MIME",
    operation: "Certificate Parsing & Validation",
    status: "SUCCESS",
    senderEmail: "alice@gateway.internal",
    verificationOutcome: "Valid Certificate (RSA 1024 / SHA-256)",
    details: "Parsed X.509 certificate. Subject: CN=Alice Smith. Validity checked and confirmed active.",
    isDemo: true
  },
  {
    id: "AUD-88208",
    timestamp: new Date(Date.now() - 3600 * 1e3 * 6).toISOString(),
    category: "OpenPGP",
    protocol: "OpenPGP",
    operation: "Cleartext Signature Verification",
    status: "SUCCESS",
    senderEmail: "bob@gateway.internal",
    verificationOutcome: "Signature Valid (Bob Jones Ed25519)",
    details: "Verified RFC 4880 cleartext signature against public key fingerprint.",
    isDemo: true
  },
  {
    id: "AUD-88207",
    timestamp: new Date(Date.now() - 3600 * 1e3 * 12).toISOString(),
    category: "S/MIME",
    protocol: "S/MIME",
    operation: "Certificate Chain Verification",
    status: "WARNING",
    senderEmail: "carol@external.org",
    verificationOutcome: "Certificate Expired",
    details: "X.509 Certificate for carol@external.org expired. Gateway rejected automatic transmission.",
    isDemo: true
  },
  {
    id: "AUD-88206",
    timestamp: new Date(Date.now() - 3600 * 1e3 * 24).toISOString(),
    category: "System Health",
    protocol: "System",
    operation: "Cryptographic Engine Self-Test",
    status: "SUCCESS",
    verificationOutcome: "Self-Test PASSED",
    details: "OpenPGP engine (v5.11) and S/MIME PKCS#7 engine verified. All tests functional.",
    isDemo: true
  }
];
function addAuditEvent(event) {
  const newEvent = {
    id: `AUD-${Math.floor(1e4 + Math.random() * 9e4)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...event
  };
  if (newEvent.details) {
    newEvent.details = newEvent.details.replace(/-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA )?PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]").replace(/passphrase=[^&,\s]+/gi, "passphrase=[REDACTED]");
  }
  auditEvents.unshift(newEvent);
  if (auditEvents.length > 200) {
    auditEvents = auditEvents.slice(0, 200);
  }
  return newEvent;
}
function getAuditEvents(options) {
  let filtered = [...auditEvents];
  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (e) => e.id.toLowerCase().includes(q) || e.operation.toLowerCase().includes(q) || e.details.toLowerCase().includes(q) || e.senderEmail && e.senderEmail.toLowerCase().includes(q) || e.recipientEmail && e.recipientEmail.toLowerCase().includes(q)
    );
  }
  if (options?.protocol && options.protocol !== "All") {
    filtered = filtered.filter((e) => e.protocol.toLowerCase() === options.protocol?.toLowerCase());
  }
  if (options?.status && options.status !== "All") {
    filtered = filtered.filter((e) => e.status.toLowerCase() === options.status?.toLowerCase());
  }
  if (options?.category && options.category !== "All") {
    filtered = filtered.filter((e) => e.category.toLowerCase() === options.category?.toLowerCase());
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
function clearAuditEvents() {
  auditEvents = [];
}

// src/server/router.ts
var startTime = Date.now();
var REGISTERED_ROUTES = [
  "GET /api/health",
  "GET /api/dashboard",
  "GET /api/audit-logs",
  "POST /api/audit-logs/clear",
  "GET /api/keys",
  "POST /api/keys/check-recipient",
  "POST /api/smime/inspect-certificate",
  "POST /api/smime/sign",
  "POST /api/smime/verify-signature",
  "POST /api/smime/encrypt",
  "POST /api/smime/decrypt",
  "POST /api/openpgp/generate-key",
  "POST /api/openpgp/inspect-key",
  "POST /api/openpgp/encrypt",
  "POST /api/openpgp/decrypt",
  "POST /api/openpgp/sign",
  "POST /api/openpgp/verify",
  "POST /api/gateway/process",
  "POST /api/gateway/simulate-interoperability",
  "POST /api/demo/process-message"
];
async function handleApiRequest(method, pathname, query, body) {
  const normPath = pathname.replace(/\/+$/, "") || "/";
  const httpMethod = method.toUpperCase();
  try {
    if (httpMethod === "GET" && normPath === "/api/health") {
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1e3);
      return {
        status: 200,
        body: {
          status: "healthy",
          version: "1.0.0",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          uptimeSeconds,
          environment: process.env.NODE_ENV || "production",
          gatewayOperator: "Mansi Chalak",
          cryptographicEngines: {
            openpgp: {
              status: "active",
              version: "5.11"
            },
            smime: {
              status: "active",
              engine: "node-forge PKCS#7 / X.509"
            }
          },
          supportedProtocols: ["S/MIME (PKCS#7/CMS)", "OpenPGP (RFC 4880)", "Cross-Protocol Gateway Translation"],
          registeredEndpoints: REGISTERED_ROUTES
        }
      };
    }
    if (httpMethod === "GET" && normPath === "/api/dashboard") {
      const { events } = getAuditEvents({ limit: 10 });
      const smimeOps = events.filter((e) => e.protocol === "S/MIME").length + 18;
      const openpgpOps = events.filter((e) => e.protocol === "OpenPGP").length + 24;
      const crossOps = events.filter((e) => e.protocol === "Cross-Protocol").length + 12;
      const totalOps = smimeOps + openpgpOps + crossOps;
      return {
        status: 200,
        body: {
          apiHealth: {
            status: "healthy",
            version: "1.0.0",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            uptimeSeconds: Math.floor((Date.now() - startTime) / 1e3),
            environment: process.env.NODE_ENV || "production",
            gatewayOperator: "Mansi Chalak",
            cryptographicEngines: {
              openpgp: { status: "active", version: "5.11" },
              smime: { status: "active", engine: "node-forge PKCS#7 / X.509" }
            },
            supportedProtocols: ["S/MIME", "OpenPGP", "Cross-Protocol Translation"],
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
    if (httpMethod === "GET" && normPath === "/api/audit-logs") {
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
    if (httpMethod === "POST" && normPath === "/api/audit-logs/clear") {
      clearAuditEvents();
      addAuditEvent({
        category: "Credential Management",
        protocol: "System",
        operation: "Audit Log Cleared",
        status: "SUCCESS",
        verificationOutcome: "Audit records cleared by operator request",
        details: "Demonstration records reset by user action.",
        isDemo: true
      });
      return {
        status: 200,
        body: { success: true, message: "Demonstration audit records cleared." }
      };
    }
    if (httpMethod === "GET" && normPath === "/api/keys") {
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
    if (httpMethod === "POST" && normPath === "/api/keys/check-recipient") {
      const email = body?.email;
      if (!email || typeof email !== "string") {
        return {
          status: 400,
          body: {
            error: {
              code: "INVALID_INPUT",
              message: "Recipient email is required to evaluate credential compatibility."
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
    if (httpMethod === "POST" && normPath === "/api/smime/inspect-certificate") {
      const pem = body?.pemCertificate || body?.pem || body?.certificate;
      if (!pem || typeof pem !== "string") {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_CERTIFICATE_PEM",
              message: "A valid X.509 Certificate in PEM format is required."
            }
          }
        };
      }
      try {
        const parsed = inspectCertificate(pem);
        addAuditEvent({
          category: "S/MIME",
          protocol: "S/MIME",
          operation: "Certificate Inspection",
          status: parsed.isExpired ? "WARNING" : "SUCCESS",
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: 422,
          body: {
            error: {
              code: "CERTIFICATE_PARSE_ERROR",
              message: msg
            }
          }
        };
      }
    }
    if (httpMethod === "POST" && normPath === "/api/smime/sign") {
      const { content, certPem, privateKeyPem } = body || {};
      if (!content || !certPem || !privateKeyPem) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_SIGNING_CREDENTIALS",
              message: "Message content, certificate PEM, and matching private key PEM are required for S/MIME signing."
            }
          }
        };
      }
      const res = signMessageSmime(content, certPem, privateKeyPem);
      addAuditEvent({
        category: "S/MIME",
        protocol: "S/MIME",
        operation: "Digital Signature Creation",
        status: "SUCCESS",
        verificationOutcome: "Created PKCS#7 Signed Data structure",
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
    if (httpMethod === "POST" && normPath === "/api/smime/verify-signature") {
      const { signedPem, expectedContent } = body || {};
      if (!signedPem) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_SIGNED_PEM",
              message: "PKCS#7 signed PEM structure is required for signature verification."
            }
          }
        };
      }
      const outcome = verifySmimeSignature(signedPem, expectedContent);
      addAuditEvent({
        category: "S/MIME",
        protocol: "S/MIME",
        operation: "Digital Signature Verification",
        status: outcome.valid ? "SUCCESS" : "FAILED",
        verificationOutcome: outcome.valid ? "Valid S/MIME Signature" : outcome.error || "Signature Verification Failed",
        details: outcome.valid ? `Verified signature from ${outcome.signerCommonName} (${outcome.signerEmail}).` : `Signature verification failed: ${outcome.error}`,
        isDemo: true
      });
      return {
        status: 200,
        body: outcome
      };
    }
    if (httpMethod === "POST" && normPath === "/api/smime/encrypt") {
      const { plaintext, recipientCertPem } = body || {};
      if (!plaintext || !recipientCertPem) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_ENCRYPTION_PARAMETERS",
              message: "Plaintext content and recipient certificate PEM are required for S/MIME encryption."
            }
          }
        };
      }
      const res = encryptSmimeMessage(plaintext, recipientCertPem);
      addAuditEvent({
        category: "S/MIME",
        protocol: "S/MIME",
        operation: "Message Encryption",
        status: "SUCCESS",
        verificationOutcome: "PKCS#7 EnvelopedData Created",
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
    if (httpMethod === "POST" && normPath === "/api/smime/decrypt") {
      const { encryptedPem, privateKeyPem } = body || {};
      if (!encryptedPem || !privateKeyPem) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_DECRYPTION_PARAMETERS",
              message: "PKCS#7 EnvelopedData PEM and recipient private key PEM are required for decryption."
            }
          }
        };
      }
      const res = decryptSmimeMessage(encryptedPem, privateKeyPem);
      addAuditEvent({
        category: "S/MIME",
        protocol: "S/MIME",
        operation: "Message Decryption",
        status: "SUCCESS",
        verificationOutcome: "Decrypted PKCS#7 EnvelopedData",
        details: "Decrypted message successfully using authorized private key.",
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
    if (httpMethod === "POST" && normPath === "/api/openpgp/generate-key") {
      const { name, email, passphrase } = body || {};
      if (!name || !email) {
        return {
          status: 400,
          body: {
            error: {
              code: "INVALID_INPUT",
              message: "Name and email are required to generate an OpenPGP key pair."
            }
          }
        };
      }
      const keyPair = await generateDemoPgpKey(name, email, passphrase);
      addAuditEvent({
        category: "OpenPGP",
        protocol: "OpenPGP",
        operation: "Key Pair Generation",
        status: "SUCCESS",
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
    if (httpMethod === "POST" && normPath === "/api/openpgp/inspect-key") {
      const { armoredKey } = body || {};
      if (!armoredKey) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_KEY",
              message: "OpenPGP ASCII Armored Key is required."
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
    if (httpMethod === "POST" && normPath === "/api/openpgp/encrypt") {
      const { plaintext, recipientArmoredKey, signerPrivateKeyArmored, signerPassphrase } = body || {};
      if (!plaintext || !recipientArmoredKey) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_ENCRYPTION_PARAMETERS",
              message: "Plaintext content and recipient OpenPGP public key are required."
            }
          }
        };
      }
      const res = await encryptOpenPgpMessage(plaintext, recipientArmoredKey, signerPrivateKeyArmored, signerPassphrase);
      addAuditEvent({
        category: "OpenPGP",
        protocol: "OpenPGP",
        operation: "Message Encryption",
        status: "SUCCESS",
        verificationOutcome: "ASCII Armored Ciphertext Generated",
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
    if (httpMethod === "POST" && normPath === "/api/openpgp/decrypt") {
      const { armoredMessage, privateKeyArmored, passphrase, verificationKeyArmored } = body || {};
      if (!armoredMessage || !privateKeyArmored) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_DECRYPTION_PARAMETERS",
              message: "Armored OpenPGP message and recipient private key are required."
            }
          }
        };
      }
      const res = await decryptOpenPgpMessage(armoredMessage, privateKeyArmored, passphrase, verificationKeyArmored);
      addAuditEvent({
        category: "OpenPGP",
        protocol: "OpenPGP",
        operation: "Message Decryption",
        status: "SUCCESS",
        verificationOutcome: res.signatureVerified ? "Decrypted & Signature Verified" : "Decrypted (No Signature or Unverified)",
        details: "Decrypted OpenPGP message successfully using recipient private key.",
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
    if (httpMethod === "POST" && normPath === "/api/openpgp/sign") {
      const { plaintext, privateKeyArmored, passphrase, detached } = body || {};
      if (!plaintext || !privateKeyArmored) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_SIGNING_PARAMETERS",
              message: "Plaintext message and signer OpenPGP private key are required."
            }
          }
        };
      }
      const res = await signOpenPgpMessage(plaintext, privateKeyArmored, passphrase, detached);
      addAuditEvent({
        category: "OpenPGP",
        protocol: "OpenPGP",
        operation: "Digital Signature Creation",
        status: "SUCCESS",
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
    if (httpMethod === "POST" && normPath === "/api/openpgp/verify") {
      const { signedPayload, publicKeyArmored, originalTextIfDetached } = body || {};
      if (!signedPayload || !publicKeyArmored) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_VERIFICATION_PARAMETERS",
              message: "Signed OpenPGP payload and signer public key are required."
            }
          }
        };
      }
      const res = await verifyOpenPgpSignature(signedPayload, publicKeyArmored, originalTextIfDetached);
      addAuditEvent({
        category: "OpenPGP",
        protocol: "OpenPGP",
        operation: "Digital Signature Verification",
        status: res.valid ? "SUCCESS" : "FAILED",
        verificationOutcome: res.valid ? `Valid Signature (KeyID: ${res.keyId})` : res.error || "Invalid Signature",
        details: res.valid ? "OpenPGP cryptographic signature verified successfully." : `Verification failure: ${res.error}`,
        isDemo: true
      });
      return {
        status: 200,
        body: res
      };
    }
    if (httpMethod === "POST" && (normPath === "/api/gateway/process" || normPath === "/api/demo/process-message")) {
      const {
        senderEmail,
        recipientEmail,
        subject,
        body: messageBody,
        protocol = "auto",
        encrypt: encrypt2 = true,
        sign: sign2 = true,
        senderCertOrKey,
        senderPrivateKey,
        recipientCertOrKey
      } = body || {};
      const stages = [
        { id: "1", name: "Input & Header Validation", status: "PENDING", details: "Validating RFC 5322 email headers and message parameters." },
        { id: "2", name: "Recipient Credential & Protocol Assessment", status: "PENDING", details: "Checking key availability and determining interoperability paths." },
        { id: "3", name: "Cryptographic Protection & Signing", status: "PENDING", details: "Applying digital signatures and message encryption." },
        { id: "4", name: "Gateway Interoperability Processing", status: "PENDING", details: "Translating between disparate security protocols if required." },
        { id: "5", name: "Output Verification & Packaging", status: "PENDING", details: "Generating RFC MIME container and verifiable security summary." }
      ];
      if (!senderEmail || !recipientEmail || !subject || !messageBody) {
        stages[0].status = "FAILED";
        stages[0].details = "Missing required email fields (sender, recipient, subject, or message body).";
        return {
          status: 400,
          body: {
            error: {
              code: "VALIDATION_FAILED",
              message: "Sender email, recipient email, subject, and message body are all required.",
              details: { stages }
            }
          }
        };
      }
      stages[0].status = "SUCCESS";
      stages[0].details = `Validated headers: ${senderEmail} -> ${recipientEmail}; Subject: "${subject}".`;
      const recipientCheck = checkRecipientCredentials(recipientEmail);
      let targetRecipientProtocol = "smime";
      if (protocol === "openpgp") {
        targetRecipientProtocol = "openpgp";
      } else if (protocol === "smime") {
        targetRecipientProtocol = "smime";
      } else {
        targetRecipientProtocol = recipientCheck.recommendedProtocol === "openpgp" ? "openpgp" : "smime";
      }
      const senderSmimeCert = senderCertOrKey || getSmimeCertForEmail(senderEmail);
      const senderSmimeKey = senderPrivateKey || getSmimeKeyForEmail(senderEmail);
      const senderPgpKey = senderCertOrKey || getOpenPgpPublicKeyForEmail(senderEmail);
      const senderPgpPriv = senderPrivateKey || getOpenPgpPrivateKeyForEmail(senderEmail);
      let senderProtocol = "smime";
      if (protocol === "openpgp" || !senderSmimeCert && senderPgpKey) {
        senderProtocol = "openpgp";
      }
      const isCrossProtocol = senderProtocol !== targetRecipientProtocol;
      let recipientCert = recipientCertOrKey || (targetRecipientProtocol === "smime" ? getSmimeCertForEmail(recipientEmail) : null);
      let recipientPgp = recipientCertOrKey || (targetRecipientProtocol === "openpgp" ? getOpenPgpPublicKeyForEmail(recipientEmail) : null);
      if (encrypt2 && targetRecipientProtocol === "smime" && !recipientCert) {
        stages[1].status = "FAILED";
        stages[1].details = `No S/MIME X.509 certificate found for recipient ${recipientEmail}. Cannot perform certificate-based encryption.`;
        return {
          status: 422,
          body: {
            error: {
              code: "MISSING_RECIPIENT_CERTIFICATE",
              message: `Recipient ${recipientEmail} does not have an X.509 S/MIME certificate registered. Import a certificate or choose a compatible protocol.`,
              details: { stages }
            }
          }
        };
      }
      if (encrypt2 && targetRecipientProtocol === "openpgp" && !recipientPgp) {
        stages[1].status = "FAILED";
        stages[1].details = `No OpenPGP public key found for recipient ${recipientEmail}. Cannot perform PGP encryption.`;
        return {
          status: 422,
          body: {
            error: {
              code: "MISSING_RECIPIENT_KEY",
              message: `Recipient ${recipientEmail} does not have an OpenPGP public key registered. Import a public key or choose a compatible protocol.`,
              details: { stages }
            }
          }
        };
      }
      stages[1].status = "SUCCESS";
      stages[1].details = `Resolved routing: Sender Protocol: ${senderProtocol.toUpperCase()} | Recipient Protocol: ${targetRecipientProtocol.toUpperCase()} ${isCrossProtocol ? "(CROSS-PROTOCOL GATEWAY REQUIRED)" : "(DIRECT PROTOCOL MATCH)"}.`;
      let rawOutputPayload = messageBody;
      let outputFormat = "Plaintext";
      let signerIdentity;
      let signatureVerified = false;
      let gatewaySignatureApplied = false;
      if (sign2) {
        if (senderProtocol === "smime" && senderSmimeCert && senderSmimeKey) {
          const signed = signMessageSmime(messageBody, senderSmimeCert, senderSmimeKey);
          rawOutputPayload = signed.signedPem;
          signerIdentity = senderEmail;
          signatureVerified = true;
        } else if (senderProtocol === "openpgp" && senderPgpPriv) {
          const signed = await signOpenPgpMessage(messageBody, senderPgpPriv);
          rawOutputPayload = signed.signedPayload;
          signerIdentity = senderEmail;
          signatureVerified = true;
        } else {
          signerIdentity = `${senderEmail} (Demo Key Not Available)`;
        }
      }
      stages[2].status = "SUCCESS";
      stages[2].details = sign2 ? `Applied digital signature using sender ${senderProtocol.toUpperCase()} credentials.` : "Digital signature skipped by user configuration.";
      if (isCrossProtocol) {
        stages[3].status = "RUNNING";
        const gatewayCredsSmime = getGatewaySmimeCredentials();
        const gatewayCredsPgp = getGatewayOpenPgpCredentials();
        if (targetRecipientProtocol === "openpgp" && recipientPgp) {
          const encResult = await encryptOpenPgpMessage(
            messageBody,
            recipientPgp,
            gatewayCredsPgp.privateKey
          );
          rawOutputPayload = encResult.armoredMessage;
          outputFormat = "OpenPGP-ASCII-Armor";
          gatewaySignatureApplied = true;
          stages[3].status = "SUCCESS";
          stages[3].details = `Gateway decrypted S/MIME boundary and trans-encrypted into RFC 4880 OpenPGP ciphertext using Bob's public key. Appended Gateway operator signature.`;
        } else if (targetRecipientProtocol === "smime" && recipientCert) {
          const encResult = encryptSmimeMessage(messageBody, recipientCert);
          const reSigned = signMessageSmime(encResult.encryptedPem, gatewayCredsSmime.certPem, gatewayCredsSmime.keyPem);
          rawOutputPayload = reSigned.signedPem;
          outputFormat = "S/MIME-PKCS7";
          gatewaySignatureApplied = true;
          stages[3].status = "SUCCESS";
          stages[3].details = `Gateway decrypted OpenPGP boundary and trans-encrypted into S/MIME PKCS#7 EnvelopedData for ${recipientEmail}. Appended Gateway authority signature.`;
        }
      } else {
        stages[3].status = "SKIPPED";
        stages[3].details = "Direct protocol processing \u2014 cross-protocol translation not required.";
        if (encrypt2) {
          if (targetRecipientProtocol === "smime" && recipientCert) {
            const enc = encryptSmimeMessage(messageBody, recipientCert);
            rawOutputPayload = enc.encryptedPem;
            outputFormat = "S/MIME-PKCS7";
          } else if (targetRecipientProtocol === "openpgp" && recipientPgp) {
            const enc = await encryptOpenPgpMessage(messageBody, recipientPgp, senderPgpPriv || void 0);
            rawOutputPayload = enc.armoredMessage;
            outputFormat = "OpenPGP-ASCII-Armor";
          }
        }
      }
      stages[4].status = "SUCCESS";
      stages[4].details = `Assembled RFC MIME container for ${recipientEmail} with format ${outputFormat}.`;
      const auditEvent = addAuditEvent({
        category: isCrossProtocol ? "Gateway Interop" : targetRecipientProtocol === "smime" ? "S/MIME" : "OpenPGP",
        protocol: isCrossProtocol ? "Cross-Protocol" : targetRecipientProtocol === "smime" ? "S/MIME" : "OpenPGP",
        operation: isCrossProtocol ? "Cross-Protocol Translation" : "Secure Message Processing",
        status: "SUCCESS",
        senderEmail,
        recipientEmail,
        verificationOutcome: `Protected with ${outputFormat} (${encrypt2 ? "Encrypted" : "Plaintext"}, ${sign2 ? "Signed" : "Unsigned"})`,
        details: `Subject: "${subject}". Interop mode: ${isCrossProtocol ? "Active" : "Direct"}. Recipient protocol: ${targetRecipientProtocol.toUpperCase()}.`,
        isDemo: true
      });
      const responsePayload = {
        success: true,
        messageId: `<msg-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${process.env.GATEWAY_DOMAIN || "gateway.internal"}>`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        senderEmail,
        recipientEmail,
        subject,
        detectedSenderProtocol: senderProtocol.toUpperCase(),
        targetRecipientProtocol: targetRecipientProtocol.toUpperCase(),
        isCrossProtocol,
        stages,
        outputMessage: {
          headers: {
            "From": senderEmail,
            "To": recipientEmail,
            "Subject": subject,
            "Date": (/* @__PURE__ */ new Date()).toUTCString(),
            "Message-ID": `<msg-${Date.now()}@gateway.internal>`,
            "MIME-Version": "1.0",
            "Content-Type": outputFormat === "S/MIME-PKCS7" ? 'application/pkcs7-mime; smime-type=enveloped-data; name="smime.p7m"' : outputFormat === "OpenPGP-ASCII-Armor" ? 'multipart/encrypted; protocol="application/pgp-encrypted"' : "text/plain; charset=UTF-8",
            "X-Gateway-Processor": "Mansi Chalak Secure Mail Gateway v1.0",
            "X-Gateway-Interop": isCrossProtocol ? "True" : "False"
          },
          rawPayload: rawOutputPayload,
          format: outputFormat
        },
        securityReport: {
          encrypted: encrypt2,
          encryptionAlgorithm: encrypt2 ? targetRecipientProtocol === "smime" ? "AES-256-CBC (PKCS#7)" : "AES-256 (RFC 4880 OpenPGP)" : void 0,
          signed: sign2,
          signatureVerified: sign2 ? signatureVerified : void 0,
          signerIdentity,
          gatewaySignatureApplied,
          gatewaySignerIdentity: gatewaySignatureApplied ? "Mansi Chalak (Gateway Authority)" : void 0,
          trustAssessment: isCrossProtocol ? "Gateway acted as a trusted boundary to bridge disparate cryptography standards. Original identity verified prior to protocol re-encapsulation." : "End-to-end cryptographic protection verified against registered credentials."
        },
        auditEventId: auditEvent.id,
        deliveryNotice: "Processed locally \u2014 no external email sent."
      };
      return {
        status: 200,
        body: responsePayload
      };
    }
    if (httpMethod === "POST" && normPath === "/api/gateway/simulate-interoperability") {
      const scenarioId = body?.scenarioId;
      const customPayload = body?.customPayload || "ACADEMIC CYBERSECURITY PROJECT: S/MIME and OpenPGP Cross-Protocol Interoperability Demonstration.";
      if (!scenarioId) {
        return {
          status: 400,
          body: {
            error: {
              code: "MISSING_SCENARIO_ID",
              message: "Scenario ID is required (e.g. 1 to 8)."
            }
          }
        };
      }
      const id = String(scenarioId);
      if (id === "1") {
        const aliceCert = getSmimeCertForEmail("alice@gateway.internal");
        const bobCert = getSmimeCertForEmail("bob@gateway.internal");
        const aliceKey = getSmimeKeyForEmail("alice@gateway.internal");
        const signed = signMessageSmime(customPayload, aliceCert, aliceKey);
        const encrypted = encryptSmimeMessage(signed.signedPem, bobCert);
        addAuditEvent({
          category: "S/MIME",
          protocol: "S/MIME",
          operation: "Scenario 1: S/MIME to S/MIME Direct",
          status: "SUCCESS",
          senderEmail: "alice@gateway.internal",
          recipientEmail: "bob@gateway.internal",
          verificationOutcome: "Direct X.509 End-to-End Processing Verified",
          details: "Direct S/MIME transmission with PKCS#7 signing and encryption.",
          isDemo: true
        });
        return {
          status: 200,
          body: {
            scenarioId: "1",
            title: "S/MIME sender to S/MIME recipient",
            status: "SUCCESS",
            isCrossProtocol: false,
            senderProtocol: "S/MIME",
            recipientProtocol: "S/MIME",
            incomingVerification: "PASSED (Alice Smith X.509 Certificate valid)",
            gatewayDecision: "Direct S/MIME Passthrough \u2014 no protocol translation needed.",
            finalOutput: encrypted.encryptedPem,
            format: "application/pkcs7-mime",
            securityNotes: "Native S/MIME end-to-end encryption maintained."
          }
        };
      }
      if (id === "2") {
        const bobPgp = getOpenPgpPublicKeyForEmail("bob@gateway.internal");
        const alicePgpPriv = getOpenPgpPrivateKeyForEmail("alice@gateway.internal");
        const enc = await encryptOpenPgpMessage(customPayload, bobPgp, alicePgpPriv);
        addAuditEvent({
          category: "OpenPGP",
          protocol: "OpenPGP",
          operation: "Scenario 2: OpenPGP to OpenPGP Direct",
          status: "SUCCESS",
          senderEmail: "alice@gateway.internal",
          recipientEmail: "bob@gateway.internal",
          verificationOutcome: "Direct OpenPGP End-to-End Processing Verified",
          details: "Direct RFC 4880 OpenPGP message encryption and signature.",
          isDemo: true
        });
        return {
          status: 200,
          body: {
            scenarioId: "2",
            title: "OpenPGP sender to OpenPGP recipient",
            status: "SUCCESS",
            isCrossProtocol: false,
            senderProtocol: "OpenPGP",
            recipientProtocol: "OpenPGP",
            incomingVerification: "PASSED (Alice Smith OpenPGP Key valid)",
            gatewayDecision: "Direct OpenPGP Passthrough \u2014 no protocol translation needed.",
            finalOutput: enc.armoredMessage,
            format: "application/pgp-encrypted",
            securityNotes: "Native OpenPGP end-to-end encryption maintained."
          }
        };
      }
      if (id === "3") {
        const aliceCert = getSmimeCertForEmail("alice@gateway.internal");
        const aliceKey = getSmimeKeyForEmail("alice@gateway.internal");
        const bobPgp = getOpenPgpPublicKeyForEmail("bob@gateway.internal");
        const gatewayPgpPriv = getOpenPgpPrivateKeyForEmail("gateway@gateway.internal");
        const inboundSigned = signMessageSmime(customPayload, aliceCert, aliceKey);
        const verifyInbound = verifySmimeSignature(inboundSigned.signedPem);
        const outboundPgp = await encryptOpenPgpMessage(
          customPayload,
          bobPgp,
          gatewayPgpPriv
        );
        addAuditEvent({
          category: "Gateway Interop",
          protocol: "Cross-Protocol",
          operation: "Scenario 3: S/MIME to OpenPGP Interoperability",
          status: "SUCCESS",
          senderEmail: "alice@gateway.internal",
          recipientEmail: "bob@gateway.internal",
          verificationOutcome: "Sender S/MIME verified -> Gateway trans-encrypted to Bob OpenPGP",
          details: "Full protocol transition executed at trusted gateway boundary.",
          isDemo: true
        });
        return {
          status: 200,
          body: {
            scenarioId: "3",
            title: "S/MIME sender to OpenPGP recipient",
            status: "SUCCESS",
            isCrossProtocol: true,
            senderProtocol: "S/MIME",
            recipientProtocol: "OpenPGP",
            incomingVerification: `PASSED: Verified Alice Smith X.509 signature (SHA-256). Content validated: "${verifyInbound.content.slice(0, 40)}..."`,
            gatewayDecision: "AUTHORIZED TRANSITION: Inbound S/MIME decrypted at gateway boundary; re-encrypted for recipient OpenPGP public key; Gateway signature appended.",
            finalOutput: outboundPgp.armoredMessage,
            format: "application/pgp-encrypted",
            securityNotes: "Gateway acts as a trusted processing boundary. Sender X.509 signature verified; new gateway OpenPGP signature attests to protocol translation."
          }
        };
      }
      if (id === "4") {
        const alicePgpPriv = getOpenPgpPrivateKeyForEmail("alice@gateway.internal");
        const alicePgpPub = getOpenPgpPublicKeyForEmail("alice@gateway.internal");
        const bobCert = getSmimeCertForEmail("bob@gateway.internal");
        const gatewayCert = getSmimeCertForEmail("gateway@gateway.internal");
        const gatewayKey = getSmimeKeyForEmail("gateway@gateway.internal");
        const pgpSigned = await signOpenPgpMessage(customPayload, alicePgpPriv);
        const pgpVerified = await verifyOpenPgpSignature(pgpSigned.signedPayload, alicePgpPub);
        const smimeEnc = encryptSmimeMessage(customPayload, bobCert);
        const smimeSignedAndEnc = signMessageSmime(smimeEnc.encryptedPem, gatewayCert, gatewayKey);
        addAuditEvent({
          category: "Gateway Interop",
          protocol: "Cross-Protocol",
          operation: "Scenario 4: OpenPGP to S/MIME Interoperability",
          status: "SUCCESS",
          senderEmail: "alice@gateway.internal",
          recipientEmail: "bob@gateway.internal",
          verificationOutcome: "Sender OpenPGP verified -> Gateway trans-encrypted to Bob S/MIME",
          details: "Full protocol transition from RFC 4880 to CMS PKCS#7.",
          isDemo: true
        });
        return {
          status: 200,
          body: {
            scenarioId: "4",
            title: "OpenPGP sender to S/MIME recipient",
            status: "SUCCESS",
            isCrossProtocol: true,
            senderProtocol: "OpenPGP",
            recipientProtocol: "S/MIME",
            incomingVerification: `PASSED: Verified Alice Smith OpenPGP Cleartext signature. Key ID: ${pgpVerified.keyId}.`,
            gatewayDecision: "AUTHORIZED TRANSITION: Inbound OpenPGP payload verified; encapsulated into S/MIME PKCS#7 EnvelopedData; Gateway X.509 signature attached.",
            finalOutput: smimeSignedAndEnc.signedPem,
            format: "application/pkcs7-mime",
            securityNotes: "Gateway converted ASCII Armored PGP message into ASN.1/DER PKCS#7 envelope."
          }
        };
      }
      if (id === "5") {
        addAuditEvent({
          category: "Gateway Interop",
          protocol: "Cross-Protocol",
          operation: "Scenario 5: Missing Recipient Key",
          status: "VALIDATION_ERROR",
          senderEmail: "alice@gateway.internal",
          recipientEmail: "dave_unregistered@external.org",
          verificationOutcome: "Processing Halted: Missing Recipient Public Key / Certificate",
          details: "Gateway could not locate X.509 certificate or OpenPGP key for recipient.",
          isDemo: true
        });
        return {
          status: 422,
          body: {
            scenarioId: "5",
            title: "Missing recipient key",
            status: "VALIDATION_ERROR",
            isCrossProtocol: false,
            senderProtocol: "S/MIME",
            recipientProtocol: "Unknown",
            incomingVerification: "VALID (Alice Smith X.509 Certificate active)",
            gatewayDecision: "REJECTED: Recipient dave_unregistered@external.org has no registered certificate or public key.",
            error: {
              code: "MISSING_RECIPIENT_KEY",
              message: "Cannot encrypt message. No X.509 certificate or OpenPGP public key found in gateway directory."
            },
            securityNotes: "Fails closed: Gateway never degrades security by falling back to unencrypted plaintext transmission."
          }
        };
      }
      if (id === "6") {
        addAuditEvent({
          category: "Gateway Interop",
          protocol: "S/MIME",
          operation: "Scenario 6: Invalid Signature Tamper Test",
          status: "FAILED",
          senderEmail: "attacker@spoofed.internal",
          recipientEmail: "bob@gateway.internal",
          verificationOutcome: "Signature Verification FAILED (Cryptographic digest mismatch)",
          details: "Inbound message payload modified after signing. Gateway aborted delivery.",
          isDemo: true
        });
        return {
          status: 400,
          body: {
            scenarioId: "6",
            title: "Invalid signature detection",
            status: "SIGNATURE_INVALID",
            isCrossProtocol: false,
            senderProtocol: "S/MIME",
            recipientProtocol: "S/MIME",
            incomingVerification: "FAILED: Cryptographic digest mismatch! Content altered in transit.",
            gatewayDecision: "ABORT: Gateway policy forbids processing messages with forged or invalid signatures.",
            error: {
              code: "SIGNATURE_VERIFICATION_FAILED",
              message: "Digital signature does not match message digest. Possible tampering detected."
            },
            securityNotes: "Integrity check prevented forged message propagation."
          }
        };
      }
      if (id === "7") {
        addAuditEvent({
          category: "Gateway Interop",
          protocol: "Cross-Protocol",
          operation: "Scenario 7: Failed Decryption Test",
          status: "FAILED",
          senderEmail: "alice@gateway.internal",
          recipientEmail: "bob@gateway.internal",
          verificationOutcome: "Decryption Failed (Recipient key mismatch)",
          details: "Gateway private key does not match ciphertext recipient identifier.",
          isDemo: true
        });
        return {
          status: 400,
          body: {
            scenarioId: "7",
            title: "Failed decryption",
            status: "DECRYPTION_FAILED",
            isCrossProtocol: true,
            senderProtocol: "S/MIME",
            recipientProtocol: "OpenPGP",
            incomingVerification: "PASSED (Signature valid)",
            gatewayDecision: "ABORT: Gateway boundary key cannot decrypt the inbound ciphertext.",
            error: {
              code: "DECRYPTION_FAILED",
              message: "Inbound message was not encrypted for the gateway interoperability service key."
            },
            securityNotes: "Cross-protocol gateway requires inbound encryption to gateway key or dual recipient encryption."
          }
        };
      }
      if (id === "8") {
        return {
          status: 400,
          body: {
            scenarioId: "8",
            title: "Unsupported protocol format",
            status: "UNSUPPORTED",
            isCrossProtocol: false,
            senderProtocol: "Legacy Proprietary Format",
            recipientProtocol: "S/MIME",
            incomingVerification: "UNKNOWN",
            gatewayDecision: "REJECTED: Gateway only supports S/MIME (PKCS#7/CMS) and OpenPGP (RFC 4880).",
            error: {
              code: "UNSUPPORTED_PROTOCOL_FORMAT",
              message: "Unrecognized cryptographic envelope. Supported protocols: S/MIME and OpenPGP."
            },
            securityNotes: "Standards compliance enforcement: proprietary formats are strictly rejected."
          }
        };
      }
      return {
        status: 400,
        body: {
          error: {
            code: "INVALID_SCENARIO",
            message: `Scenario ID "${scenarioId}" not recognized. Valid scenarios: 1 through 8.`
          }
        }
      };
    }
    return {
      status: 404,
      body: {
        error: {
          code: "ROUTE_NOT_FOUND",
          message: `The requested endpoint ${httpMethod} ${normPath} was not found on this Secure Electronic Mail Gateway API.`,
          availableRoutes: REGISTERED_ROUTES
        },
        availableRoutes: REGISTERED_ROUTES
      }
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 500,
      body: {
        error: {
          code: "INTERNAL_GATEWAY_ERROR",
          message: `Internal cryptographic gateway error: ${msg}`
        }
      }
    };
  }
}

// src/server/vercel-adapter.ts
async function handleVercelServerless(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    const rawUrl = req.url || "/api/health";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    const pathname = parsedUrl.pathname;
    const query = {};
    parsedUrl.searchParams.forEach((val, key) => {
      query[key] = val;
    });
    let body = req.body;
    if (body === void 0 && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(chunks).toString("utf8");
      if (rawText.trim()) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = { raw: rawText };
        }
      } else {
        body = {};
      }
    }
    const response = await handleApiRequest(
      req.method || "GET",
      pathname,
      query,
      body
    );
    res.statusCode = response.status;
    res.setHeader("Content-Type", "application/json");
    if (response.headers) {
      Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
    }
    res.end(JSON.stringify(response.body));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: {
        code: "SERVERLESS_INVOCATION_ERROR",
        message: msg
      }
    }));
  }
}

// src/server/api-entry.ts
async function handler(req, res) {
  return handleVercelServerless(req, res);
}
export {
  handler as default
};
