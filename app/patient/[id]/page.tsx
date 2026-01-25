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
          
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <StatusBadge status={user.status} needsHuman={user.needs_human || false} />
            {user.subscription_status && (
              <span className="text-xs text-text-muted bg-chamomile px-2 py-1 rounded-full">
                {user.subscription_status}
              </span>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-chamomile/50 rounded-xl py-3">
              <p className="font-display font-bold text-xl text-barro">{user.credits_balance ?? 0}</p>
              <p className="text-xs text-text-muted">Credits</p>
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
        <div className="hidden md:flex items-start justify-between">
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
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={user.status} needsHuman={user.needs_human || false} />
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
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-barro">{user.credits_balance ?? 0}</p>
              <p className="text-xs text-text-muted">Credits</p>
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
