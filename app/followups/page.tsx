import { fetchPendingFollowups, fetchOverdueFollowups } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    const futureMinutes = Math.abs(minutes);
    const futureHours = Math.floor(futureMinutes / 60);
    const futureDays = Math.floor(futureHours / 24);
    if (futureDays > 0) return `in ${futureDays}d`;
    if (futureHours > 0) return `in ${futureHours}h`;
    return `in ${futureMinutes}m`;
  }

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default async function FollowupsPage() {
  const [pending, overdue] = await Promise.all([
    fetchPendingFollowups(),
    fetchOverdueFollowups(),
  ]);

  const upcomingFollowups = pending.filter(f => new Date(f.scheduled_for) >= new Date());

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ebano">Follow-ups</h1>
          <p className="text-text-muted mt-1">Manage patient follow-up tasks</p>
        </div>
        <Link href="/" className="text-barro hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-error">{overdue.length}</p>
          <p className="text-sm text-text-muted">Overdue</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-warning">{upcomingFollowups.length}</p>
          <p className="text-sm text-text-muted">Upcoming</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ebano">{pending.length}</p>
          <p className="text-sm text-text-muted">Total Pending</p>
        </div>
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-xl text-error mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Overdue ({overdue.length})
          </h2>

          <div className="space-y-3">
            {overdue.map((fu) => (
              <Link
                key={fu.id}
                href={`/patient/${fu.user_id}`}
                className="card block hover:shadow-md transition-shadow border-l-4 border-l-error"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                      <span className="font-display font-bold text-error">
                        {fu.user_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-ebano">{fu.user_name || 'Unknown'}</p>
                      <p className="text-sm text-text-muted capitalize">{fu.type.replace(/_/g, ' ')}</p>
                      {fu.notes && <p className="text-xs text-text-secondary mt-1">{fu.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-error">{formatTimeAgo(fu.scheduled_for)}</p>
                    <p className="text-xs text-text-muted">{formatDate(fu.scheduled_for)}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                      fu.priority === 'high' ? 'bg-error/20 text-error' :
                      fu.priority === 'medium' ? 'bg-warning/20 text-warning' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {fu.priority} priority
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      <section>
        <h2 className="font-display font-bold text-xl text-ebano mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Upcoming ({upcomingFollowups.length})
        </h2>

        {upcomingFollowups.length === 0 ? (
          <div className="card py-12 text-center text-text-muted">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No upcoming follow-ups scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingFollowups.map((fu) => (
              <Link
                key={fu.id}
                href={`/patient/${fu.user_id}`}
                className="card block hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center">
                      <span className="font-display font-bold text-barro">
                        {fu.user_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-ebano">{fu.user_name || 'Unknown'}</p>
                      <p className="text-sm text-text-muted capitalize">{fu.type.replace(/_/g, ' ')}</p>
                      {fu.notes && <p className="text-xs text-text-secondary mt-1">{fu.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-info">{formatTimeAgo(fu.scheduled_for)}</p>
                    <p className="text-xs text-text-muted">{formatDate(fu.scheduled_for)}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                      fu.priority === 'high' ? 'bg-error/20 text-error' :
                      fu.priority === 'medium' ? 'bg-warning/20 text-warning' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {fu.priority} priority
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
