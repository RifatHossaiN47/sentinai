import React, { useState } from 'react';
import { Server, Terminal } from 'lucide-react';
import { useTelemetry } from './hooks/useTelemetry';
import { Header } from './components/Header';
import { KpiDeck } from './components/KpiDeck';
import { AlertFeed } from './components/AlertFeed';
import { RecruiterSimulator } from './components/RecruiterSimulator';
import { ResolveModal } from './components/ResolveModal';
import { AnomalyAlert } from './types';

export const App: React.FC = () => {
  const {
    metrics,
    alerts,
    error,
    lastUpdated,
    refresh,
    ingestPayload,
    resolveIncident,
    resetDemo,
  } = useTelemetry(4000);

  const [selectedAlert, setSelectedAlert] = useState<AnomalyAlert | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        metrics={metrics}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        onResetDemo={resetDemo}
        isOffline={Boolean(error)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">

        <KpiDeck metrics={metrics} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Live AI Incident Feed */}
          <div className="lg:col-span-7">
            <AlertFeed
              alerts={alerts}
              onOpenResolveModal={(alert) => setSelectedAlert(alert)}
            />
          </div>

          {/* Right Column (5 cols): Recruiter Simulator + Service Health Registry + Live Telemetry Stream */}
          <div className="space-y-6 lg:col-span-5">
            <RecruiterSimulator onIngest={ingestPayload} />

            {/* Monitored Microservices Registry */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-blue-400" />
                Monitored Healthcare APIs
              </h3>
              <div className="space-y-2">
                {(metrics?.endpoints ?? []).map((ep) => {
                  const statusColor =
                    ep.current_health === 'HEALTHY'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : ep.current_health === 'DEGRADED'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                  return (
                    <div
                      key={ep.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="font-mono font-semibold text-slate-100">
                          {ep.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          SLA Threshold: {ep.sla_latency_ms}ms
                        </div>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}
                      >
                        {ep.current_health}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Telemetry Ingestion Stream */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Terminal className="h-4 w-4 text-emerald-400" />
                Recent Telemetry Stream
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {(metrics?.recent_telemetry ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No telemetry records ingested yet.
                  </p>
                ) : (
                  (metrics?.recent_telemetry ?? []).slice(0, 12).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded bg-slate-950/80 px-2.5 py-1.5 font-mono text-[11px] border border-slate-800/60"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            log.is_anomaly ? 'bg-rose-500' : 'bg-emerald-400'
                          }`}
                        />
                        <span className="text-slate-200 font-semibold">
                          {log.api_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span
                          className={
                            log.status_code >= 500
                              ? 'text-rose-400'
                              : log.status_code >= 400
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {log.status_code}
                        </span>
                        <span>{log.response_time_ms}ms</span>
                        <span>{log.records_returned} rec</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ResolveModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onConfirmResolve={resolveIncident}
      />
    </div>
  );
};

export default App;
