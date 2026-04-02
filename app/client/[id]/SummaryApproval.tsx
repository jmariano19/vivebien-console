'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Meal {
  time: string;
  title: string;
  bullets?: string[];
}

interface SignalItem {
  direction: 'up' | 'down';
  text: string;
}

interface Props {
  summaryId: string;
  digestDate: string;
  digestData: Record<string, unknown>;
}

export default function SummaryApproval({ summaryId, digestDate, digestData }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'approving' | 'discarding' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const formattedDate = new Date(digestDate).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const meals = (digestData.meals as Meal[]) || [];
  const signalIntro = digestData.signal_intro as string | undefined;
  const signalItems = (digestData.signal_items as SignalItem[]) || [];
  const signalExplanation = digestData.signal_explanation as string | undefined;
  const willpowerText = digestData.willpower_text as string | undefined;
  const experimentHeading = digestData.experiment_heading as string | undefined;
  const experimentSteps = (digestData.experiment_steps as string[]) || [];
  const greetingName = digestData.greeting_name as string | undefined;

  async function handleApprove() {
    if (!confirm('Send this summary to the client via WhatsApp?')) return;
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
    if (!confirm('Discard this summary? It will not be sent.')) return;
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
    <div className="card border-2 border-warning/30 bg-warning/5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse-soft flex-shrink-0"></span>
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
            {status === 'approving' ? 'Sending...' : '✅ Approve & Send'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <p className="text-error text-sm">Error: {errorMsg}</p>
      )}

      {/* Summary Preview */}
      <div className="rounded-xl border border-ebano/10 bg-white divide-y divide-ebano/5 overflow-hidden">
        {/* Greeting */}
        {greetingName && (
          <div className="px-4 py-3 bg-[#4A7C59]/5">
            <p className="font-semibold text-[#4A7C59]">
              {greetingName}, tu día tiene un patrón. Hoy lo hicimos visible.
            </p>
          </div>
        )}

        {/* Meals */}
        {meals.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">🍽 Tu Plato Hoy</p>
            <div className="space-y-2">
              {meals.map((meal, i) => (
                <div key={i}>
                  <p className="text-sm text-ebano">
                    <span className="text-text-muted font-medium">{meal.time}</span> — {meal.title}
                  </p>
                  {meal.bullets?.map((b, j) => (
                    <p key={j} className="text-xs text-text-secondary ml-4">• {b}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal */}
        {signalIntro && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">📊 Señal Principal</p>
            <p className="text-sm font-medium text-ebano">{signalIntro}</p>
            {signalItems.map((item, i) => (
              <p key={i} className="text-sm text-text-secondary mt-1">
                {item.direction === 'up' ? '↑' : '↓'} {item.text}
              </p>
            ))}
            {signalExplanation && (
              <p className="text-xs text-text-muted mt-2 italic">{signalExplanation}</p>
            )}
          </div>
        )}

        {/* Willpower reframe */}
        {willpowerText && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">💪 Esto No Es Fuerza de Voluntad</p>
            <p className="text-sm text-text-secondary">{willpowerText}</p>
          </div>
        )}

        {/* Experiment */}
        {experimentHeading && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">🧪 Experimento Para Mañana</p>
            <p className="text-sm font-medium text-ebano">{experimentHeading}</p>
            {experimentSteps.map((step, i) => (
              <p key={i} className="text-sm text-text-secondary mt-1">{i + 1}. {step}</p>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-text-muted text-center">
        Review the summary above before sending to the client.
      </p>
    </div>
  );
}
