import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Lock,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Shield,
  Key,
  Paperclip,
  ArrowRight,
  RefreshCw,
  Terminal,
  FileText
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { ProcessedEmailResult, SecurityProtocol, ProcessingStage } from '../types';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { ProtocolBadge } from '../components/ProtocolBadge';
import { CodeBlock } from '../components/CodeBlock';

export const EmailComposer: React.FC = () => {
  // Form State
  const [senderEmail, setSenderEmail] = useState('alice@gateway.internal');
  const [recipientEmail, setRecipientEmail] = useState('bob@gateway.internal');
  const [subject, setSubject] = useState('Quarterly Security Evaluation & Protocol Interoperability');
  const [body, setBody] = useState(
    'Mansi Chalak Gateway Test Message:\nThis document validates cryptographic message processing, X.509 signature verification, and controlled cross-protocol transition to OpenPGP.'
  );
  const [protocol, setProtocol] = useState<SecurityProtocol>('auto');
  const [encrypt, setEncrypt] = useState(true);
  const [sign, setSign] = useState(true);
  const [attachment, setAttachment] = useState<{ name: string; size: string } | null>(null);

  // Workflow State: 1 = Form, 2 = Pre-Flight Review, 3 = Processing, 4 = Result, 5 = Audit Inspection
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Pre-flight check state
  const [preFlightLoading, setPreFlightLoading] = useState(false);
  const [preFlightCheck, setPreFlightCheck] = useState<{
    hasSmime: boolean;
    hasOpenPgp: boolean;
    recommendedProtocol: string;
    statusMessage: string;
  } | null>(null);
  const [preFlightError, setPreFlightError] = useState<string | null>(null);

  // Execution state
  const [processingLoading, setProcessingLoading] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedEmailResult | null>(null);

  // Step 2 Trigger: Trigger pre-flight evaluation
  const handleProceedToPreFlight = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!senderEmail || !recipientEmail || !subject || !body) {
      alert('Please fill in all required email fields.');
      return;
    }

    setCurrentStep(2);
    setPreFlightLoading(true);
    setPreFlightError(null);

    try {
      // Calls POST /api/keys/check-recipient - fully implemented and registered!
      const check = await apiClient.checkRecipient(recipientEmail);
      setPreFlightCheck(check);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPreFlightError(`Pre-execution error [${err.code}]: ${err.message}`);
      } else {
        setPreFlightError(err instanceof Error ? err.message : 'Unknown pre-flight checking error.');
      }
    } finally {
      setPreFlightLoading(false);
    }
  };

  // Step 3 & 4: Execute Cryptographic Gateway Processing
  const handleExecuteProcessing = async () => {
    setCurrentStep(3);
    setProcessingLoading(true);
    setProcessingError(null);

    try {
      const res = await apiClient.processGatewayMessage({
        senderEmail,
        recipientEmail,
        subject,
        body,
        protocol,
        encrypt,
        sign
      });
      setResult(res);
      setCurrentStep(4);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setProcessingError(`Cryptographic Processing Error [${err.code}]: ${err.message}`);
      } else {
        setProcessingError(err instanceof Error ? err.message : 'Processing failed unexpectedly.');
      }
      // Stay on step 3 with error visible so user sees the real failure
    } finally {
      setProcessingLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setResult(null);
    setProcessingError(null);
    setPreFlightError(null);
  };

  // Preset demo fillers
  const loadScenario = (type: 'alice-bob-cross' | 'alice-bob-smime' | 'missing-key') => {
    if (type === 'alice-bob-cross') {
      setSenderEmail('alice@gateway.internal');
      setRecipientEmail('bob@gateway.internal');
      setProtocol('auto');
      setSubject('Cross-Protocol S/MIME to OpenPGP Transmission');
      setBody('Alice signs with S/MIME; Bob receives OpenPGP ASCII ciphertext. Gateway executes trusted trans-encryption.');
      setEncrypt(true);
      setSign(true);
    } else if (type === 'alice-bob-smime') {
      setSenderEmail('alice@gateway.internal');
      setRecipientEmail('bob@gateway.internal');
      setProtocol('smime');
      setSubject('Direct S/MIME End-to-End Transmission');
      setBody('Direct S/MIME PKCS#7 envelope encrypted with Bob\'s X.509 certificate.');
      setEncrypt(true);
      setSign(true);
    } else if (type === 'missing-key') {
      setSenderEmail('alice@gateway.internal');
      setRecipientEmail('unregistered_user@external.org');
      setProtocol('openpgp');
      setSubject('Failure Scenario: Unregistered Recipient Public Key');
      setBody('This email is sent to an address with no public credentials to test failsafe abortion.');
      setEncrypt(true);
      setSign(true);
    }
    handleReset();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            SECURE MESSAGE GENERATOR // 5-STEP CRYPTOGRAPHIC PIPELINE
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            Secure Email Composer
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Construct RFC 5322 electronic mail protected with standards-compliant S/MIME or OpenPGP cryptography.
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-[#635B65] font-bold">PRESETS:</span>
          <button
            type="button"
            onClick={() => loadScenario('alice-bob-cross')}
            className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#E9DFE5] hover:bg-[#d8c7d3] text-[#51404B] border border-[#51404B] rounded"
          >
            Alice → Bob (Cross-Protocol)
          </button>
          <button
            type="button"
            onClick={() => loadScenario('alice-bob-smime')}
            className="px-2.5 py-1 text-[11px] font-mono font-bold bg-white hover:bg-gray-100 text-[#51404B] border border-[#51404B] rounded"
          >
            Alice → Bob (Direct S/MIME)
          </button>
          <button
            type="button"
            onClick={() => loadScenario('missing-key')}
            className="px-2.5 py-1 text-[11px] font-mono font-bold bg-red-100 hover:bg-red-200 text-red-900 border border-red-800 rounded"
          >
            Missing Key Test
          </button>
        </div>
      </div>

      {/* WORKFLOW STEPPER */}
      <div className="grid grid-cols-5 gap-2 border-2 border-[#51404B] p-2 bg-[#F8F5F7] shadow-brutal-sm rounded-sm">
        {[
          { step: 1, label: 'Compose & Validate' },
          { step: 2, label: 'Pre-Flight Check' },
          { step: 3, label: 'Cryptographic Run' },
          { step: 4, label: 'Inspect Output' },
          { step: 5, label: 'Audit Record' }
        ].map((s) => {
          const isDone = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          let color = 'bg-white text-[#635B65] border-[#D7CBD2]';
          if (isCurrent) {
            color = 'bg-[#79616f] text-white border-[#51404B] font-bold shadow-sm';
          } else if (isDone) {
            color = 'bg-emerald-100 text-emerald-900 border-emerald-800 font-bold';
          }
          return (
            <div
              key={s.step}
              className={`p-2 border text-center rounded-sm text-xs font-mono transition-all ${color}`}
            >
              <span className="block text-[10px] opacity-75">STEP 0{s.step}</span>
              <span className="truncate block font-sans font-bold">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: FORM COMPOSITION */}
      {currentStep === 1 && (
        <BrutalCard title="Message Parameters" subtitle="Specify origin, recipient, and cryptographic preferences">
          <form onSubmit={handleProceedToPreFlight} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Sender Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. alice@gateway.internal"
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#79616f]"
                />
                <span className="text-[10px] font-mono text-[#635B65]">Registered demo key available for alice@gateway.internal</span>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. bob@gateway.internal"
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#79616f]"
                />
                <span className="text-[10px] font-mono text-[#635B65]">Registered demo keys available for bob@gateway.internal</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of the email"
                className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#79616f]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                Message Body *
              </label>
              <textarea
                required
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter plaintext message content..."
                className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#79616f]"
              />
            </div>

            {/* Cryptographic Controls */}
            <div className="p-4 bg-[#F8F5F7] border-2 border-[#51404B] rounded-sm space-y-3">
              <div className="font-mono text-xs font-bold uppercase text-[#51404B]">
                Cryptographic Directives
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Protocol Choice */}
                <div>
                  <label className="block text-[11px] font-mono text-[#635B65] mb-1">Target Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as SecurityProtocol)}
                    className="w-full px-2.5 py-1.5 border-2 border-[#51404B] rounded-sm font-mono text-xs bg-white"
                  >
                    <option value="auto">Automatic (Compatibility Assessment)</option>
                    <option value="smime">S/MIME (X.509 PKCS#7)</option>
                    <option value="openpgp">OpenPGP (RFC 4880)</option>
                  </select>
                </div>

                {/* Encryption Toggle */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="encCheck"
                    checked={encrypt}
                    onChange={(e) => setEncrypt(e.target.checked)}
                    className="w-4 h-4 text-[#79616f] border-[#51404B] rounded"
                  />
                  <label htmlFor="encCheck" className="text-xs font-mono font-bold text-[#252126] cursor-pointer">
                    Enable Encryption
                  </label>
                </div>

                {/* Signature Toggle */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="signCheck"
                    checked={sign}
                    onChange={(e) => setSign(e.target.checked)}
                    className="w-4 h-4 text-[#79616f] border-[#51404B] rounded"
                  />
                  <label htmlFor="signCheck" className="text-xs font-mono font-bold text-[#252126] cursor-pointer">
                    Apply Digital Signature
                  </label>
                </div>
              </div>

              {/* Attachment simulator */}
              <div className="pt-2 border-t border-[#D7CBD2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#79616f]" />
                  <span className="text-xs font-mono text-[#635B65]">
                    {attachment ? `${attachment.name} (${attachment.size})` : 'Optional Attachment Simulator'}
                  </span>
                </div>
                {attachment ? (
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-[11px] font-mono text-red-700 underline"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAttachment({ name: 'security_brief.pdf', size: '24.8 KB' })}
                    className="px-2 py-0.5 text-[11px] font-mono bg-white border border-[#51404B] rounded hover:bg-gray-50"
                  >
                    Attach Demo PDF
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center gap-2 transition hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                Proceed to Pre-Flight Check <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </BrutalCard>
      )}

      {/* STEP 2: PRE-FLIGHT COMPATIBILITY & PREREQUISITES REVIEW */}
      {currentStep === 2 && (
        <BrutalCard
          title="Step 2: Pre-Execution Cryptographic Review"
          subtitle="Verifying recipient credentials and protocol prerequisites"
          variant="mauve"
        >
          {preFlightLoading ? (
            <div className="p-8 text-center space-y-3 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#51404B]" />
              <p>Querying Gateway Directory for recipient credentials...</p>
            </div>
          ) : preFlightError ? (
            <div className="p-5 bg-red-50 border-2 border-red-800 text-red-900 rounded-sm space-y-3 font-mono text-xs">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Pre-Flight Validation Blocked</span>
              </div>
              <p>{preFlightError}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 bg-white border border-red-900 text-red-900 font-bold rounded"
                >
                  Edit Message Parameters
                </button>
                <button
                  onClick={() => handleProceedToPreFlight()}
                  className="px-3 py-1.5 bg-red-800 text-white font-bold rounded"
                >
                  Retry Pre-Flight
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 font-mono text-xs">
              <div className="p-4 bg-white border-2 border-[#51404B] rounded-sm space-y-2">
                <div className="font-bold uppercase text-sm text-[#51404B]">Credential Compatibility Assessment</div>
                <p className="text-[#635B65]">{preFlightCheck?.statusMessage}</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
                    <span className="font-bold block">S/MIME X.509 Certificate:</span>
                    {preFlightCheck?.hasSmime ? (
                      <span className="text-emerald-700 font-bold">✓ AVAILABLE (Demo Cert Ready)</span>
                    ) : (
                      <span className="text-amber-800 font-bold">✗ NOT REGISTERED</span>
                    )}
                  </div>
                  <div className="p-2.5 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
                    <span className="font-bold block">OpenPGP Public Key:</span>
                    {preFlightCheck?.hasOpenPgp ? (
                      <span className="text-emerald-700 font-bold">✓ AVAILABLE (RFC 4880 Ready)</span>
                    ) : (
                      <span className="text-amber-800 font-bold">✗ NOT REGISTERED</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Interop warning if needed */}
              <div className="p-4 bg-white border-2 border-[#51404B] rounded-sm space-y-2">
                <div className="font-bold uppercase text-xs text-[#51404B]">Routing Resolution</div>
                <div className="text-[#252126] flex items-center justify-between">
                  <span>Target Recipient Protocol:</span>
                  <span className="font-bold uppercase text-sm text-[#79616f]">
                    {protocol === 'auto' ? preFlightCheck?.recommendedProtocol?.toUpperCase() || 'S/MIME' : protocol.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-[#635B65]">
                  Gateway will enforce sender digital signature and recipient encryption.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-white border-2 border-[#51404B] font-bold uppercase rounded-sm shadow-brutal-sm"
                >
                  ← Back to Parameters
                </button>
                <button
                  type="button"
                  onClick={handleExecuteProcessing}
                  className="px-6 py-2.5 bg-[#79616f] hover:bg-[#917987] text-white font-bold uppercase rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center gap-2"
                >
                  Execute Cryptographic Gateway <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </BrutalCard>
      )}

      {/* STEP 3: PROCESSING STATE & ERROR BOUNDARY */}
      {currentStep === 3 && (
        <BrutalCard title="Step 3: Cryptographic Gateway Processing" subtitle="Applying encryption, signing, and protocol bridging">
          {processingLoading ? (
            <div className="p-12 text-center space-y-4 font-mono text-xs">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#79616f]" />
              <div className="font-bold text-sm uppercase">Executing Cryptographic Transforms...</div>
              <p className="text-[#635B65] max-w-md mx-auto">
                Validating RFC 5322 headers, signing payload with sender credentials, and evaluating protocol envelope.
              </p>
            </div>
          ) : processingError ? (
            <div className="p-6 bg-red-50 border-2 border-red-800 text-red-900 rounded-sm space-y-4 font-mono text-xs">
              <div className="font-bold text-sm flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-700" />
                <span>CRYPTOGRAPHIC PROCESSING ABORTED</span>
              </div>
              <p className="leading-relaxed">{processingError}</p>
              <div className="p-3 bg-white border border-red-300 rounded text-[11px] text-gray-700">
                <strong>Why did this occur?</strong> The gateway strictly enforces cryptographic safety. If a recipient key is missing, or a certificate chain fails validation, processing fails closed rather than leaking unencrypted data.
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-white border-2 border-red-900 text-red-900 font-bold uppercase rounded-sm hover:bg-gray-100"
                >
                  Edit Message
                </button>
                <button
                  onClick={handleExecuteProcessing}
                  className="px-4 py-2 bg-red-800 text-white font-bold uppercase rounded-sm border-2 border-red-950 hover:bg-red-700"
                >
                  Retry Execution
                </button>
              </div>
            </div>
          ) : null}
        </BrutalCard>
      )}

      {/* STEP 4 & 5: OPERATION RESULT & AUDIT INFORMATION */}
      {(currentStep === 4 || currentStep === 5) && result && (
        <div className="space-y-6">
          <BrutalCard
            title="Gateway Processing Output"
            subtitle={`Message ID: ${result.messageId}`}
            badge={<StatusBadge status="SUCCESS" text="CRYPTOGRAPHICALLY PROCESSED" size="md" />}
          >
            {/* Delivery notice */}
            <div className="p-3 bg-emerald-50 border-2 border-emerald-800 text-emerald-950 font-mono text-xs rounded-sm mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{result.deliveryNotice}</span>
              </div>
              <span className="font-bold text-[10px] bg-emerald-200 px-2 py-0.5 rounded">
                AUDIT ID: {result.auditEventId}
              </span>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="mb-6 space-y-2">
              <span className="font-mono text-xs font-bold uppercase text-[#51404B]">Pipeline Trace</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {result.stages.map((stage) => (
                  <div key={stage.id} className="p-2.5 bg-[#F8F5F7] border border-[#51404B] rounded-sm text-xs font-mono">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px]">STAGE {stage.id}</span>
                      <StatusBadge status={stage.status} size="sm" />
                    </div>
                    <div className="font-bold text-[11px] truncate">{stage.name}</div>
                    <p className="text-[10px] text-[#635B65] mt-1 leading-tight">{stage.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Report Box */}
            <div className="p-4 bg-[#E9DFE5] border-2 border-[#51404B] rounded-sm font-mono text-xs space-y-2 mb-6">
              <div className="font-bold uppercase text-xs text-[#51404B] flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Security Assessment Report
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded border border-[#51404B]">
                  <span className="text-[#635B65] block text-[10px]">Encryption State</span>
                  <span className="font-bold text-emerald-800">
                    {result.securityReport.encrypted ? `✓ ${result.securityReport.encryptionAlgorithm}` : 'Unencrypted'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded border border-[#51404B]">
                  <span className="text-[#635B65] block text-[10px]">Signature Verification</span>
                  <span className="font-bold text-emerald-800">
                    {result.securityReport.signed ? `✓ ${result.securityReport.signerIdentity}` : 'Unsigned'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded border border-[#51404B]">
                  <span className="text-[#635B65] block text-[10px]">Gateway Transition</span>
                  <span className="font-bold text-[#51404B]">
                    {result.isCrossProtocol ? '✓ Re-Encapsulated' : 'Direct Protocol Match'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#51404B] pt-1 leading-relaxed">
                {result.securityReport.trustAssessment}
              </p>
            </div>

            {/* Raw MIME Payload & Headers */}
            <div className="space-y-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#51404B]">
                  RFC 5322 MIME Headers
                </span>
                <CodeBlock
                  code={Object.entries(result.outputMessage.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n')}
                  language="RFC 5322 Headers"
                  maxHeight="max-h-48"
                />
              </div>

              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#51404B]">
                  Encapsulated Ciphertext Payload ({result.outputMessage.format})
                </span>
                <CodeBlock
                  code={result.outputMessage.rawPayload}
                  language={result.outputMessage.format}
                  maxHeight="max-h-64"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t-2 border-[#51404B] mt-6">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-white border-2 border-[#51404B] font-mono text-xs font-bold uppercase rounded-sm shadow-brutal-sm hover:bg-gray-100 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Compose Another Message
              </button>

              <div className="flex gap-2">
                <Link
                  to="/audit-logs"
                  className="px-4 py-2 bg-[#51404B] text-white border-2 border-[#252126] font-mono text-xs font-bold uppercase rounded-sm shadow-brutal-sm hover:bg-[#3f313a] flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View in Audit Log
                </Link>
                <Link
                  to="/interop-lab"
                  className="px-4 py-2 bg-[#79616f] text-white border-2 border-[#51404B] font-mono text-xs font-bold uppercase rounded-sm shadow-brutal-sm hover:bg-[#917987]"
                >
                  Open Interop Lab →
                </Link>
              </div>
            </div>
          </BrutalCard>
        </div>
      )}
    </div>
  );
};
