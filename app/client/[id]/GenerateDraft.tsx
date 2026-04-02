'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateDraft({ userId }: { userId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleGenerate() {
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/digests/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate draft');
      }

      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate draft');
      setStatus('error');
    }
  }

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-ebano">Generate Tonight&apos;s Summary</p>
        <p className="text-sm text-text-muted mt-0.5">
          Runs the AI on today&apos;s food logs. Review before it sends to the client.
        </p>
        {errorMsg && <p className="text-error text-sm mt-1">{errorMsg}</p>}
      </div>
      <button
        onClick={handleGenerate}
        disabled={status === 'loading'}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-barro text-white hover:bg-barro/90 transition-colors disabled:opacity-40 shrink-0"
      >
        {status === 'loading' ? 'Generating...' : '✨ Generate Draft'}
      </button>
    </div>
  );
}
