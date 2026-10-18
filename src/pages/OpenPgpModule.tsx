import React, { useState } from 'react';
import {
  KeyRound,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileCheck,
  RefreshCw,
  Copy,
  ArrowRight,
  Terminal,
  UserCheck
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { OpenPgpKeyInfo } from '../types';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { CodeBlock } from '../components/CodeBlock';
import credsData from '../../generated_creds.json';

export const OpenPgpModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'inspect' | 'encrypt-decrypt' | 'sign-verify'>('generate');

  // Key Generation State
  const [genName, setGenName] = useState('Alice Demo');
  const [genEmail, setGenEmail] = useState('alice.demo@gateway.internal');
  const [genPassphrase, setGenPassphrase] = useState('');
  const [genResult, setGenResult] = useState<{ publicKey: string; privateKey: string; fingerprint: string; keyId: string } | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Key Inspect State
  const [inspectKeyArmored, setInspectKeyArmored] = useState(credsData.bobPgp.publicKey);
  const [inspectedKeyInfo, setInspectedKeyInfo] = useState<OpenPgpKeyInfo | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Encrypt & Decrypt State
  const [pgpPlaintext, setPgpPlaintext] = useState('Confidential message secured with RFC 4880 OpenPGP cryptography.');
  const [pgpCiphertext, setPgpCiphertext] = useState('');
  const [pgpEncLoading, setPgpEncLoading] = useState(false);
  const [pgpEncError, setPgpEncError] = useState<string | null>(null);
  const [pgpDecrypted, setPgpDecrypted] = useState('');
  const [pgpDecLoading, setPgpDecLoading] = useState(false);
  const [pgpDecError, setPgpDecError] = useState<string | null>(null);

  // Sign & Verify State
  const [signMessage, setSignMessage] = useState('Official announcement signed using OpenPGP private key.');
  const [signedCleartext, setSignedCleartext] = useState('');
  const [pgpSignLoading, setPgpSignLoading] = useState(false);
  const [pgpVerifyResult, setPgpVerifyResult] = useState<any | null>(null);
  const [pgpVerifyLoading, setPgpVerifyLoading] = useState(false);

  // 1. Generate Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setGenError(null);
    setGenResult(null);
    try {
      const res = await apiClient.generateOpenPgpKey(genName, genEmail, genPassphrase || undefined);
      setGenResult(res.keyPair);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Key generation failed.');
    } finally {
      setGenLoading(false);
    }
  };

  // 2. Inspect Key
  const handleInspectKey = async () => {
    setInspectLoading(true);
    setInspectError(null);
    setInspectedKeyInfo(null);
    try {
      const res = await apiClient.inspectOpenPgpKey(inspectKeyArmored);
      setInspectedKeyInfo(res.keyInfo);
    } catch (err: unknown) {
      setInspectError(err instanceof Error ? err.message : 'Key inspection failed.');
    } finally {
      setInspectLoading(false);
    }
  };

  // 3. Encrypt
  const handleEncryptPgp = async () => {
    setPgpEncLoading(true);
    setPgpEncError(null);
    try {
      const res = await apiClient.encryptOpenPgp(
        pgpPlaintext,
        credsData.bobPgp.publicKey,
        credsData.alicePgp.privateKey
      );
      setPgpCiphertext(res.armoredMessage);
    } catch (err: unknown) {
      setPgpEncError(err instanceof Error ? err.message : 'Encryption failed.');
    } finally {
      setPgpEncLoading(false);
    }
  };

  // 4. Decrypt
  const handleDecryptPgp = async () => {
    setPgpDecLoading(true);
    setPgpDecError(null);
    setPgpDecrypted('');
    try {
      const res = await apiClient.decryptOpenPgp(
        pgpCiphertext,
        credsData.bobPgp.privateKey,
        undefined,
        credsData.alicePgp.publicKey
      );
      setPgpDecrypted(res.plaintext);
    } catch (err: unknown) {
      setPgpDecError(err instanceof Error ? err.message : 'Decryption failed.');
    } finally {
      setPgpDecLoading(false);
    }
  };

  // 5. Sign
  const handleSignPgp = async () => {
    setPgpSignLoading(true);
    try {
      const res = await apiClient.signOpenPgp(signMessage, credsData.alicePgp.privateKey);
      setSignedCleartext(res.signedPayload);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Signing failed.');
    } finally {
      setPgpSignLoading(false);
    }
  };

  // 6. Verify
  const handleVerifyPgp = async (tampered = false) => {
    setPgpVerifyLoading(true);
    setPgpVerifyResult(null);
    try {
      const payload = tampered
        ? signedCleartext.replace(/Official announcement/, 'FORGED STATEMENT [TAMPERED]')
        : signedCleartext;
      const res = await apiClient.verifyOpenPgp(payload, credsData.alicePgp.publicKey);
      setPgpVerifyResult(res);
    } catch (err: unknown) {
      setPgpVerifyResult({ valid: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setPgpVerifyLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            RFC 4880 // WEB OF TRUST CRYPTOGRAPHY
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            OpenPGP Cryptographic Module
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Demonstration key pair generation, key inspection, ASCII armor encryption, and cleartext signatures.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'generate'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            Generate Keys
          </button>
          <button
            onClick={() => setActiveTab('inspect')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'inspect'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            Inspect Keys
          </button>
          <button
            onClick={() => setActiveTab('encrypt-decrypt')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'encrypt-decrypt'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            Encrypt & Decrypt
          </button>
          <button
            onClick={() => setActiveTab('sign-verify')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'sign-verify'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            Sign & Verify
          </button>
        </div>
      </div>

      {/* TAB 1: GENERATE KEY PAIR */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BrutalCard title="Generate Demonstration Key Pair" subtitle="Creates real 2048-bit RSA/Ed25519 OpenPGP keys">
            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Full Name / Identity
                </label>
                <input
                  type="text"
                  required
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={genEmail}
                  onChange={(e) => setGenEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Passphrase (Optional)
                </label>
                <input
                  type="password"
                  value={genPassphrase}
                  onChange={(e) => setGenPassphrase(e.target.value)}
                  placeholder="Leave blank for unencrypted private key (demo use)"
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                🔒 <strong>Zero-Persistence Guarantee:</strong> Private keys are generated transiently on the server and are never stored in databases, logs, or persistent browser storage.
              </div>

              <button
                type="submit"
                disabled={genLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${genLoading ? 'animate-spin' : ''}`} />
                {genLoading ? 'Generating OpenPGP Keys...' : 'Generate OpenPGP Key Pair'}
              </button>
            </form>
          </BrutalCard>

          {/* Generated Result */}
          <div className="space-y-4">
            {genError && (
              <div className="p-4 bg-red-50 border-2 border-red-800 text-red-900 font-mono text-xs rounded-sm">
                {genError}
              </div>
            )}

            {genResult ? (
              <BrutalCard
                title="Generated Key Pair Metadata"
                subtitle={`Key ID: 0x${genResult.keyId}`}
                badge={<StatusBadge status="DEMO_KEY" size="sm" />}
              >
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded space-y-1">
                    <div>User ID: <strong>{genName} &lt;{genEmail}&gt;</strong></div>
                    <div>Key Fingerprint: <span className="font-bold select-all break-all">{genResult.fingerprint}</span></div>
                  </div>

                  <div>
                    <span className="font-bold uppercase text-[11px] text-[#51404B] block mb-1">
                      Public Key (ASCII Armored)
                    </span>
                    <CodeBlock code={genResult.publicKey} language="OpenPGP Public Key" maxHeight="max-h-48" />
                  </div>

                  <div>
                    <span className="font-bold uppercase text-[11px] text-[#51404B] block mb-1">
                      Private Key (Transferred securely for demo inspection)
                    </span>
                    <CodeBlock code={genResult.privateKey} language="OpenPGP Private Key" maxHeight="max-h-48" />
                  </div>
                </div>
              </BrutalCard>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-[#D7CBD2] rounded-sm font-mono text-xs text-[#635B65]">
                Fill the form and click "Generate OpenPGP Key Pair" to synthesize a real cryptographic key pair.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INSPECT KEY */}
      {activeTab === 'inspect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BrutalCard title="OpenPGP Armored Key Input" subtitle="Paste any RFC 4880 ASCII armored public or private key">
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInspectKeyArmored(credsData.alicePgp.publicKey)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#E9DFE5] hover:bg-[#d8c7d3] text-[#51404B] border border-[#51404B] rounded"
                >
                  Load Alice Public Key
                </button>
                <button
                  type="button"
                  onClick={() => setInspectKeyArmored(credsData.bobPgp.publicKey)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#E9DFE5] hover:bg-[#d8c7d3] text-[#51404B] border border-[#51404B] rounded"
                >
                  Load Bob Public Key
                </button>
              </div>

              <textarea
                rows={12}
                value={inspectKeyArmored}
                onChange={(e) => setInspectKeyArmored(e.target.value)}
                placeholder="-----BEGIN PGP PUBLIC KEY BLOCK----- ... -----END PGP PUBLIC KEY BLOCK-----"
                className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
              />

              <button
                type="button"
                onClick={handleInspectKey}
                disabled={inspectLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${inspectLoading ? 'animate-spin' : ''}`} />
                {inspectLoading ? 'Parsing OpenPGP Packet...' : 'Parse & Inspect Key'}
              </button>
            </div>
          </BrutalCard>

          {/* Inspected Key Details */}
          <div>
            {inspectError && (
              <div className="p-4 bg-red-50 border-2 border-red-800 text-red-900 font-mono text-xs rounded-sm">
                {inspectError}
              </div>
            )}

            {inspectedKeyInfo ? (
              <BrutalCard
                title="Key Packet Specifications"
                subtitle={`Key ID: 0x${inspectedKeyInfo.keyId}`}
                badge={<StatusBadge status={inspectedKeyInfo.trustStatus} size="sm" />}
              >
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded space-y-1">
                    <span className="font-bold text-[#51404B] block uppercase text-[10px]">Associated User IDs</span>
                    {inspectedKeyInfo.userIDs.map((uid, i) => (
                      <div key={i} className="font-bold">
                        {uid.name} {uid.email ? `<${uid.email}>` : ''}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                    <span className="font-bold text-[#51404B] block uppercase text-[10px]">Fingerprint</span>
                    <span className="font-bold select-all break-all">{inspectedKeyInfo.fingerprint}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                      <span className="text-[#635B65] block text-[10px]">Algorithm</span>
                      <span className="font-bold">{inspectedKeyInfo.algorithm}</span>
                    </div>
                    <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                      <span className="text-[#635B65] block text-[10px]">Key Type</span>
                      <span className="font-bold">{inspectedKeyInfo.isPrivate ? 'PRIVATE KEY' : 'PUBLIC KEY'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                    <span className="text-[#635B65] block text-[10px]">Creation Date</span>
                    <span className="font-bold">{new Date(inspectedKeyInfo.creationTime).toLocaleString()}</span>
                  </div>
                </div>
              </BrutalCard>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-[#D7CBD2] rounded-sm font-mono text-xs text-[#635B65]">
                Click "Parse & Inspect Key" to extract OpenPGP packet metadata and fingerprints.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ENCRYPT & DECRYPT */}
      {activeTab === 'encrypt-decrypt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BrutalCard title="OpenPGP Message Encryption" subtitle="Encrypts using Bob's public key & signs with Alice's private key">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Plaintext Message
                </label>
                <textarea
                  rows={4}
                  value={pgpPlaintext}
                  onChange={(e) => setPgpPlaintext(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                Recipient: <strong>Bob Jones</strong> &lt;bob@gateway.internal&gt; | Signer: <strong>Alice Smith</strong>
              </div>

              <button
                type="button"
                onClick={handleEncryptPgp}
                disabled={pgpEncLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2"
              >
                <Lock className={`w-4 h-4 ${pgpEncLoading ? 'animate-pulse' : ''}`} />
                {pgpEncLoading ? 'Encrypting with OpenPGP...' : 'Encrypt into ASCII Armor'}
              </button>

              {pgpCiphertext && (
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-[#51404B] block mb-1">
                    RFC 4880 Armored Ciphertext
                  </span>
                  <CodeBlock code={pgpCiphertext} language="OpenPGP Message" maxHeight="max-h-48" />
                </div>
              )}
            </div>
          </BrutalCard>

          <BrutalCard title="OpenPGP Authorized Decryption" subtitle="Decrypted by Bob using his matching private key">
            <div className="space-y-4">
              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                Keyholder: <strong>Bob Jones</strong> (Decryption Key) & Alice Smith (Signature Verification Key)
              </div>

              <button
                type="button"
                disabled={!pgpCiphertext || pgpDecLoading}
                onClick={handleDecryptPgp}
                className="w-full py-3 bg-[#51404B] hover:bg-[#3f313a] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#252126] shadow-brutal flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound className={`w-4 h-4 ${pgpDecLoading ? 'animate-pulse' : ''}`} />
                {pgpDecLoading ? 'Decrypting...' : 'Decrypt with Bob’s Private Key'}
              </button>

              {pgpDecError && (
                <div className="p-3 bg-red-50 border-2 border-red-800 text-red-900 font-mono text-xs rounded-sm">
                  {pgpDecError}
                </div>
              )}

              {pgpDecrypted && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-800 text-emerald-950 font-mono text-xs rounded-sm space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>OPENPGP DECRYPTION & SIGNATURE VERIFIED</span>
                  </div>
                  <div className="p-3 bg-white border border-emerald-300 rounded font-bold text-gray-900">
                    {pgpDecrypted}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    ✓ Ciphertext unwrapped and Alice's attached cryptographic signature validated.
                  </div>
                </div>
              )}
            </div>
          </BrutalCard>
        </div>
      )}

      {/* TAB 4: SIGN & VERIFY */}
      {activeTab === 'sign-verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BrutalCard title="OpenPGP Cleartext Signing" subtitle="Produces standard RFC 4880 cleartext signed message">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Message Content to Sign
                </label>
                <textarea
                  rows={4}
                  value={signMessage}
                  onChange={(e) => setSignMessage(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                Signer: <strong>Alice Smith</strong> &lt;alice@gateway.internal&gt;
              </div>

              <button
                type="button"
                onClick={handleSignPgp}
                disabled={pgpSignLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${pgpSignLoading ? 'animate-spin' : ''}`} />
                {pgpSignLoading ? 'Signing...' : 'Create OpenPGP Cleartext Signature'}
              </button>

              {signedCleartext && (
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-[#51404B] block mb-1">
                    Cleartext Signed Message
                  </span>
                  <CodeBlock code={signedCleartext} language="PGP SIGNED MESSAGE" maxHeight="max-h-48" />
                </div>
              )}
            </div>
          </BrutalCard>

          <BrutalCard title="OpenPGP Signature Verification" subtitle="Validates integrity and non-repudiation using Alice's public key">
            <div className="space-y-4">
              <p className="text-xs font-mono text-[#635B65]">
                Test regular signature verification or execute a tamper test where 1 word of the payload is modified to observe cryptographic verification failure.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!signedCleartext || pgpVerifyLoading}
                  onClick={() => handleVerifyPgp(false)}
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-emerald-950 shadow-brutal-sm disabled:opacity-50"
                >
                  Verify Signature
                </button>
                <button
                  type="button"
                  disabled={!signedCleartext || pgpVerifyLoading}
                  onClick={() => handleVerifyPgp(true)}
                  className="flex-1 py-2.5 bg-red-800 hover:bg-red-900 text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-red-950 shadow-brutal-sm disabled:opacity-50"
                >
                  Tamper Test (Tampered Message)
                </button>
              </div>

              {pgpVerifyResult && (
                <div
                  className={`p-4 border-2 rounded-sm font-mono text-xs space-y-2 ${
                    pgpVerifyResult.valid
                      ? 'bg-emerald-50 border-emerald-800 text-emerald-950'
                      : 'bg-red-50 border-red-800 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {pgpVerifyResult.valid ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        <span>VALID OPENPGP SIGNATURE</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-700" />
                        <span>SIGNATURE VERIFICATION FAILED</span>
                      </>
                    )}
                  </div>
                  {pgpVerifyResult.valid ? (
                    <div>
                      <div>Key ID: <strong>0x{pgpVerifyResult.keyId}</strong></div>
                      <div>Signer: <strong>Alice Smith</strong></div>
                      <div className="mt-2 text-[11px] text-emerald-800 font-bold">
                        ✓ Signature authentic. Digest matches RFC 4880 cleartext hash.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold">Failure: {pgpVerifyResult.error}</div>
                      <div className="mt-2 text-[11px] text-red-800">
                        Content altered after signing. Cryptographic hash rejected by gateway.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </BrutalCard>
        </div>
      )}
    </div>
  );
};
