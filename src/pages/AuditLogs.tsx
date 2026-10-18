import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  FileSpreadsheet,
  FileJson,
  Lock
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { AuditEvent } from '../types';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { ProtocolBadge } from '../components/ProtocolBadge';

export const AuditLogs: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAuditLogs({
        search: search || undefined,
        protocol: protocolFilter !== 'All' ? protocolFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined
      });
      let sorted = [...res.events];
      if (sortOrder === 'oldest') {
        sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      } else {
        sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      setEvents(sorted);
      setTotal(res.total);
    } catch (err: unknown) {
      alert(`Failed to load audit logs: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [protocolFilter, statusFilter, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleClearLogs = async () => {
    try {
      await apiClient.clearAuditLogs();
      setConfirmClearOpen(false);
      await fetchLogs();
    } catch (err) {
      alert(`Clear failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Export to CSV
  const exportCsv = () => {
    const headers = ['EventID', 'Timestamp', 'Category', 'Protocol', 'Operation', 'Status', 'Outcome', 'Details'];
    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      e.category,
      e.protocol,
      `"${e.operation.replace(/"/g, '""')}"`,
      e.status,
      `"${(e.verificationOutcome || '').replace(/"/g, '""')}"`,
      `"${e.details.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gateway_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const exportJson = () => {
    const jsonStr = JSON.stringify(events, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gateway_audit_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            IMMUTABLE SECURITY LEDGER // AUDIT & COMPLIANCE
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            Gateway Security Audit Trail
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Diagnostic event trail of digital signature checks, certificate evaluations, and gateway conversions.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 text-[#51404B] font-mono text-xs font-bold uppercase border-2 border-[#51404B] rounded-sm shadow-brutal-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={events.length === 0}
            className="px-3.5 py-2 bg-[#E9DFE5] hover:bg-[#d8c7d3] text-[#51404B] font-mono text-xs font-bold uppercase border-2 border-[#51404B] rounded-sm shadow-brutal-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={exportJson}
            disabled={events.length === 0}
            className="px-3.5 py-2 bg-[#51404B] hover:bg-[#3f313a] text-white font-mono text-xs font-bold uppercase border-2 border-[#252126] rounded-sm shadow-brutal-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileJson className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-800 font-mono text-xs font-bold uppercase border-2 border-red-800 rounded-sm shadow-brutal-sm flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-[#51404B] p-6 max-w-md w-full shadow-brutal-lg rounded-sm space-y-4">
            <h3 className="font-sans font-black text-xl uppercase tracking-tight text-[#252126]">
              Clear Demonstration Audit Records?
            </h3>
            <p className="font-mono text-xs text-[#635B65]">
              This will wipe the audit trail in memory. New events will be generated on your next test execution.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 border-2 border-[#51404B] font-mono text-xs font-bold uppercase rounded-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-red-700 text-white font-mono text-xs font-bold uppercase border-2 border-red-900 rounded-sm"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy guarantee banner */}
      <div className="p-3.5 bg-white border-2 border-[#51404B] rounded-sm shadow-brutal-sm font-mono text-xs text-[#51404B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#79616f]" />
          <span>
            <strong>Zero-Knowledge Audit Policy:</strong> Event records strictly exclude plaintext message bodies, passphrases, private keys, and sensitive attachments.
          </span>
        </div>
        <span className="font-bold bg-[#E9DFE5] px-2 py-0.5 rounded text-[10px]">
          DEMONSTRATION AUDIT ENVIRONMENT
        </span>
      </div>

      {/* Search & Filters */}
      <div className="p-4 bg-[#F8F5F7] border-2 border-[#51404B] rounded-sm shadow-brutal-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event ID, sender, recipient, or operation..."
              className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs bg-white"
            >
              <option value="All">All Protocols</option>
              <option value="S/MIME">S/MIME</option>
              <option value="OpenPGP">OpenPGP</option>
              <option value="Cross-Protocol">Cross-Protocol</option>
              <option value="System">System</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="WARNING">WARNING</option>
              <option value="VALIDATION_ERROR">VALIDATION_ERROR</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-[#79616f] text-white font-mono text-xs font-bold uppercase rounded-sm border-2 border-[#51404B] shadow-sm hover:bg-[#917987]"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Events Table */}
      <BrutalCard
        title={`Audit Events Log (${events.length} of ${total} total)`}
        subtitle="Chronological trail of cryptographic activity"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-[#51404B] text-white border-2 border-[#252126]">
                <th className="p-3 uppercase">Event ID</th>
                <th className="p-3 uppercase">Timestamp</th>
                <th className="p-3 uppercase">Category</th>
                <th className="p-3 uppercase">Protocol</th>
                <th className="p-3 uppercase">Operation</th>
                <th className="p-3 uppercase">Status</th>
                <th className="p-3 uppercase">Outcome & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7CBD2] bg-white">
              {events.length > 0 ? (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#F8F5F7]">
                    <td className="p-3 font-bold text-[#51404B] whitespace-nowrap">{evt.id}</td>
                    <td className="p-3 text-[#635B65] whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold">{evt.category}</td>
                    <td className="p-3">
                      <ProtocolBadge protocol={evt.protocol} size="sm" />
                    </td>
                    <td className="p-3 font-bold">{evt.operation}</td>
                    <td className="p-3">
                      <StatusBadge status={evt.status} size="sm" />
                    </td>
                    <td className="p-3 text-[#252126] max-w-sm">
                      <div className="font-bold text-[#51404B]">{evt.verificationOutcome}</div>
                      <div className="text-[11px] text-[#635B65] mt-0.5">{evt.details}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#635B65]">
                    No audit records match the selected query criteria.
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
