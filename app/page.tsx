import { fetchUsers, fetchDashboardStats } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function StatCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-text-muted text-xs md:text-sm font-body mb-1 truncate">{title}</p>
          <p className="font-display font-bold text-2xl md:text-3xl text-ebano">{value}</p>
          {subtitle && <p className="text-text-muted text-xs mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, needsHuman }: { status: string; needsHuman?: boolean }) {
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

function EmotionalStateIndicator({ state }: { state?: string }) {
  if (!state) return null;
  
  const indicators: Record<string, { emoji: string; bg: string; label: string }> = {
    anxious: { emoji: '😰', bg: 'bg-warning/20', label: 'Anxious' },
    frustrated: { emoji: '😤', bg: 'bg-error/20', label: 'Frustrated' },
    grateful: { emoji: '🙏', bg: 'bg-success/20', label: 'Grateful' },
    calm: { emoji: '😌', bg: 'bg-info/20', label: 'Calm' },
    neutral: { emoji: '😐', bg: 'bg-gray-100', label: 'Neutral' },
    worried: { emoji: '😟', bg: 'bg-warning/20', label: 'Worried' },
    hopeful: { emoji: '🌟', bg: 'bg-sancocho/20', label: 'Hopeful' },
    confused: { emoji: '😕', bg: 'bg-info/20', label: 'Confused' },
  };
  
  const ind = indicators[state] || { emoji: '•', bg: 'bg-gray-100', label: state };
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${ind.bg}`} 
      title={ind.label}
    >
      <span>{ind.emoji}</span>
      <span className="hidden xl:inline text-text-secondary capitalize">{state}</span>
    </span>
  );
}

function CreditsDisplay({ balance }: { balance: number }) {
  const isLow = balance < 10;
  const isCritical = balance < 5;
  
  return (
    <span className={`font-body font-semibold flex items-center gap-1 ${
      isCritical ? 'text-error' : isLow ? 'text-warning' : 'text-ebano'
    }`}>
      {balance}
      {isCritical && <span title="Critical - needs top up">🔴</span>}
      {isLow && !isCritical && <span title="Low credits">⚠️</span>}
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

function getActivityStatus(lastMessageAt: string | null): { label: string; color: string } {
  if (!lastMessageAt) return { label: 'inactive', color: 'text-text-muted' };
  
  const date = new Date(lastMessageAt);
  const now = new Date();
  const hours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (hours < 1) return { label: 'active', color: 'text-success' };
  if (hours < 24) return { label: 'recent', color: 'text-info' };
  if (hours < 72) return { label: 'idle', color: 'text-warning' };
  return { label: 'inactive', color: 'text-text-muted' };
}

export default async function HomePage() {
  const [users, stats] = await Promise.all([
    fetchUsers(),
    fetchDashboardStats(),
  ]);

  // Sort users: needs_human first, then by emotional priority, then by last activity
  const sortedUsers = [...users].sort((a, b) => {
    // Needs human always first
    if (a.needs_human && !b.needs_human) return -1;
    if (!a.needs_human && b.needs_human) return 1;
    
    // Then anxious/frustrated users
    const priorityStates = ['anxious', 'frustrated', 'worried'];
    const aPriority = priorityStates.includes(a.emotional_state || '');
    const bPriority = priorityStates.includes(b.emotional_state || '');
    if (aPriority && !bPriority) return -1;
    if (!aPriority && bPriority) return 1;
    
    // Then by most recent activity
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Stats Grid */}
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-ebano mb-4 md:mb-6">Dashboard</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 stagger-children">
          <StatCard
            title="Patients"
            value={stats.totalUsers}
            subtitle="Total"
            color="bg-barro/10"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-barro" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard
            title="Active"
            value={stats.activeUsers}
            subtitle="Engaged"
            color="bg-success/10"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Credits"
            value={stats.totalCredits.toLocaleString()}
            subtitle="Available"
            color="bg-sancocho/20"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-sancocho" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Routines"
            value={stats.activeRoutines}
            subtitle="Active"
            color="bg-info/10"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Attention"
            value={stats.needsHuman}
            subtitle="Handoffs"
            color={stats.needsHuman > 0 ? 'bg-error/10' : 'bg-gray-100'}
            icon={<svg className={`w-5 h-5 md:w-6 md:h-6 ${stats.needsHuman > 0 ? 'text-error' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
        </div>
      </section>

      {/* Patient List */}
      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="font-display font-bold text-xl md:text-2xl text-ebano">Patients</h2>
          <span className="text-text-muted text-sm">{users.length} total</span>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ebano/10">
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Patient</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Status</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Mood</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Credits</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Messages</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Topic</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Routines</th>
                <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Last Active</th>
                <th className="text-right py-4 px-4 font-body font-semibold text-text-secondary text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebano/5">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">
                    <p>No patients yet</p>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const activity = getActivityStatus(user.last_message_at || null);
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-chamomile/50 transition-colors ${
                        user.needs_human ? 'bg-error/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center">
                              <span className="font-display font-bold text-barro">
                                {(user.preferred_name || user.name || user.phone)?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            {/* Activity dot */}
                            <span 
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                activity.label === 'active' ? 'bg-success' :
                                activity.label === 'recent' ? 'bg-info' :
                                activity.label === 'idle' ? 'bg-warning' : 'bg-gray-300'
                              }`}
                              title={`${activity.label} - ${formatTimeAgo(user.last_message_at || null)}`}
                            />
                          </div>
                          <div>
                            <p className="font-body font-medium text-ebano">
                              {user.preferred_name || user.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-text-muted">{user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={user.status} needsHuman={user.needs_human || false} />
                      </td>
                      <td className="py-4 px-4">
                        <EmotionalStateIndicator state={user.emotional_state} />
                      </td>
                      <td className="py-4 px-4">
                        <CreditsDisplay balance={user.credits_balance ?? 0} />
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-body font-semibold text-ebano">{user.message_count ?? 0}</span>
                      </td>
                      <td className="py-4 px-4">
                        {user.current_topic ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-info/10 text-info capitalize">
                            {user.current_topic}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-4">
                        {Number(user.routine_count) > 0 ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-success/10 text-success">
                            {user.routine_count} active
                          </span>
                        ) : 'None'}
                      </td>
                      <td className="py-4 px-4 text-text-secondary text-sm">
                        {formatTimeAgo(user.last_message_at || null)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/patient/${user.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-barro hover:bg-barro/10 transition-colors"
                        >
                          View
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden space-y-3">
          {sortedUsers.length === 0 ? (
            <div className="card py-12 text-center text-text-muted">
              <p>No patients yet</p>
            </div>
          ) : (
            sortedUsers.map((user) => {
              const activity = getActivityStatus(user.last_message_at || null);
              return (
                <Link
                  key={user.id}
                  href={`/patient/${user.id}`}
                  className={`patient-card block ${user.needs_human ? 'border-l-4 border-l-error' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center flex-shrink-0">
                        <span className="font-display font-bold text-lg text-barro">
                          {(user.preferred_name || user.name || user.phone)?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      {/* Activity dot */}
                      <span 
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          activity.label === 'active' ? 'bg-success' :
                          activity.label === 'recent' ? 'bg-info' :
                          activity.label === 'idle' ? 'bg-warning' : 'bg-gray-300'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-body font-semibold text-ebano truncate">
                            {user.preferred_name || user.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-text-muted">{user.phone}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <EmotionalStateIndicator state={user.emotional_state} />
                          <StatusBadge status={user.status} needsHuman={user.needs_human || false} />
                        </div>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-3 text-xs">
                        {/* Credits with warning */}
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-sancocho" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <CreditsDisplay balance={user.credits_balance ?? 0} />
                        </div>
                        {/* Messages */}
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="font-medium text-ebano">{user.message_count ?? 0}</span>
                        </div>
                        {/* Topic */}
                        {user.current_topic && (
                          <span className="px-2 py-0.5 rounded bg-info/10 text-info capitalize">
                            {user.current_topic}
                          </span>
                        )}
                        {/* Routines */}
                        {Number(user.routine_count) > 0 && (
                          <span className="px-2 py-0.5 rounded bg-success/10 text-success">
                            {user.routine_count} routine
                          </span>
                        )}
                        {/* Time */}
                        <span className="text-text-muted ml-auto">
                          {formatTimeAgo(user.last_message_at || null)}
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-text-muted flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
