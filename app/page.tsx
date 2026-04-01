import {
  fetchClients,
  fetchSystemHealth,
  fetchRecentActivity,
  type ClientSummary,
} from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function StatCard({ title, value, icon, color, subtitle, href }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <div className="stat-card h-full">
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

  if (href) {
    return <Link href={href} className="block hover:scale-[1.02] transition-transform">{content}</Link>;
  }
  return content;
}

function ArchetypeBadge({ archetype }: { archetype: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    performance: { bg: 'bg-barro/10', text: 'text-barro', label: 'Performance' },
    skeptic:     { bg: 'bg-ebano/10', text: 'text-ebano', label: 'Skeptic' },
    curious:     { bg: 'bg-info/10',  text: 'text-info',  label: 'Curious' },
    passive:     { bg: 'bg-warning/10', text: 'text-warning', label: 'Passive' },
    unknown:     { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Unknown' },
  };

  const s = styles[archetype] ?? styles.unknown!;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  if (phase === 'phase_2') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
        Phase 2
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-chamomile text-text-secondary">
      Phase 1
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

function getActivityDot(lastEventAt: string | null) {
  if (!lastEventAt) return 'bg-gray-300';
  const hours = (Date.now() - new Date(lastEventAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return 'bg-success';
  if (hours < 72) return 'bg-warning';
  return 'bg-gray-300';
}

function SystemHealthCard({ health }: { health: {
  totalMessages24h: number;
  totalAiCalls24h: number;
  avgResponseTimeMs: number;
  errorCount24h: number;
  activeConversations: number;
  totalMessagesAllTime: number;
  totalUsersAllTime: number;
  totalAiCallsAllTime: number;
}}) {
  const isHealthy = health.errorCount24h < 5 && health.avgResponseTimeMs < 5000;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg text-ebano">System Health</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isHealthy ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          {isHealthy ? '● Healthy' : '● Issues Detected'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-text-muted text-xs">Messages (24h)</p>
          <p className="font-bold text-xl text-ebano">{health.totalMessages24h}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">AI Calls (24h)</p>
          <p className="font-bold text-xl text-ebano">{health.totalAiCalls24h}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Avg Response</p>
          <p className="font-bold text-xl text-ebano">{health.avgResponseTimeMs}ms</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Errors (24h)</p>
          <p className={`font-bold text-xl ${health.errorCount24h > 0 ? 'text-error' : 'text-success'}`}>
            {health.errorCount24h}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-ebano/10 flex items-center justify-between">
        <span className="text-xs text-text-secondary">{health.activeConversations} active conversations</span>
        <Link href="/system-health" className="text-xs text-barro hover:underline">View Details →</Link>
      </div>
    </div>
  );
}

function RecentActivityCard({ activity }: { activity: Array<{
  id: string;
  type: string;
  user_name?: string;
  description: string;
  created_at: string;
}> }) {
  if (activity.length === 0) {
    return (
      <div className="card">
        <h3 className="font-display font-bold text-lg text-ebano mb-4">Recent Activity</h3>
        <p className="text-text-muted text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-display font-bold text-lg text-ebano mb-4">Recent Activity</h3>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {activity.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-chamomile/30">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.type === 'message' ? 'bg-info/20' : 'bg-sancocho/20'
            }`}>
              <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ebano">
                <span className="font-medium">{item.user_name}</span>
              </p>
              <p className="text-xs text-text-muted truncate">{item.description}</p>
            </div>
            <span className="text-xs text-text-muted flex-shrink-0">
              {formatTimeAgo(item.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [clients, systemHealth, recentActivity] = await Promise.all([
    fetchClients(),
    fetchSystemHealth(),
    fetchRecentActivity(10),
  ]);

  const activeThisWeek = clients.filter(c => {
    if (!c.lastEventAt) return false;
    return (Date.now() - new Date(c.lastEventAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const phase2Count = clients.filter(c => c.coachingPhase === 'phase_2').length;
  const pendingGraduation = clients.filter(c => c.graduationPending).length;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Stats Grid */}
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-ebano mb-4 md:mb-6">Plato Inteligente</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 stagger-children">
          <StatCard
            title="Clients"
            value={clients.length}
            subtitle="Total"
            color="bg-barro/10"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-barro" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard
            title="Active"
            value={activeThisWeek}
            subtitle="This week"
            color="bg-success/10"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Phase 2"
            value={phase2Count}
            subtitle="Graduated"
            color="bg-info/10"
            icon={<svg className="w-5 h-5 md:w-6 md:h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          />
          <StatCard
            title="Graduation"
            value={pendingGraduation}
            subtitle="Pending approval"
            color={pendingGraduation > 0 ? 'bg-warning/10' : 'bg-gray-100'}
            icon={<svg className={`w-5 h-5 md:w-6 md:h-6 ${pendingGraduation > 0 ? 'text-warning' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
        </div>
      </section>

      {/* Client List + Recent Activity */}
      <section className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Client List - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="font-display font-bold text-xl md:text-2xl text-ebano">Clients</h2>
            <span className="text-text-muted text-sm">{clients.length} total</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ebano/10">
                  <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Client</th>
                  <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Archetype</th>
                  <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Phase</th>
                  <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Patterns</th>
                  <th className="text-left py-4 px-4 font-body font-semibold text-text-secondary text-sm">Last Log</th>
                  <th className="text-right py-4 px-4 font-body font-semibold text-text-secondary text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebano/5">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <p>No clients yet</p>
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      className={`hover:bg-chamomile/50 transition-colors ${
                        client.graduationPending ? 'bg-warning/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center">
                              <span className="font-display font-bold text-barro">
                                {(client.name || client.phone)?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getActivityDot(client.lastEventAt)}`}
                              title={formatTimeAgo(client.lastEventAt)}
                            />
                          </div>
                          <div>
                            <p className="font-body font-medium text-ebano">
                              {client.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-text-muted">{client.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <ArchetypeBadge archetype={client.archetype} />
                      </td>
                      <td className="py-4 px-4">
                        <PhaseBadge phase={client.coachingPhase} />
                        {client.graduationPending && (
                          <span className="ml-1 text-xs text-warning" title="Ready to graduate">★</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-body font-semibold text-ebano">{client.patternsConfirmed}</span>
                        <span className="text-text-muted text-xs ml-1">/ 2</span>
                      </td>
                      <td className="py-4 px-4 text-text-secondary text-sm">
                        {formatTimeAgo(client.lastEventAt)}
                        {client.eventCount > 0 && (
                          <span className="block text-xs text-text-muted">{client.eventCount} logs</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/client/${client.userId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-barro hover:bg-barro/10 transition-colors"
                        >
                          View
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="lg:hidden space-y-3">
            {clients.length === 0 ? (
              <div className="card py-12 text-center text-text-muted">
                <p>No clients yet</p>
              </div>
            ) : (
              clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/client/${client.userId}`}
                  className={`patient-card block ${client.graduationPending ? 'border-l-4 border-l-warning' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center flex-shrink-0">
                        <span className="font-display font-bold text-lg text-barro">
                          {(client.name || client.phone)?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getActivityDot(client.lastEventAt)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-body font-semibold text-ebano truncate">
                            {client.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-text-muted">{client.phone}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <ArchetypeBadge archetype={client.archetype} />
                        </div>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                        <PhaseBadge phase={client.coachingPhase} />
                        <span className="text-text-muted">{client.patternsConfirmed}/2 patterns</span>
                        <span className="text-text-muted ml-auto">{formatTimeAgo(client.lastEventAt)}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-text-muted flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivityCard activity={recentActivity} />
        </div>
      </section>

      {/* System Health */}
      <section>
        <SystemHealthCard health={systemHealth} />
      </section>
    </div>
  );
}
