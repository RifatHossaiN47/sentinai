import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AnomalyAlert } from '../types';

interface ResolveModalProps {
  alert: AnomalyAlert | null;
  onClose: () => void;
  onConfirmResolve: (
    alertId: string,
    operatorName: string,
    resolutionNotes: string
  ) => Promise<void>;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  alert,
  onClose,
  onConfirmResolve,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [operatorName, setOperatorName] = useState('Md Rifat Hossen (SRE)');
  const [resolutionNotes, setResolutionNotes] = useState(
    'Restarted microservice container and verified database connection pool health.'
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    if (alert) {
      if (!dialogNode.open) {
        dialogNode.showModal();
      }
    } else if (dialogNode.open) {
      dialogNode.close();
    }
  }, [alert]);

  if (!alert) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmResolve(alert.id, operatorName, resolutionNotes);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/75"
    >
      <div className="p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Resolve Incident &amp; Record MTTR
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-lg bg-slate-950 p-3 border border-slate-800 text-xs">
          <div className="font-mono font-bold text-white">{alert.api_name}</div>
          <div className="mt-1 text-slate-300">{alert.message}</div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              SRE Operator Name
            </label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mitigation &amp; Resolution Notes
            </label>
            <textarea
              rows={3}
              required
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Recording Audit Log...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
