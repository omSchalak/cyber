import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  FileCode,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Plus,
  Eye,
  ArrowRight
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { ProtocolBadge } from '../components/ProtocolBadge';
import { CodeBlock } from '../components/CodeBlock';

export const KeysCertificates: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'smime' | 'openpgp' | 'checker'>('smime');
  const [loading, setLoading] = useState(true);
  const [smimeCerts, setSmimeCerts] = useState<any[]>([]);
  const [openpgpKeys, setOpenpgpKeys] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Recipient check state
  const [checkEmail, setCheckEmail] = useState('bob@gateway.internal');
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [checking, setChecking] = useState(false);

  // Modal to inspect raw public credential
  const [viewingCredential, setViewingCredential] = useState<{ title: string; raw: string } | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getKeys();
      setSmimeCerts(res.smimeCertificates || []);
      setOpenpgpKeys(res.openpgpKeys || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve credentials inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCheckRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEmail) return;
    setChecking(true);
    try {
      const res = await apiClient.checkRecipient(checkEmail);
      setCheckResult(res);
    } catch (err: unknown) {
      alert(`Check failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            CRYPTOGRAPHIC CREDENTIAL REPOSITORY // PUBLIC TRUST REGISTRY
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            Keys & Certificates Directory
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Verified S/MIME X.509 digital certificates, OpenPGP public keyrings, and compatibility lookup.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('smime')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'smime'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            S/MIME Certificates ({smimeCerts.length})
          </button>
          <button
            onClick={() => setActiveTab('openpgp')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'openpgp'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            OpenPGP Keys ({openpgpKeys.length})
          </button>
          <button
            onClick={() => setActiveTab('checker')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
              activeTab === 'checker'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            Compatibility Checker
          </button>
        </div>
      </div>

      {/* Raw Credential Viewer Modal */}
      {viewingCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#51404B] p-6 max-w-2xl w-full shadow-brutal-lg rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#51404B] pb-2">
              <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-[#252126]">
                {viewingCredential.title}
              </h3>
              <button
                onClick={() => setViewingCredential(null)}
                className="font-mono text-xs font-bold text-red-700 hover:underline"
              >
                Close [✕]
              </button>
            </div>
            <CodeBlock code={viewingCredential.raw} language="ASCII / PEM Public Block" maxHeight="max-h-72" />
            <div className="flex justify-end">
              <button
                onClick={() => setViewingCredential(null)}
                className="px-4 py-2 bg-[#51404B] text-white font-mono text-xs font-bold uppercase rounded-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR NOTICE */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-800 text-red-900 font-mono text-xs rounded-sm">
          {error}
        </div>
      )}

      {/* TAB 1: S/MIME CERTIFICATES */}
      {activeTab === 'smime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between font-mono text-xs text-[#635B65]">
            <span>Hierarchical X.509 PKI certificates available for digital signatures and CMS enveloped-data.</span>
            <span className="font-bold bg-[#E9DFE5] px-2 py-0.5 rounded text-[#51404B]">
              PUBLIC CERTIFICATES ONLY (PRIVATE KEYS NEVER EXPOSED)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {smimeCerts.map((cert) => (
              <BrutalCard
                key={cert.id}
                title={cert.ownerName}
                subtitle={cert.email}
                badge={<StatusBadge status={cert.trustStatus} size="sm" />}
              >
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-2.5 bg-[#F8F5F7] border border-[#51404B] rounded space-y-1">
                    <div>Organization: <strong>{cert.organization}</strong></div>
                    <div>Algorithm: <strong>{cert.algorithm}</strong></div>
                    <div>Valid Until: <strong>{cert.validTo ? cert.validTo.slice(0, 10) : 'Never'}</strong></div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#635B65] uppercase block font-bold">SHA-256 Fingerprint:</span>
                    <span className="font-bold text-[10px] select-all break-all">{cert.fingerprint}</span>
                  </div>

                  <p className="text-[11px] text-[#635B65]">{cert.notes}</p>

                  <div className="pt-2 flex justify-between items-center border-t border-[#D7CBD2]">
                    <span className="text-[10px] font-bold text-[#79616f]">X.509 v3</span>
                    <button
                      type="button"
                      onClick={() => setViewingCredential({ title: `${cert.ownerName} - S/MIME Certificate`, raw: cert.rawPublicCredential })}
                      className="px-3 py-1 bg-white border border-[#51404B] text-[#51404B] font-bold rounded hover:bg-gray-50 flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> View PEM
                    </button>
                  </div>
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: OPENPGP PUBLIC KEYS */}
      {activeTab === 'openpgp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between font-mono text-xs text-[#635B65]">
            <span>RFC 4880 Public Keyring. Fingerprints can be verified directly out-of-band.</span>
            <span className="font-bold bg-[#E9DFE5] px-2 py-0.5 rounded text-[#51404B]">
              PUBLIC KEYS ONLY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {openpgpKeys.map((k) => (
              <BrutalCard
                key={k.id}
                title={k.ownerName}
                subtitle={k.email}
                badge={<StatusBadge status={k.trustStatus} size="sm" />}
              >
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-2.5 bg-[#F8F5F7] border border-[#51404B] rounded space-y-1">
                    <div>Key ID: <strong>0x{k.keyId || 'N/A'}</strong></div>
                    <div>Algorithm: <strong>{k.algorithm} (2048 bits)</strong></div>
                    <div>Expires: <strong>{k.validTo ? k.validTo.slice(0, 10) : 'No Expiration'}</strong></div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#635B65] uppercase block font-bold">Key Fingerprint:</span>
                    <span className="font-bold text-[10px] select-all break-all">{k.fingerprint}</span>
                  </div>

                  <p className="text-[11px] text-[#635B65]">{k.notes}</p>

                  <div className="pt-2 flex justify-between items-center border-t border-[#D7CBD2]">
                    <span className="text-[10px] font-bold text-[#51404B]">RFC 4880 Armor</span>
                    <button
                      type="button"
                      onClick={() => setViewingCredential({ title: `${k.ownerName} - OpenPGP Public Key`, raw: k.rawPublicCredential })}
                      className="px-3 py-1 bg-white border border-[#51404B] text-[#51404B] font-bold rounded hover:bg-gray-50 flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Armor
                    </button>
                  </div>
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RECIPIENT COMPATIBILITY CHECKER */}
      {activeTab === 'checker' && (
        <BrutalCard title="Recipient Protocol Compatibility Lookup" subtitle="Query directory to determine available encryption primitives">
          <form onSubmit={handleCheckRecipient} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                Recipient Email Address to Evaluate
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={checkEmail}
                  onChange={(e) => setCheckEmail(e.target.value)}
                  placeholder="e.g. bob@gateway.internal"
                  className="flex-1 px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={checking}
                  className="px-5 py-2 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" />
                  {checking ? 'Checking...' : 'Check'}
                </button>
              </div>
            </div>

            {checkResult && (
              <div className="p-4 bg-[#F8F5F7] border-2 border-[#51404B] rounded-sm font-mono text-xs space-y-3">
                <div className="font-bold text-[#51404B] uppercase">Evaluation Result for {checkResult.email}</div>
                <p className="text-[#252126]">{checkResult.statusMessage}</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 bg-white border border-[#D7CBD2] rounded">
                    <span className="block text-[10px] text-[#635B65]">S/MIME Support:</span>
                    <span className="font-bold">{checkResult.hasSmime ? '✓ Available' : '✗ None'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-[#D7CBD2] rounded">
                    <span className="block text-[10px] text-[#635B65]">OpenPGP Support:</span>
                    <span className="font-bold">{checkResult.hasOpenPgp ? '✓ Available' : '✗ None'}</span>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-[#51404B] font-bold">
                  Recommended Routing Protocol: {checkResult.recommendedProtocol.toUpperCase()}
                </div>
              </div>
            )}
          </form>
        </BrutalCard>
      )}
    </div>
  );
};
