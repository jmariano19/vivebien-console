import { 
  fetchUserById, 
  fetchUserRoutines, 
  fetchUserMessages, 
  fetchUserNotes,
  fetchCreditHistory,
} from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PatientTabs from './PatientTabs';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

function EmotionalStateIndicator({ state }: { state?: string }) {
  if (!state) return null;
  
  const indicators: Record<string, { emoji: string; bg: string; label: string; description: string }> = {
    anxious: { emoji: '😰', bg: 'bg-warning/20', label: 'Anxious', description: 'User seems worried or nervous' },
    frustrated: { emoji: '😤', bg: 'bg-error/20', label: 'Frustrated', description: 'User may need extra patience' },
    grateful: { emoji: '🙏', bg: 'bg-success/20', label: 'Grateful', description: 'Positive interaction' },
    calm: { emoji: '😌', bg: 'bg-info/20', label: 'Calm', description: 'User is at ease' },
    neutral: { emoji: '😐', bg: 'bg-gray-100', label: 'Neutral', description: 'Standard interaction' },
    worried: { emoji: '😟', bg: 'bg-warning/20', label: 'Worried', description: 'User has concerns' },
    hopeful: { emoji: '🌟', bg: 'bg-sancocho/20', label: 'Hopeful', description: 'User is optimistic' },
    confused: { emoji: '😕', bg: 'bg-info/20', label: 'Confused', description: 'May need clarification' },
  };
  
  const ind = indicators[state] || { emoji: '•', bg: 'bg-gray-100', label: state, description: '' };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${ind.bg}`} title={ind.description}>
      <span className="text-base">{ind.emoji}</span>
      <span className="font-medium capitalize">{ind.label}</span>
    </div>
  );
}

function CreditsDisplay({ balance, showWarning = true }: { balance: number; showWarning?: boolean }) {
  const isLow = balance < 10;
  const isCritical = balance < 5;
  
  if (!showWarning) {
    return <span className="font-display font-bold text-2xl text-barro">{balance}</span>;
  }
  
  return (
    <div className="text-center">
      <p className={`font-display font-bold text-2xl ${
        isCritical ? 'text-error' : isLow ? 'text-warning' : 'text-barro'
      }`}>
        {balance}
        {isCritical && <span className="ml-1 text-sm">🔴</span>}
        {isLow && !isCritical && <span className="ml-1 text-sm">⚠️</span>}
      </p>
      <p className="text-xs text-text-muted">Credits</p>
      {isCritical && <p className="text-xs text-error mt-1">Critical</p>}
      {isLow && !isCritical && <p className="text-xs text-warning mt-1">Low</p>}
    </div>
  );
}

function TopicBadge({ topic }: { topic?: string }) {
  if (!topic) return null;
  
  const topicStyles: Record<string, string> = {
    medication: 'bg-purple-100 text-purple-700',
    mental_health: 'bg-pink-100 text-pink-700',
    sleep: 'bg-indigo-100 text-indigo-700',
    diabetes: 'bg-orange-100 text-orange-700',
    nutrition: 'bg-green-100 text-green-700',
    exercise: 'bg-cyan-100 text-cyan-700',
    general: 'bg-gray-100 text-gray-700',
    health: 'bg-blue-100 text-blue-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${topicStyles[topic] || 'bg-info/10 text-info'}`}>
      {topic.replace('_', ' ')}
    </span>
  );
}

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

