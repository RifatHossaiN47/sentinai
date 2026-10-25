import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MailCheck,
  Sparkles,
  Wrench,
  ExternalLink,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import { AnomalyAlert } from '../types';

interface AlertFeedProps {
  alerts: AnomalyAlert[];
  onOpenResolveModal: (alert: AnomalyAlert) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  onOpenResolveModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'RESOLVED' | 'ALL'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, defaultOpen: boolean) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? defaultOpen),
    }));
  };

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus =
      statusFilter === 'ALL' ? true : alert.status === statusFilter;
    const matchesSeverity =
      severityFilter === 'ALL' ? true : alert.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const getSeverityBadge = (severity: AnomalyAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: <AlertOctagon className="h-3.5 w-3.5" />,
          classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          borderLeft: 'border-l-rose-500',
          label: 'P1 CRITICAL',
        };
      case 'HIGH':
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          borderLeft: 'border-l-amber-500',
          label: 'P2 HIGH',
        };
      default:
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          classes: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          borderLeft: 'border-l-blue-500',
          label: 'P3 WARNING',
        };
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-800/90 bg-slate-900/60 shadow-sm">
      {/* Feed Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            AI-Powered Anomaly Incident Feed
          </h2>
          <p className="text-xs text-slate-400">
            Real-time diagnostic alerts with root-cause analysis and 1-click SRE resolution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                statusFilter === 'RESOLVED'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({alerts.length})
            </button>
          </div>

          <select
            aria-label="Filter by severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">P1 Critical</option>
            <option value="HIGH">P2 High</option>
            <option value="WARNING">P3 Warning</option>
          </select>
        </div>
      </div>

      {/* Alert Cards List */}
      <div className="divide-y divide-slate-800/80 p-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-emerald-400/80 mb-2" />
            <p className="text-sm font-semibold text-slate-200">
              {statusFilter === 'ACTIVE'
                ? 'Zero Active Anomalies Detected'
                : 'No Incidents Match Selected Filters'}
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Use the Interactive Telemetry Simulator on the right to trigger HTTP 500 outages, latency spikes, or upload a static JSON batch file.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const sev = getSeverityBadge(alert.severity);
            const defaultOpen = alert.status === 'ACTIVE';
            const isExpanded = expandedIds[alert.id] ?? defaultOpen;
            const latestResolution = alert.action_logs?.[0];

            return (
              <article
                key={alert.id}
                className={`rounded-lg border border-slate-800 bg-slate-950/80 border-l-4 ${sev.borderLeft} p-4 transition hover:border-slate-700`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${sev.classes}`}
                    >
                      {sev.icon}
                      {sev.label}
                    </span>

                    <span className="font-mono text-sm font-bold text-white">
                      {alert.api_name}
                    </span>

                    <span
                      title={
                        alert.ai_fallback
                          ? 'Diagnosed via deterministic SRE fallback rules'
                          : 'Diagnosed live by Google Gemini AI'
                      }
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        alert.ai_fallback
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {alert.ai_fallback ? 'SRE Rule Fallback' : 'Gemini AI'}
                    </span>

                    {alert.occurrence_count > 1 && (
                      <span
                        title="Deduplicated repeated anomaly occurrences on this active incident"
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-300"
                      >
                        <Repeat className="h-3 w-3" />
                        &times;{alert.occurrence_count} occurrences
                      </span>
                    )}

                    {alert.email_dispatched && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        <MailCheck className="h-3 w-3" />
                        Email Sent
                        {alert.email_preview_url && (
                          <a
                            href={alert.email_preview_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 inline-flex items-center gap-0.5 underline hover:text-white"
                          >
                            (Preview <ExternalLink className="h-2.5 w-2.5" />)
                          </a>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(alert.last_detected_at).toLocaleTimeString()}
                    </span>
                    {alert.status === 'ACTIVE' ? (
                      <button
                        onClick={() => onOpenResolveModal(alert)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve Incident
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        RESOLVED
                      </span>
                    )}
                  </div>
                </div>

                {/* Alert Summary */}
                <p className="mt-2.5 text-sm font-medium text-slate-100 leading-snug">
                  &ldquo;{alert.message}&rdquo;
                </p>

                {/* Failing Telemetry Snapshot */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-slate-300">
                    <span>
                      Status:{' '}
                      <strong
                        className={
                          alert.status_code >= 500
                            ? 'text-rose-400'
                            : alert.status_code >= 400
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        HTTP {alert.status_code}
                      </strong>
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span>
                      Latency:{' '}
                      <strong
                        className={
                          alert.response_time_ms > 2500
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }
                      >
                        {alert.response_time_ms}ms
                      </strong>
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span>
                      Records:{' '}
                      <strong
                        className={
                          alert.records_returned === 0
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }
                      >
                        {alert.records_returned}
                      </strong>
                    </span>
                  </div>

                  <button
                    onClick={() => toggleExpand(alert.id, defaultOpen)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
                  >
                    {isExpanded ? (
                      <>
                        Hide AI Diagnosis <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        View AI Diagnosis <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Collapsible AI Root Cause & SRE Mitigation */}
                {isExpanded && (
                  <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg bg-slate-900/90 p-3 border border-slate-800/90 text-xs sm:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-blue-300 mb-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Root Cause Explanation
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {alert.root_cause_explanation}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-300 mb-1">
                        <Wrench className="h-3.5 w-3.5" />
                        Recommended SRE Action
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {alert.suggested_action}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resolution Audit Log Footer */}
                {alert.status === 'RESOLVED' && latestResolution && (
                  <div className="mt-2.5 rounded-md bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Resolved by {latestResolution.operator_name}:</strong>{' '}
                      {latestResolution.resolution_notes}
                    </span>
                    {latestResolution.mttr_seconds != null && (
                      <span className="font-mono font-semibold text-emerald-400">
                        MTTR: {latestResolution.mttr_seconds}s
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
