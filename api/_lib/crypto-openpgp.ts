import * as openpgp from 'openpgp';

export interface OpenPgpKeyMetadata {
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

export async function generateDemoPgpKey(
  name: string,
  email: string,
  passphrase?: string
): Promise<{ publicKey: string; privateKey: string; fingerprint: string; keyId: string }> {
  try {
    const { privateKey, publicKey } = await openpgp.generateKey({
      userIDs: [{ name, email }],
      rsaBits: 2048,
      passphrase: passphrase || undefined
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP Key generation failed: ${msg}`);
  }
}

export async function inspectOpenPgpKey(armoredKey: string): Promise<OpenPgpKeyMetadata> {
  if (!armoredKey || typeof armoredKey !== 'string') {
    throw new Error('Invalid OpenPGP input: Armored key string is required.');
  }

  try {
    const isPrivate = armoredKey.includes('BEGIN PGP PRIVATE KEY BLOCK');
    const isPublic = armoredKey.includes('BEGIN PGP PUBLIC KEY BLOCK');

    if (!isPrivate && !isPublic) {
      throw new Error('Malformed OpenPGP key: Missing ASCII armor headers (BEGIN PGP PUBLIC/PRIVATE KEY BLOCK).');
    }

    const key = isPrivate
      ? await openpgp.readPrivateKey({ armoredKey })
      : await openpgp.readKey({ armoredKey });

    const keyId = key.getKeyID().toHex().toUpperCase();
    const fingerprint = key.getFingerprint().toUpperCase();
    
    // User IDs
    const userIDs = await Promise.all(
      key.getUserIDs().map(async (uid: string) => {
        const match = uid.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
        return {
          name: match && match[1] ? match[1].trim() : uid,
          email: match && match[2] ? match[2].trim() : ''
        };
      })
    );

    const creationTime = key.getCreationTime().toISOString();
    const expTime = await key.getExpirationTime();
    const expirationTime = expTime === Infinity || expTime === null ? null : (expTime as Date).toISOString();
    const algorithm = key.getAlgorithmInfo().algorithm || 'RSA';

    let trustStatus: OpenPgpKeyMetadata['trustStatus'] = 'VALID';
    if (expirationTime && new Date() > new Date(expirationTime)) {
      trustStatus = 'EXPIRED';
    } else if (userIDs.some(u => u.email.includes('gateway.internal'))) {
      trustStatus = 'DEMO_KEY';
    }

    return {
      keyId,
      fingerprint: (fingerprint.match(/.{1,4}/g) || []).join(' '),
      userIDs,
      algorithm,
      bits: 2048,
      creationTime,
      expirationTime,
      isPrivate,
      armoredKey: armoredKey.trim(),
      trustStatus
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse OpenPGP key: ${msg}`);
  }
}

export async function encryptOpenPgpMessage(
  plaintext: string,
  recipientArmoredKey: string,
  signerPrivateKeyArmored?: string,
  signerPassphrase?: string
): Promise<{
  armoredMessage: string;
  algorithm: string;
  signed: boolean;
}> {
  try {
    const recipientKey = await openpgp.readKey({ armoredKey: recipientArmoredKey });
    const message = await openpgp.createMessage({ text: plaintext });

    let signingKeys: openpgp.PrivateKey | undefined;
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
      signingKeys: signingKeys || undefined
    });

    return {
      armoredMessage: encrypted as string,
      algorithm: 'AES-256 (RFC 4880 OpenPGP)',
      signed: Boolean(signingKeys)
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP encryption failed: ${msg}`);
  }
}

export async function decryptOpenPgpMessage(
  armoredMessage: string,
  privateKeyArmored: string,
  passphrase?: string,
  verificationKeyArmored?: string
): Promise<{
  plaintext: string;
  signatureVerified: boolean;
  signerKeyId?: string;
}> {
  try {
    let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
    if (passphrase) {
      privateKey = await openpgp.decryptKey({ privateKey, passphrase });
    }

    let verificationKeys: openpgp.PublicKey | undefined;
    if (verificationKeyArmored) {
      verificationKeys = await openpgp.readKey({ armoredKey: verificationKeyArmored });
    }

    const message = await openpgp.readMessage({ armoredMessage });
    const { data: decrypted, signatures } = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
      verificationKeys: verificationKeys || undefined
    });

    let signatureVerified = false;
    let signerKeyId: string | undefined;

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
      plaintext: decrypted as string,
      signatureVerified,
      signerKeyId
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP decryption failed: ${msg}. Confirm that private key and passphrase match the recipient.`);
  }
}

export async function signOpenPgpMessage(
  plaintext: string,
  privateKeyArmored: string,
  passphrase?: string,
  detached = false
): Promise<{
  signedPayload: string;
  type: 'cleartext' | 'detached';
}> {
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
        signedPayload: signature as string,
        type: 'detached'
      };
    } else {
      const cleartextMessage = await openpgp.createCleartextMessage({ text: plaintext });
      const signedCleartext = await openpgp.sign({
        message: cleartextMessage,
        signingKeys: privateKey
      });
      return {
        signedPayload: signedCleartext as string,
        type: 'cleartext'
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenPGP signature creation failed: ${msg}`);
  }
}

export async function verifyOpenPgpSignature(
  signedPayload: string,
  publicKeyArmored: string,
  originalTextIfDetached?: string
): Promise<{
  valid: boolean;
  content: string;
  keyId?: string;
  error?: string;
}> {
  try {
    const verificationKeys = await openpgp.readKey({ armoredKey: publicKeyArmored });

    if (signedPayload.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
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
          error: 'Signature verification failed! Signature does not match payload or key.'
        };
      }
    } else if (signedPayload.includes('-----BEGIN PGP SIGNATURE-----') && originalTextIfDetached) {
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
          error: 'Detached signature verification failed!'
        };
      }
    } else {
      return {
        valid: false,
        content: '',
        error: 'Unrecognized OpenPGP signature format. Expected Cleartext Signed Message or Detached Signature with original text.'
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      content: '',
      error: `Signature verification error: ${msg}`
    };
  }
}