export default async function PatientDetailPage({ params }: PageProps) {
  const [user, routines, messages, notes, creditHistory] = await Promise.all([
    fetchUserById(params.id),
    fetchUserRoutines(params.id),
    fetchUserMessages(params.id, 100),
    fetchUserNotes(params.id),
    fetchCreditHistory(params.id),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Back button */}
      <Link 
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-barro transition-colors text-sm md:text-base"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Patient Header - Mobile Optimized */}
      <header className="card">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center">
              <span className="font-display font-bold text-xl text-barro">
                {(user.preferred_name || user.name || user.phone)?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-xl text-ebano truncate">
                {user.preferred_name || user.name || 'Unknown'}
              </h1>
              <p className="text-text-secondary text-sm">{user.phone}</p>
            </div>
          </div>
          
          {/* Status Row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <StatusBadge status={user.status} needsHuman={user.needs_human || false} />
            <EmotionalStateIndicator state={user.emotional_state} />
            {user.current_topic && <TopicBadge topic={user.current_topic} />}
            {user.subscription_status && (
              <span className="text-xs text-text-muted bg-chamomile px-2 py-1 rounded-full">
                {user.subscription_status}
              </span>
            )}
          </div>

          {/* Last Active */}
          {user.last_message_at && (
            <p className="text-xs text-text-muted mb-4">
              Last active: {formatTimeAgo(user.last_message_at)}
            </p>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`text-center rounded-xl py-3 ${
              (user.credits_balance ?? 0) < 10 ? 'bg-warning/10' : 'bg-chamomile/50'
            }`}>
              <CreditsDisplay balance={user.credits_balance ?? 0} />
            </div>
            <div className="text-center bg-chamomile/50 rounded-xl py-3">
              <p className="font-display font-bold text-xl text-info">{routines.length}</p>
              <p className="text-xs text-text-muted">Routines</p>
            </div>
            <div className="text-center bg-chamomile/50 rounded-xl py-3">
              <p className="font-display font-bold text-xl text-ebano">{messages.length}</p>
              <p className="text-xs text-text-muted">Messages</p>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center">
                <span className="font-display font-bold text-2xl text-barro">
                  {(user.preferred_name || user.name || user.phone)?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-ebano">
                  {user.preferred_name || user.name || 'Unknown Patient'}
                </h1>
                <p className="text-text-secondary font-body">{user.phone}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <StatusBadge status={user.status} needsHuman={user.needs_human || false} />
                  <EmotionalStateIndicator state={user.emotional_state} />
                  {user.current_topic && <TopicBadge topic={user.current_topic} />}
                  {user.subscription_status && (
                    <span className="text-xs text-text-muted bg-chamomile px-2 py-1 rounded-full">
                      {user.subscription_status}
                    </span>
                  )}
                  {user.preferred_language && (
                    <span className="text-xs text-text-muted">
                      🌐 {user.preferred_language.toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Last Active */}
                {user.last_message_at && (
                  <p className="text-xs text-text-muted mt-2">
                    Last active: {formatTimeAgo(user.last_message_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className={`text-center px-4 py-2 rounded-xl ${
                (user.credits_balance ?? 0) < 10 ? 'bg-warning/10' : ''
              }`}>
                <CreditsDisplay balance={user.credits_balance ?? 0} />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-2xl text-info">{routines.length}</p>
                <p className="text-xs text-text-muted">Routines</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-2xl text-ebano">{messages.length}</p>
                <p className="text-xs text-text-muted">Messages</p>
              </div>
            </div>
          </div>

          {/* Handoff Alert */}
          {user.needs_human && user.handoff_reason && (
            <div className="mt-4 p-3 rounded-lg bg-error/10 border border-error/20">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-error text-sm">Handoff Requested</p>
                  <p className="text-sm text-text-secondary mt-1">{user.handoff_reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Handoff Alert */}
        {user.needs_human && user.handoff_reason && (
          <div className="md:hidden mt-4 p-3 rounded-lg bg-error/10 border border-error/20">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-error text-sm">Handoff Requested</p>
                <p className="text-sm text-text-secondary mt-1">{user.handoff_reason}</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Tabs Content */}
      <PatientTabs 
        user={user}
        routines={routines}
        messages={messages}
        notes={notes}
        creditHistory={creditHistory}
      />
    </div>
  );
}

function StatusBadge({ status, needsHuman }: { status: string; needsHuman: boolean }) {
  if (needsHuman) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-error/10 text-error">
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse-soft"></span>
        Needs Human
      </span>
    );
  }
  
  const statusStyles: Record<string, string> = {
    active: 'bg-success/10 text-success',
    paused: 'bg-warning/10 text-warning',
    blocked: 'bg-error/10 text-error',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
