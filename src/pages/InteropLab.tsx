import React, { useState } from 'react';
import {
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Shield,
  FileCode,
  KeyRound,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { InteropScenario } from '../types';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { ProtocolBadge } from '../components/ProtocolBadge';
import { CodeBlock } from '../components/CodeBlock';
import { VisualGatewayFlow } from '../components/VisualGatewayFlow';

export const SCENARIOS: InteropScenario[] = [
  {
    id: '1',
    title: 'S/MIME Sender to S/MIME Recipient',
    description: 'Direct homogeneous S/MIME transmission. Message is signed by Alice using X.509 and encrypted for Bob using X.509.',
    senderProtocol: 'S/MIME',
    recipientProtocol: 'S/MIME',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'direct',
    expectedOutcome: 'SUCCESS',
    keyNotes: 'No protocol conversion required. Native end-to-end PKCS#7 envelope passthrough.'
  },
  {
    id: '2',
    title: 'OpenPGP Sender to OpenPGP Recipient',
    description: 'Direct homogeneous OpenPGP transmission. Encrypted with Bob’s public key and signed with Alice’s private key.',
    senderProtocol: 'OpenPGP',
    recipientProtocol: 'OpenPGP',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'direct',
    expectedOutcome: 'SUCCESS',
    keyNotes: 'No protocol conversion required. Native RFC 4880 armored packet passthrough.'
  },
  {
    id: '3',
    title: 'S/MIME Sender to OpenPGP Recipient (Cross-Protocol)',
    description: 'Heterogeneous translation. Alice sends S/MIME; Gateway verifies signature, decrypts at trusted boundary, and re-encrypts into OpenPGP for Bob.',
    senderProtocol: 'S/MIME',
    recipientProtocol: 'OpenPGP',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'cross-protocol',
    expectedOutcome: 'SUCCESS',
    keyNotes: 'Controlled transition. Gateway verifies X.509 signature, trans-encrypts to RFC 4880, and appends Gateway attestation.'
  },
  {
    id: '4',
    title: 'OpenPGP Sender to S/MIME Recipient (Cross-Protocol)',
    description: 'Heterogeneous translation. Alice sends OpenPGP; Gateway validates cleartext signature and packages payload into S/MIME PKCS#7 EnvelopedData for Bob.',
    senderProtocol: 'OpenPGP',
    recipientProtocol: 'S/MIME',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'cross-protocol',
    expectedOutcome: 'SUCCESS',
    keyNotes: 'Gateway converts OpenPGP cleartext/detached signature into PKCS#7 CMS enveloped format with Gateway authority certificate.'
  },
  {
    id: '5',
    title: 'Missing Recipient Key',
    description: 'Alice attempts to send encrypted mail to an external user with no registered X.509 certificate or OpenPGP key.',
    senderProtocol: 'S/MIME',
    recipientProtocol: 'Unknown',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'dave_unregistered@external.org',
    category: 'failure-case',
    expectedOutcome: 'VALIDATION_ERROR',
    keyNotes: 'Gateway fails closed. Refuses to downgrade security or emit unencrypted plaintext.'
  },
  {
    id: '6',
    title: 'Invalid Signature Tamper Detection',
    description: 'Inbound message payload was modified or altered in transit after being digitally signed by the sender.',
    senderProtocol: 'S/MIME',
    recipientProtocol: 'S/MIME',
    senderEmail: 'attacker@spoofed.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'failure-case',
    expectedOutcome: 'SIGNATURE_INVALID',
    keyNotes: 'Cryptographic digest check detects altered bytes. Gateway aborts delivery immediately.'
  },
  {
    id: '7',
    title: 'Failed Decryption Boundary',
    description: 'Ciphertext sent to gateway was not encrypted for the gateway service key, rendering decryption impossible.',
    senderProtocol: 'S/MIME',
    recipientProtocol: 'OpenPGP',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'failure-case',
    expectedOutcome: 'DECRYPTION_FAILED',
    keyNotes: 'Cross-protocol transition requires gateway key recipient or dual-wrapping. Processing aborts.'
  },
  {
    id: '8',
    title: 'Unsupported Cryptographic Format',
    description: 'Inbound message uses a non-standard or proprietary cryptographic wrapper outside S/MIME or OpenPGP specifications.',
    senderProtocol: 'S/MIME',
    recipientProtocol: 'Unknown',
    senderEmail: 'alice@gateway.internal',
    recipientEmail: 'bob@gateway.internal',
    category: 'failure-case',
    expectedOutcome: 'UNSUPPORTED',
    keyNotes: 'Standards enforcement: Non-standard proprietary envelopes are rejected.'
  }
];

export const InteropLab: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('3');
  const [customPayload, setCustomPayload] = useState(
    'Academic Cybersecurity Demonstration: Testing S/MIME and OpenPGP Cross-Protocol Interoperability.'
  );
  const [running, setRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const handleRunScenario = async () => {
    setRunning(true);
    setExecutionError(null);
    setExecutionResult(null);

    try {
      const res = await apiClient.simulateInteropScenario(selectedScenarioId, customPayload);
      setExecutionResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setExecutionError(`[${err.code}]: ${err.message}`);
        if (err.details) {
          setExecutionResult(err.details);
        }
      } else {
        setExecutionError(err instanceof Error ? err.message : 'Scenario execution failed.');
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            ACADEMIC RESEARCH TESTBED // STANDARDS INTEROPERABILITY
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            Cross-Protocol Interoperability Lab
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Simulate and evaluate real-time translation between S/MIME X.509 and OpenPGP RFC 4880 boundaries.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#51404B] text-white rounded-sm font-mono text-xs">
          <Terminal className="w-4 h-4 text-[#E9DFE5]" />
          <span>Operator: Mansi Chalak</span>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <VisualGatewayFlow isCrossProtocol={activeScenario.category === 'cross-protocol'} />

      {/* Scenario Selector & Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scenario List (Left) */}
        <div className="space-y-3">
          <span className="font-mono text-xs font-bold uppercase text-[#51404B]">
            Select Evaluation Scenario (8 Total)
          </span>

          <div className="space-y-2">
            {SCENARIOS.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              let badgeText = 'DIRECT';
              if (sc.category === 'cross-protocol') badgeText = 'CROSS-PROTOCOL';
              if (sc.category === 'failure-case') badgeText = 'FAILURE BOUNDARY';

              return (
                <div
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    setExecutionResult(null);
                    setExecutionError(null);
                  }}
                  className={`p-3.5 border-2 rounded-sm cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-white border-[#51404B] shadow-brutal -translate-x-1'
                      : 'bg-[#F8F5F7] border-[#D7CBD2] hover:bg-white hover:border-[#51404B]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-[#79616f]">
                      SCENARIO 0{sc.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                        sc.category === 'cross-protocol'
                          ? 'bg-[#831843] text-white border-[#500724]'
                          : sc.category === 'failure-case'
                          ? 'bg-amber-100 text-amber-900 border-amber-800'
                          : 'bg-[#51404B] text-white border-[#252126]'
                      }`}
                    >
                      {badgeText}
                    </span>
                  </div>
                  <h4 className="font-sans font-bold text-xs text-[#252126]">{sc.title}</h4>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-[#635B65]">
                    <span>In: {sc.senderProtocol}</span>
                    <span>→</span>
                    <span>Out: {sc.recipientProtocol}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scenario Details & Execution (Right) */}
        <div className="lg:col-span-2 space-y-6">
          <BrutalCard
            title={`Scenario 0${activeScenario.id}: ${activeScenario.title}`}
            subtitle={activeScenario.description}
            badge={<ProtocolBadge protocol={activeScenario.category === 'cross-protocol' ? 'Cross-Protocol' : activeScenario.senderProtocol} size="sm" />}
          >
            {/* Metadata specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F8F5F7] border-2 border-[#51404B] rounded-sm font-mono text-xs mb-4">
              <div>
                <span className="text-[10px] text-[#635B65] block uppercase">Sender Protocol</span>
                <span className="font-bold text-[#51404B]">{activeScenario.senderProtocol}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#635B65] block uppercase">Recipient Protocol</span>
                <span className="font-bold text-[#79616f]">{activeScenario.recipientProtocol}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#635B65] block uppercase">Sender Identity</span>
                <span className="font-bold truncate block">{activeScenario.senderEmail}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#635B65] block uppercase">Expected Outcome</span>
                <StatusBadge status={activeScenario.expectedOutcome as any} size="sm" />
              </div>
            </div>

            {/* Architectural note */}
            <div className="p-3 bg-white border border-[#D7CBD2] rounded font-mono text-xs text-[#635B65] mb-4">
              <strong className="text-[#51404B]">Gateway Policy:</strong> {activeScenario.keyNotes}
            </div>

            {/* Custom test payload input */}
            <div className="space-y-1.5 mb-5">
              <label className="block font-mono text-xs font-bold uppercase text-[#51404B]">
                Plaintext Test Payload for Simulation
              </label>
              <textarea
                rows={3}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#79616f]"
              />
            </div>

            {/* Run Button */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#635B65]">
                Executes cryptographic operations through Gateway API
              </span>
              <button
                type="button"
                onClick={handleRunScenario}
                disabled={running}
                className="px-6 py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center gap-2 transition hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                {running ? 'Executing Scenario...' : 'Execute Scenario Simulation'}
              </button>
            </div>
          </BrutalCard>

          {/* Error Banner if scenario is negative test or failed */}
          {executionError && (
            <div className="p-4 bg-amber-50 border-2 border-amber-800 text-amber-950 font-mono text-xs rounded-sm space-y-2 shadow-brutal-sm">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4" />
                <span>Security Enforcement / Gateway Decision</span>
              </div>
              <p>{executionError}</p>
            </div>
          )}

          {/* Execution Result Box */}
          {executionResult && (
            <BrutalCard
              title="Simulation Execution Results"
              subtitle={`Status: ${executionResult.status || 'PROCESSED'}`}
              variant="white"
            >
              <div className="space-y-4 font-mono text-xs">
                {/* Decision Box */}
                <div className="p-3 bg-[#E9DFE5] border-2 border-[#51404B] rounded-sm space-y-1">
                  <div className="font-bold uppercase text-[#51404B]">Gateway Decision & Verification</div>
                  <div className="text-sm font-bold text-[#252126]">{executionResult.gatewayDecision}</div>
                  {executionResult.incomingVerification && (
                    <div className="text-[11px] text-[#635B65] pt-1">
                      Inbound Verification: {executionResult.incomingVerification}
                    </div>
                  )}
                </div>

                {/* Security Implications Note */}
                <div className="p-3 bg-white border border-[#51404B] rounded-sm text-[11px] text-[#51404B]">
                  <strong>Security Analysis:</strong> {executionResult.securityNotes}
                </div>

                {/* Output payload if generated */}
                {executionResult.finalOutput && (
                  <div>
                    <span className="font-bold uppercase text-[11px] text-[#51404B] block mb-1">
                      Recipient Envelope ({executionResult.format})
                    </span>
                    <CodeBlock
                      code={executionResult.finalOutput}
                      language={executionResult.format || 'Ciphertext'}
                      maxHeight="max-h-56"
                    />
                  </div>
                )}
              </div>
            </BrutalCard>
          )}

          {/* Cross-Protocol Theory Box */}
          <div className="p-5 bg-white border-2 border-[#51404B] shadow-brutal rounded-sm space-y-3 font-mono text-xs">
            <h4 className="font-sans font-bold text-sm uppercase text-[#51404B] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Academic Note on Cross-Protocol Trust Boundaries
            </h4>
            <p className="text-[#635B65] leading-relaxed">
              Because S/MIME (CMS/PKCS#7) and OpenPGP (RFC 4880) use completely different cryptographic envelopes
              and ASN.1 vs OpenPGP packet structures, direct ciphertext translation is mathematically impossible without decryption.
            </p>
            <p className="text-[#635B65] leading-relaxed">
              The gateway acts as an <strong>Authorized Trust Boundary</strong>. It decrypts the inbound message, verifies the sender’s original signature, and then re-encrypts for the recipient. To ensure non-repudiation, the gateway generates a secondary attestation signature stating that it received and validated the original sender’s signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
