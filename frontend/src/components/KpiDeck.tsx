import React from 'react';
import { HeartPulse, Activity, AlertTriangle, Clock } from 'lucide-react';
import { SystemMetrics } from '../types';

interface KpiDeckProps {
  metrics: SystemMetrics | null;
}

export const KpiDeck: React.FC<KpiDeckProps> = ({ metrics }) => {
  const healthIndex = metrics?.health_index ?? 100;
  const totalChecks = metrics?.total_checks ?? 0;
  const totalAnomalies = metrics?.total_anomalies ?? 0;
  const fastPathChecks = Math.max(0, totalChecks - totalAnomalies);
  const anomalyRate = metrics?.anomaly_rate ?? 0;
  const activeIncidents = metrics?.active_incidents ?? 0;
  const avgLatency = metrics?.avg_latency_ms ?? 0;
  const avgMttr = metrics?.avg_mttr_seconds ?? 0;

  const healthColor =
    healthIndex >= 90
      ? 'text-emerald-400'
      : healthIndex >= 70
      ? 'text-amber-400'
      : 'text-rose-400';

  const healthBarColor =
    healthIndex >= 90
      ? 'bg-emerald-500'
      : healthIndex >= 70
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <section
      aria-label="Key Performance Indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Card 1: System Health Index */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            System Health Index
          </span>
          <HeartPulse className={`h-4 w-4 ${healthColor}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-3xl font-bold font-mono ${healthColor}`}>
            {healthIndex}%
          </span>
          <span className="text-xs text-slate-400">
            {healthIndex >= 90 ? 'Optimal' : healthIndex >= 70 ? 'Degraded' : 'Critical'}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${healthBarColor}`}
            style={{ width: `${Math.min(100, Math.max(5, healthIndex))}%` }}
          />
        </div>
      </div>

      {/* Card 2: Total Monitored Checks & FinOps Fast-Path */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Checks Ingested
          </span>
          <Activity className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-white">
            {totalChecks.toLocaleString()}
          </span>
          <span className="text-xs text-emerald-400 font-medium">
            {fastPathChecks} fast-path (0 tokens)
          </span>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">
          Healthy telemetry bypasses LLM to preserve quota
        </p>
      </div>

      {/* Card 3: Anomaly Rate & Active Incidents */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Anomaly Rate &amp; Active
          </span>
          <AlertTriangle
            className={`h-4 w-4 ${
              activeIncidents > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span
            className={`text-3xl font-bold font-mono ${
              anomalyRate > 15 ? 'text-rose-400' : anomalyRate > 0 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {anomalyRate}%
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
              activeIncidents > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {activeIncidents} Active
          </span>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">
          {totalAnomalies} anomalous responses detected ({metrics?.resolved_incidents ?? 0} resolved)
        </p>
      </div>

      {/* Card 4: Avg Latency & MTTR */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Avg Latency &amp; MTTR
          </span>
          <Clock className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold font-mono ${
              avgLatency > 2500 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {avgLatency}ms
          </span>
          <span className="text-xs text-slate-400">
            SLA: 2500ms
          </span>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">
          Mean Time To Resolve (MTTR):{' '}
          <span className="font-mono font-semibold text-slate-200">
            {avgMttr > 0 ? `${avgMttr}s` : 'N/A'}
          </span>
        </p>
      </div>
    </section>
  );
};
