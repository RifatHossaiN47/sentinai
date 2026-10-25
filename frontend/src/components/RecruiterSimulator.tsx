import React, { useState, useRef } from 'react';
import {
  Zap,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Play,
  Sliders,
} from 'lucide-react';
import { TelemetryPayload } from '../types';

interface RecruiterSimulatorProps {
  onIngest: (payload: TelemetryPayload | TelemetryPayload[]) => Promise<unknown>;
}

const SAMPLE_BATCH_PAYLOAD: TelemetryPayload[] = [
  {
    api_name: 'PatientDataAPI',
    response_time_ms: 1200,
    status_code: 200,
    records_returned: 50,
  },
  {
    api_name: 'AppointmentAPI',
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0,
  },
];

export const RecruiterSimulator: React.FC<RecruiterSimulatorProps> = ({
  onIngest,
}) => {
  const [busy, setBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customPayload, setCustomPayload] = useState<TelemetryPayload>({
    api_name: 'PatientDataAPI',
    status_code: 502,
    response_time_ms: 4200,
    records_returned: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runSimulation = async (
    label: string,
    payload: TelemetryPayload | TelemetryPayload[]
  ) => {
    setBusy(true);
    setStatusBanner(null);
    try {
      await onIngest(payload);
      setStatusBanner({
        type: 'success',
        text: `${label} dispatched and processed by SentinAI engine.`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleHealthyStream = async () => {
    const endpoints = [
      'PatientDataAPI',
      'AppointmentAPI',
      'BillingAPI',
      'CaregiverComplianceAPI',
    ];
    const batch: TelemetryPayload[] = Array.from({ length: 20 }, (_, idx) => ({
      api_name: endpoints[idx % endpoints.length],
      status_code: 200,
      response_time_ms: 140 + ((idx * 37) % 450),
      records_returned: 15 + ((idx * 13) % 85),
    }));

    await runSimulation('20 Healthy Telemetry Checks (0 AI Tokens)', batch);
  };

  const handleFileUpload = async (file: File) => {
    setBusy(true);
    setStatusBanner(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as TelemetryPayload | TelemetryPayload[];
      await onIngest(parsed);
      const count = Array.isArray(parsed) ? parsed.length : 1;
      setStatusBanner({
        type: 'success',
        text: `Ingested ${count} telemetry record(s) from ${file.name}.`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: `JSON file error: ${(err as Error).message}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Interactive Telemetry Simulator
          </h2>
          <p className="text-xs text-slate-400">
            Simulate live API traffic or upload static JSON batch files
          </p>
        </div>
      </div>

      {/* 1-Click Scenario Buttons */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          disabled={busy}
          onClick={() =>
            runSimulation('P1 Critical HTTP 500 Outage (AppointmentAPI)', {
              api_name: 'AppointmentAPI',
              response_time_ms: 5500,
              status_code: 500,
              records_returned: 0,
            })
          }
          className="flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-left text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50 transition"
        >
          <span>🔴 Trigger HTTP 500 Outage</span>
          <span className="font-mono text-[10px] text-rose-300">P1 Critical</span>
        </button>

        <button
          disabled={busy}
          onClick={() =>
            runSimulation('P2 High Latency Spike (3800ms)', {
              api_name: 'PatientDataAPI',
              response_time_ms: 3800,
              status_code: 200,
              records_returned: 45,
            })
          }
          className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-left text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 transition"
        >
          <span>🟠 Trigger Latency Spike (3800ms)</span>
          <span className="font-mono text-[10px] text-amber-300">P2 High</span>
        </button>

        <button
          disabled={busy}
          onClick={() =>
            runSimulation('P2 Empty Payload Anomaly (0 Records)', {
              api_name: 'BillingAPI',
              response_time_ms: 410,
              status_code: 200,
              records_returned: 0,
            })
          }
          className="flex items-center justify-between rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3.5 py-2.5 text-left text-xs font-semibold text-yellow-200 hover:bg-yellow-500/20 disabled:opacity-50 transition"
        >
          <span>🟡 Trigger Empty Data Anomaly</span>
          <span className="font-mono text-[10px] text-yellow-300">0 Records</span>
        </button>

        <button
          disabled={busy}
          onClick={handleHealthyStream}
          className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-left text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 transition"
        >
          <span>🟢 Stream 20 Healthy Requests</span>
          <span className="font-mono text-[10px] text-emerald-300">0 AI Tokens</span>
        </button>
      </div>

      {/* Static JSON File Ingestion */}
      <div className="mt-4 pt-3.5 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileJson className="h-3.5 w-3.5 text-blue-400" />
            Static JSON File Ingestion
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runSimulation('Sample JSON Batch Payload', SAMPLE_BATCH_PAYLOAD)
            }
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
          >
            <Play className="h-3 w-3" /> Run Sample JSON Batch
          </button>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFileUpload(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-3.5 text-center hover:border-blue-500/60 hover:bg-slate-950 transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
            <Upload className="h-4 w-4 text-blue-400" />
            <span>
              Drop a <code className="text-blue-300">.json</code> file here or{' '}
              <span className="underline text-blue-400">browse</span>
            </span>
          </div>
        </div>
      </div>

      {/* Toggle Custom Payload Builder */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowCustomForm((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <Sliders className="h-3.5 w-3.5" />
          {showCustomForm ? 'Hide Custom Payload Builder' : 'Custom POST /monitor Payload'}
        </button>

        {showCustomForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSimulation(`Custom Check (${customPayload.api_name})`, customPayload);
            }}
            className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-3 border border-slate-800 text-xs"
          >
            <div className="col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">API Name</label>
              <input
                type="text"
                required
                value={customPayload.api_name}
                onChange={(e) =>
                  setCustomPayload({ ...customPayload, api_name: e.target.value })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Status Code</label>
              <input
                type="number"
                min={100}
                max={599}
                required
                value={customPayload.status_code}
                onChange={(e) =>
                  setCustomPayload({
                    ...customPayload,
                    status_code: Number(e.target.value),
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Latency (ms)</label>
              <input
                type="number"
                min={0}
                required
                value={customPayload.response_time_ms}
                onChange={(e) =>
                  setCustomPayload({
                    ...customPayload,
                    response_time_ms: Number(e.target.value),
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Records Returned</label>
              <input
                type="number"
                min={0}
                required
                value={customPayload.records_returned}
                onChange={(e) =>
                  setCustomPayload({
                    ...customPayload,
                    records_returned: Number(e.target.value),
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded bg-blue-600 py-1.5 font-semibold text-white hover:bg-blue-500"
              >
                Send POST /monitor
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Feedback Banner */}
      {statusBanner && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            statusBanner.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}
    </div>
  );
};
