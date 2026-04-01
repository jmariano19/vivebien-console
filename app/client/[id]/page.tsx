import { fetchClientById } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ArchetypeBadge({ archetype }: { archetype: string }) {
  const styles: Record<string, { bg: string; text: string; label: string; description: string }> = {
    performance: { bg: 'bg-barro/10', text: 'text-barro', label: 'Performance', description: 'Data-driven, fast adopter, wants mechanism' },
    skeptic:     { bg: 'bg-ebano/10', text: 'text-ebano', label: 'Skeptic', description: 'Past failures, needs proof, slow trust' },
    curious:     { bg: 'bg-info/10',  text: 'text-info',  label: 'Curious', description: 'Asks WHY, mechanism-driven, engages but may not act' },
    passive:     { bg: 'bg-warning/10', text: 'text-warning', label: 'Passive', description: 'Low initiative, needs simplicity' },
    unknown:     { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Unknown', description: 'Archetype not yet determined' },
  };

  const s = styles[archetype] ?? styles.unknown!;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${s.bg}`}>
      <span className={`font-semibold text-sm ${s.text}`}>{s.label}</span>
      <span className={`text-xs ${s.text} opacity-70`}>— {s.description}</span>
    </div>
  );
}

function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors: Record<string, string> = {
    performance: 'bg-barro',
    skeptic: 'bg-ebano',
    curious: 'bg-info',
    passive: 'bg-warning',
  };
  const color = colors[label] ?? 'bg-gray-400';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary capitalize w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-ebano/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-ebano w-6 text-right">{value}</span>
    </div>
  );
}

const ONBOARDING_QUESTIONS: Record<number, string> = {
  1: 'What brought you here?',
  2: 'How is your relationship with food right now?',
  3: 'Last time you tried to change your eating — what happened?',
  4: 'How often do you exercise, and how do you feel after?',
  5: 'Anything you want me to know before we start?',
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await fetchClientById(params.id);

  if (!client) {
    notFound();
  }

  const displayName = client.name || 'Unknown';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-barro transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-2xl text-barro">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-2xl md:text-3xl text-ebano">{displayName}</h1>
            <p className="text-text-muted text-sm mt-0.5">{client.phone}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <ArchetypeBadge archetype={client.archetype} />
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                client.coachingPhase === 'phase_2'
                  ? 'bg-success/10 text-success'
                  : 'bg-chamomile text-text-secondary'
              }`}>
                {client.coachingPhase === 'phase_2' ? 'Phase 2' : 'Phase 1'}
              </span>
              {client.graduationPending && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                  ★ Ready to graduate
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left: Profile + Onboarding */}
        <div className="space-y-4 md:space-y-6">

          {/* Quick Stats */}
          <div className="card grid grid-cols-2 gap-4">
            <div>
              <p className="text-text-muted text-xs mb-1">Patterns confirmed</p>
              <p className="font-display font-bold text-2xl text-ebano">{client.patternsConfirmed}<span className="text-text-muted text-base font-normal"> / 2</span></p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-1">Food logs</p>
              <p className="font-display font-bold text-2xl text-ebano">{client.recentEvents.length}<span className="text-text-muted text-base font-normal"> recent</span></p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-1">Language</p>
              <p className="font-semibold text-ebano uppercase">{client.language}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-1">Member since</p>
              <p className="font-semibold text-ebano">{new Date(client.createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Archetype Scores */}
          <div className="card">
            <h3 className="font-display font-bold text-base text-ebano mb-4">Archetype Scores</h3>
            <div className="space-y-3">
              {Object.entries(client.archetypeScores)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([key, val]) => (
                  <ScoreBar key={key} label={key} value={val as number} />
                ))
              }
            </div>
          </div>

          {/* Onboarding Answers */}
          {client.onboardingAnswers && client.onboardingAnswers.length > 0 && (
            <div className="card">
              <h3 className="font-display font-bold text-base text-ebano mb-4">Onboarding Answers</h3>
              <div className="space-y-4">
                {client.onboardingAnswers.map(({ question, answer }) => (
                  <div key={question}>
                    <p className="text-xs text-text-muted mb-1">Q{question}: {ONBOARDING_QUESTIONS[question] ?? `Question ${question}`}</p>
                    <p className="text-sm text-ebano bg-chamomile/40 rounded-lg px-3 py-2">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coach Notes */}
          <div className="card">
            <h3 className="font-display font-bold text-base text-ebano mb-3">Coach Notes</h3>
            {client.coachNotes ? (
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{client.coachNotes}</p>
            ) : (
              <p className="text-sm text-text-muted italic">No notes yet.</p>
            )}
          </div>
        </div>

        {/* Right: Food Log */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ebano">Food Log</h3>
              <span className="text-xs text-text-muted">Last 30 entries</span>
            </div>

            {client.recentEvents.length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                <p>No logs yet.</p>
                <p className="text-sm mt-1">Logs appear here as the client sends messages.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {client.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex gap-3 p-3 rounded-lg ${
                      event.isQuestion ? 'bg-info/5 border border-info/10' : 'bg-chamomile/30'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {event.isQuestion ? (
                        <span className="w-6 h-6 rounded-full bg-info/20 flex items-center justify-center text-xs text-info font-bold">?</span>
                      ) : event.imageUrl ? (
                        <span className="w-6 h-6 rounded-full bg-barro/10 flex items-center justify-center text-xs">📸</span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-xs">🍽</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {event.rawInput && (
                        <p className="text-sm text-ebano">{event.rawInput}</p>
                      )}
                      {event.imageUrl && (
                        <p className="text-xs text-text-muted mt-0.5">📎 Image attached</p>
                      )}
                      {event.isQuestion && (
                        <span className="inline-block text-xs text-info mt-1">Question — answer in nightly summary</span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted flex-shrink-0 whitespace-nowrap">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
