import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, Cpu, RotateCcw } from 'lucide-react';
import { SystemMetrics } from '../types';

interface HeaderProps {
  metrics: SystemMetrics | null;
  lastUpdated: Date;
  onRefresh: () => void;
  onResetDemo: () => Promise<void>;
  isOffline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  lastUpdated,
  onRefresh,
  onResetDemo,
  isOffline,
}) => {
  const [resetting, setResetting] = useState(false);
  const criticalCount = metrics?.critical_active ?? 0;
  const activeCount = metrics?.active_incidents ?? 0;

  const getStatusBanner = () => {
    if (isOffline) {
      return {
        label: 'Interactive SRE Engine Active',
        bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
        dot: 'bg-emerald-400',
      };
    }
    if (criticalCount > 0) {
      return {
        label: `${criticalCount} Critical Outage${criticalCount > 1 ? 's' : ''} Active`,
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
        dot: 'bg-rose-500 animate-ping',
      };
    }
    if (activeCount > 0) {
      return {
        label: `${activeCount} Degraded Service${activeCount > 1 ? 's' : ''}`,
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        dot: 'bg-amber-400 animate-pulse',
      };
    }
    return {
      label: 'All Systems Operational',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      dot: 'bg-emerald-400',
    };
  };

  const banner = getStatusBanner();

  const handleResetClick = async () => {
    setResetting(true);
    try {
      await onResetDemo();
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-inner">
            {criticalCount > 0 ? (
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white">
                SentinAI
              </h1>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                SRE Telemetry &amp; AI Triage
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Healthcare Microservice Reliability &amp; Automated Alerting Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {metrics?.ai_mode && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-slate-400">Triage Engine:</span>
              <span className="font-semibold text-blue-300">{metrics.ai_mode}</span>
            </div>
          )}

          <div
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${banner.bg}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${banner.dot}`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  criticalCount > 0
                    ? 'bg-rose-500'
                    : activeCount > 0
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            </span>
            {banner.label}
          </div>

          <button
            onClick={handleResetClick}
            disabled={resetting}
            title="Clear all demo logs and reset system back to 100% Healthy"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
          </button>

          <button
            onClick={onRefresh}
            title="Refresh telemetry and alerts"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
