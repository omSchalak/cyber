import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Send,
  Trash2,
  Play,
  KeyRound,
  FileCode,
  CheckCircle,
  XCircle,
  Clock,
  Layers
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { DashboardStats, HealthCheckResponse } from '../types';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { ProtocolBadge } from '../components/ProtocolBadge';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cryptoTestRunning, setCryptoTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDashboard();
      setStats(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(`[${err.code}] ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect to gateway dashboard API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunSelfTest = async () => {
    setCryptoTestRunning(true);
    setTestResult(null);
    try {
      const res = await apiClient.simulateInteropScenario('1');
      setTestResult(`Cryptographic Self-Test PASSED: Real PKCS#7 signed & encrypted envelope generated (${res.format}).`);
      await fetchDashboardData();
    } catch (err: unknown) {
      setTestResult(`Self-Test Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCryptoTestRunning(false);
    }
  };

  const handleClearRecords = async () => {
    try {
      await apiClient.clearAuditLogs();
      setConfirmClearOpen(false);
      await fetchDashboardData();
    } catch (err) {
      alert(`Failed to clear records: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#51404B] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
              OPERATIONAL TELEMETRY // REAL-TIME MONITORING
            </span>
          </div>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            Security Operations Dashboard
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Status of active cryptographic engines, signature verifications, and cross-protocol transitions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 bg-white hover:bg-[#F8F5F7] text-[#51404B] font-mono text-xs font-bold uppercase border-2 border-[#51404B] rounded-sm shadow-brutal-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleRunSelfTest}
            disabled={cryptoTestRunning}
            className="px-3.5 py-2 bg-[#79616f] hover:bg-[#917987] text-white font-mono text-xs font-bold uppercase border-2 border-[#51404B] rounded-sm shadow-brutal-sm flex items-center gap-1.5 transition"
          >
            <Play className={`w-3.5 h-3.5 ${cryptoTestRunning ? 'animate-pulse' : ''}`} />
            {cryptoTestRunning ? 'Running Crypto...' : 'Run Cryptographic Self-Test'}
          </button>
          <Link
            to="/composer"
            className="px-3.5 py-2 bg-[#51404B] hover:bg-[#3f313a] text-white font-mono text-xs font-bold uppercase border-2 border-[#252126] rounded-sm shadow-brutal-sm flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            New Email
          </Link>
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-800 font-mono text-xs font-bold uppercase border-2 border-red-800 rounded-sm shadow-brutal-sm flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Demo Records
          </button>
        </div>
      </div>

      {/* Confirmation modal for clearing records */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#51404B] p-6 max-w-md w-full shadow-brutal-lg rounded-sm space-y-4">
            <h3 className="font-sans font-black text-xl uppercase tracking-tight text-[#252126]">
              Clear Demonstration Records?
            </h3>
            <p className="font-mono text-xs text-[#635B65]">
              This will reset the in-memory audit logs and test telemetry recorded during this session.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 border-2 border-[#51404B] font-mono text-xs font-bold uppercase rounded-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleClearRecords}
                className="px-4 py-2 bg-red-700 text-white font-mono text-xs font-bold uppercase border-2 border-red-900 rounded-sm hover:bg-red-800"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Self test banner */}
      {testResult && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-800 text-emerald-950 font-mono text-xs rounded-sm shadow-brutal-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700" />
            <span>{testResult}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-5 bg-red-50 border-2 border-red-800 text-red-900 rounded-sm shadow-brutal-sm space-y-2">
          <div className="flex items-center gap-2 font-mono font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-red-700" />
            <span>GATEWAY API CONNECTION ERROR</span>
          </div>
          <p className="font-mono text-xs">{error}</p>
          <p className="font-mono text-[11px] text-red-700">
            Verify that your backend serverless functions are responding and that /api/dashboard is registered.
          </p>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Gateway Status */}
        <div className="border-2 border-[#51404B] p-4 bg-white shadow-brutal-sm rounded-sm">
          <div className="font-mono text-[11px] font-bold text-[#635B65] uppercase">
            GATEWAY API
          </div>
          <div className="mt-2 flex items-center gap-2">
            {stats?.apiHealth?.status === 'healthy' ? (
              <span className="font-sans font-black text-2xl text-emerald-700">ONLINE</span>
            ) : (
              <span className="font-sans font-black text-2xl text-red-700">OFFLINE</span>
            )}
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#635B65]">
            Uptime: {stats?.apiHealth?.uptimeSeconds || 0}s | v{stats?.apiHealth?.version || '1.0'}
          </div>
        </div>

        {/* KPI 2: Total Operations */}
        <div className="border-2 border-[#51404B] p-4 bg-white shadow-brutal-sm rounded-sm">
          <div className="font-mono text-[11px] font-bold text-[#635B65] uppercase">
            TOTAL OPERATIONS
          </div>
          <div className="mt-2 font-sans font-black text-3xl text-[#252126]">
            {stats?.totalOperations ?? '—'}
          </div>
          <div className="mt-2 text-[10px] font-mono text-emerald-700 font-bold">
            ✓ {stats?.successfulOperations ?? 0} SUCCESSFUL
          </div>
        </div>

        {/* KPI 3: S/MIME Operations */}
        <div className="border-2 border-[#51404B] p-4 bg-white shadow-brutal-sm rounded-sm">
          <div className="font-mono text-[11px] font-bold text-[#635B65] uppercase">
            S/MIME PKCS#7 OPS
          </div>
          <div className="mt-2 font-sans font-black text-3xl text-[#79616f]">
            {stats?.smimeOperations ?? '—'}
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#635B65]">
            X.509 Certificate Chain
          </div>
        </div>

        {/* KPI 4: OpenPGP Operations */}
        <div className="border-2 border-[#51404B] p-4 bg-white shadow-brutal-sm rounded-sm">
          <div className="font-mono text-[11px] font-bold text-[#635B65] uppercase">
            OPENPGP OPS
          </div>
          <div className="mt-2 font-sans font-black text-3xl text-[#51404B]">
            {stats?.openpgpOperations ?? '—'}
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#635B65]">
            RFC 4880 Armored Data
          </div>
        </div>

        {/* KPI 5: Cross-Protocol Transitions */}
        <div className="border-2 border-[#51404B] p-4 bg-[#E9DFE5] shadow-brutal-sm rounded-sm">
          <div className="font-mono text-[11px] font-bold text-[#51404B] uppercase">
            CROSS-PROTOCOL OPS
          </div>
          <div className="mt-2 font-sans font-black text-3xl text-[#831843]">
            {stats?.crossProtocolOperations ?? '—'}
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#51404B] font-bold">
            Trusted Boundary Re-key
          </div>
        </div>
      </div>

      {/* PROTOCOL USAGE BREAKDOWN & ENGINES STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Distribution Chart */}
        <BrutalCard
          title="Protocol Distribution"
          subtitle="Relative cryptographic traffic breakdown"
          className="lg:col-span-2"
        >
          <div className="space-y-4 pt-2">
            {/* Visual Bar 1 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#79616f] inline-block border border-[#51404B]"></span>
                  S/MIME PKCS#7 Processing
                </span>
                <span className="font-mono font-bold">{stats?.smimeOperations || 0} ops</span>
              </div>
              <div className="w-full h-5 bg-[#F8F5F7] border border-[#51404B] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#79616f] transition-all duration-500"
                  style={{
                    width: `${stats?.totalOperations ? ((stats.smimeOperations / stats.totalOperations) * 100).toFixed(1) : 40}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Visual Bar 2 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#51404B] inline-block border border-[#252126]"></span>
                  OpenPGP RFC 4880 Processing
                </span>
                <span className="font-mono font-bold">{stats?.openpgpOperations || 0} ops</span>
              </div>
              <div className="w-full h-5 bg-[#F8F5F7] border border-[#51404B] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#51404B] transition-all duration-500"
                  style={{
                    width: `${stats?.totalOperations ? ((stats.openpgpOperations / stats.totalOperations) * 100).toFixed(1) : 35}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Visual Bar 3 */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#831843] inline-block border border-[#500724]"></span>
                  Cross-Protocol Gateway Transitions
                </span>
                <span className="font-mono font-bold">{stats?.crossProtocolOperations || 0} ops</span>
              </div>
              <div className="w-full h-5 bg-[#F8F5F7] border border-[#51404B] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#831843] transition-all duration-500"
                  style={{
                    width: `${stats?.totalOperations ? ((stats.crossProtocolOperations / stats.totalOperations) * 100).toFixed(1) : 25}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-[#D7CBD2] text-[11px] font-mono text-[#635B65] flex items-center justify-between">
            <span>Data source: Gateway session telemetry</span>
            <span className="bg-[#E9DFE5] px-2 py-0.5 rounded font-bold text-[#51404B]">
              DEMONSTRATION METRICS
            </span>
          </div>
        </BrutalCard>

        {/* Engine Specs */}
        <BrutalCard
          title="Engine Readiness"
          subtitle="Cryptographic subsystem telemetry"
          variant="mauve"
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-white border border-[#51404B] rounded-sm flex items-center justify-between">
              <div>
                <div className="font-bold">OpenPGP.js</div>
                <div className="text-[10px] text-[#635B65]">RFC 4880 & RFC 9580 Engine</div>
              </div>
              <StatusBadge status="SUCCESS" text="ACTIVE v5.11" size="sm" />
            </div>

            <div className="p-3 bg-white border border-[#51404B] rounded-sm flex items-center justify-between">
              <div>
                <div className="font-bold">node-forge PKCS#7</div>
                <div className="text-[10px] text-[#635B65]">X.509, CMS Signed & EnvelopedData</div>
              </div>
              <StatusBadge status="SUCCESS" text="ACTIVE" size="sm" />
            </div>

            <div className="p-3 bg-white border border-[#51404B] rounded-sm flex items-center justify-between">
              <div>
                <div className="font-bold">Gateway Operator</div>
                <div className="text-[10px] text-[#635B65]">Identity Certificate</div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#51404B] bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">
                Mansi Chalak
              </span>
            </div>

            <div className="p-3 bg-white border border-[#51404B] rounded-sm flex items-center justify-between">
              <div>
                <div className="font-bold">Signatures Verified</div>
                <div className="text-[10px] text-[#635B65]">Integrity checks completed</div>
              </div>
              <span className="font-bold text-sm text-emerald-800">
                {stats?.signaturesVerified ?? 0}
              </span>
            </div>
          </div>
        </BrutalCard>
      </div>

      {/* RECENT AUDIT ACTIVITY TABLE */}
      <BrutalCard
        title="Recent Demonstration Operations"
        subtitle="Live audit trail of inbound message routing and signature validation"
        badge={
          <Link
            to="/audit-logs"
            className="text-xs font-mono font-bold text-[#79616f] hover:underline"
          >
            View Complete Audit Log →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-[#51404B] text-white border-2 border-[#252126]">
                <th className="p-2.5 uppercase">Event ID</th>
                <th className="p-2.5 uppercase">Timestamp</th>
                <th className="p-2.5 uppercase">Protocol</th>
                <th className="p-2.5 uppercase">Operation</th>
                <th className="p-2.5 uppercase">Status</th>
                <th className="p-2.5 uppercase">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7CBD2] bg-white">
              {stats?.recentAuditEvents && stats.recentAuditEvents.length > 0 ? (
                stats.recentAuditEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#F8F5F7]">
                    <td className="p-2.5 font-bold text-[#51404B]">{evt.id}</td>
                    <td className="p-2.5 text-[#635B65] whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5">
                      <ProtocolBadge protocol={evt.protocol} size="sm" />
                    </td>
                    <td className="p-2.5 font-bold">{evt.operation}</td>
                    <td className="p-2.5">
                      <StatusBadge status={evt.status} size="sm" />
                    </td>
                    <td className="p-2.5 text-[#635B65] max-w-xs truncate" title={evt.verificationOutcome || evt.details}>
                      {evt.verificationOutcome || evt.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#635B65]">
                    No recent audit events located. Run a test operation or compose an email.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </BrutalCard>
    </div>
  );
};
