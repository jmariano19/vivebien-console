'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  summaryId: string;
  htmlContent: string;
  digestDate: string;
}

export default function SummaryApproval({ summaryId, htmlContent, digestDate }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'approving' | 'discarding' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const formattedDate = new Date(digestDate).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  async function handleApprove() {
    if (!confirm('Send this PDF to the client via WhatsApp?')) return;
    setStatus('approving');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/summaries/${summaryId}/approve`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Approve failed');
      }

      setStatus('done');
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  async function handleDiscard() {
    if (!confirm('Discard this summary? It will not be sent to the client.')) return;
    setStatus('discarding');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/summaries/${summaryId}/discard`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Discard failed');
      }

      setStatus('done');
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  if (status === 'done') return null;

  return (
    <div className="card border-2 border-warning/30 bg-warning/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse-soft"></span>
          <div>
            <h3 className="font-display font-bold text-lg text-ebano">Nightly Summary — Pending Approval</h3>
            <p className="text-text-muted text-sm capitalize">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscard}
            disabled={status === 'approving' || status === 'discarding'}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-ebano/5 transition-colors disabled:opacity-40"
          >
            {status === 'discarding' ? 'Discarding...' : 'Discard'}
          </button>
          <button
            onClick={handleApprove}
            disabled={status === 'approving' || status === 'discarding'}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-barro text-white hover:bg-barro/90 transition-colors disabled:opacity-40"
          >
            {status === 'approving' ? 'Sending PDF...' : 'Approve & Send PDF'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <p className="text-error text-sm mb-3">Error: {errorMsg}</p>
      )}

      {/* HTML Preview */}
      <div className="rounded-xl overflow-hidden border border-ebano/10 bg-white">
        <iframe
          srcDoc={htmlContent}
          className="w-full"
          style={{ height: '600px', border: 'none' }}
          sandbox="allow-same-origin"
          title="Nightly Summary Preview"
        />
      </div>

      <p className="text-xs text-text-muted mt-3 text-center">
        Preview matches the PDF that will be sent to the client.
      </p>
    </div>
  );
}
