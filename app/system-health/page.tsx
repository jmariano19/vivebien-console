import { fetchSystemHealth, fetchCircuitBreakers, fetchAiUsageStats, fetchRecentExecutions, fetchMonthlyCosts } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function StatusIndicator({ status, label }: { status: 'healthy' | 'warning' | 'error'; label: string }) {
  const colors = {
    healthy: 'bg-success text-success',
    warning: 'bg-warning text-warning',
    error: 'bg-error text-error',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${colors[status].split(' ')[0]}`}></span>
      <span className={`text-sm font-medium ${colors[status].split(' ')[1]}`}>{label}</span>
    </div>
  );
}

function MetricCard({ title, value, unit, status, description }: {
  title: string;
  value: number | string;
  unit?: string;
  status: 'healthy' | 'warning' | 'error';
  description?: string;
}) {
  const bgColors = {
    healthy: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    error: 'bg-error/5 border-error/20',
  };

  const textColors = {
    healthy: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };

  return (
    <div className={`card border ${bgColors[status]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-text-muted">{title}</p>
        <span className={`w-2 h-2 rounded-full ${textColors[status].replace('text-', 'bg-')}`}></span>
      </div>
      <p className={`text-3xl font-bold ${textColors[status]}`}>
        {value}
        {unit && <span className="text-lg font-normal ml-1">{unit}</span>}
      </p>
      {description && <p className="text-xs text-text-muted mt-2">{description}</p>}
    </div>
  );
}

// Map service names to friendly labels and icons
const serviceLabels: Record<string, { name: string; color: string }> = {
  claude_api: { name: 'Claude AI', color: 'text-purple-500' },
  chatwoot_api: { name: 'Chatwoot', color: 'text-info' },
  twilio_api: { name: 'Twilio / WhatsApp', color: 'text-success' },
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function SystemHealthPage() {
  const [health, breakers, aiStats, recentExecs, monthlyCosts] = await Promise.all([
    fetchSystemHealth(),
    fetchCircuitBreakers(),
    fetchAiUsageStats(),
    fetchRecentExecutions(8),
    fetchMonthlyCosts(),
  ]);

  // Fixed infrastructure costs (update these when your plans change)
  const INFRA_COSTS = [
    { name: 'Hostinger VPS', cost: 7.00 },
    { name: 'Domain (vivebien.io)', cost: 1.00 },
    { name: 'Chatwoot (self-hosted)', cost: 0 },
    { name: 'n8n (self-hosted)', cost: 0 },
    { name: 'WhatsApp API (free tier)', cost: 0 },
  ];
  const totalInfraCost = INFRA_COSTS.reduce((sum, item) => sum + item.cost, 0);
  const totalMonthlyCost = monthlyCosts.currentMonth.totalCost + totalInfraCost;
  const prevTotalCost = monthlyCosts.previousMonth.totalCost + totalInfraCost;
  const monthChange = prevTotalCost > 0
    ? ((totalMonthlyCost - prevTotalCost) / prevTotalCost * 100)
    : 0;

  // Determine statuses
  const messagesStatus = health.totalMessages24h > 0 ? 'healthy' : 'warning';
  const aiCallsStatus = health.totalAiCalls24h > 0 ? 'healthy' : 'warning';
  const responseTimeStatus = health.avgResponseTimeMs < 2000 ? 'healthy' : health.avgResponseTimeMs < 5000 ? 'warning' : 'error';
  const errorStatus = health.errorCount24h === 0 ? 'healthy' : health.errorCount24h < 5 ? 'warning' : 'error';

  // Circuit breaker overall status
  const anyBreakerOpen = breakers.some(b => b.state === 'open');
  const anyBreakerHalfOpen = breakers.some(b => b.state === 'half-open');
  const breakerOverall = anyBreakerOpen ? 'error' : anyBreakerHalfOpen ? 'warning' : 'healthy';

  const overallStatus = errorStatus === 'error' || breakerOverall === 'error' ? 'error' :
    errorStatus === 'warning' || breakerOverall === 'warning' || responseTimeStatus === 'warning' ? 'warning' : 'healthy';

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ebano">System Health</h1>
          <p className="text-text-muted mt-1">Monitor system performance and status</p>
        </div>
        <Link href="/" className="text-barro hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Overall Status Banner */}
      <div className={`card border-2 ${
        overallStatus === 'healthy' ? 'bg-success/5 border-success/30' :
        overallStatus === 'warning' ? 'bg-warning/5 border-warning/30' :
        'bg-error/5 border-error/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              overallStatus === 'healthy' ? 'bg-success/20' :
              overallStatus === 'warning' ? 'bg-warning/20' :
              'bg-error/20'
            }`}>
              {overallStatus === 'healthy' ? (
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : overallStatus === 'warning' ? (
                <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-ebano">
                System is {overallStatus === 'healthy' ? 'Healthy' : overallStatus === 'warning' ? 'Degraded' : 'Having Issues'}
              </h2>
              <p className="text-text-muted">
                {overallStatus === 'healthy' ? 'All systems operating normally' :
                 overallStatus === 'warning' ? 'Some metrics need attention' :
                 'Critical issues detected'}
              </p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-text-muted">Last updated</p>
            <p className="font-medium text-ebano">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* 24h Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Messages (24h)"
          value={health.totalMessages24h}
          status={messagesStatus}
          description="Total messages processed"
        />
        <MetricCard
          title="AI Calls (24h)"
          value={health.totalAiCalls24h}
          status={aiCallsStatus}
          description="Claude API requests"
        />
        <MetricCard
          title="Avg Response Time"
          value={health.avgResponseTimeMs}
          unit="ms"
          status={responseTimeStatus}
          description={responseTimeStatus === 'healthy' ? 'Within normal range' : 'Slower than expected'}
        />
        <MetricCard
          title="Errors (24h)"
          value={health.errorCount24h}
          status={errorStatus}
          description={errorStatus === 'healthy' ? 'No errors' : 'Needs investigation'}
        />
      </div>

      {/* Service Status (from circuit breakers) + Active Conversations */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-display font-bold text-lg text-ebano mb-4">Service Status</h3>
          <div className="space-y-3">
            {breakers.length === 0 ? (
              <p className="text-text-muted text-sm">No circuit breakers configured</p>
            ) : (
              breakers.map((b) => {
                const info = serviceLabels[b.serviceName] || { name: b.serviceName, color: 'text-text-muted' };
                const status = b.state === 'closed' ? 'healthy' : b.state === 'half-open' ? 'warning' : 'error';
                const stateLabel = b.state === 'closed' ? 'Operational' : b.state === 'half-open' ? 'Recovering' : 'Down';

                return (
                  <div key={b.serviceName} className="flex items-center justify-between p-3 rounded-lg bg-chamomile/30">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${info.color}`}>{info.name}</span>
                      {b.failureCount > 0 && (
                        <span className="text-xs text-text-muted">({b.failureCount}/{b.failureThreshold} failures)</span>
                      )}
                    </div>
                    <StatusIndicator status={status} label={stateLabel} />
                  </div>
                );
              })
            )}

            {/* Database — always show, it's real if we got this far */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/30">
              <span className="font-medium text-blue-500">Database</span>
              <StatusIndicator status="healthy" label="Connected" />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-bold text-lg text-ebano mb-4">Active Conversations</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-info/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-info">{health.activeConversations}</span>
            </div>
            <div>
              <p className="font-semibold text-lg text-ebano">Users Active</p>
              <p className="text-sm text-text-muted">In the last hour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Cost Tracker */}
      <div className="card border-2 border-barro/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-ebano">Monthly Cost Tracker</h3>
          <span className="text-xs text-text-muted bg-chamomile/50 rounded-full px-3 py-1">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Total Monthly Cost + Change */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-5 bg-barro/5 rounded-xl border border-barro/15">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">Total This Month</p>
            <p className="text-4xl font-bold text-barro">${totalMonthlyCost.toFixed(2)}</p>
            {monthlyCosts.previousMonth.totalCost > 0 && (
              <p className={`text-sm mt-1 ${monthChange >= 0 ? 'text-error' : 'text-success'}`}>
                {monthChange >= 0 ? '↑' : '↓'} {Math.abs(monthChange).toFixed(0)}% vs last month
              </p>
            )}
          </div>
          <div className="text-center p-5 bg-chamomile/30 rounded-xl">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">Cost per Message</p>
            <p className="text-4xl font-bold text-info">
              {monthlyCosts.costPerMessage > 0 ? `$${monthlyCosts.costPerMessage.toFixed(4)}` : '—'}
            </p>
            <p className="text-sm text-text-muted mt-1">{monthlyCosts.currentMonth.messages} messages this month</p>
          </div>
          <div className="text-center p-5 bg-chamomile/30 rounded-xl">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-1">AI Calls This Month</p>
            <p className="text-4xl font-bold text-success">{monthlyCosts.currentMonth.aiCalls}</p>
            <p className="text-sm text-text-muted mt-1">${monthlyCosts.currentMonth.totalCost.toFixed(2)} variable cost</p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Variable Costs */}
          <div>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-3">Variable Costs (APIs)</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="text-sm font-medium text-ebano">Claude API</span>
                </div>
                <span className="text-sm font-semibold text-ebano">${monthlyCosts.currentMonth.aiCost.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info"></span>
                  <span className="text-sm font-medium text-ebano">Whisper / Vision</span>
                </div>
                <span className="text-sm font-semibold text-ebano">${monthlyCosts.currentMonth.mediaCost.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-barro/5 border border-barro/10">
                <span className="text-sm font-semibold text-ebano">Variable Total</span>
                <span className="text-sm font-bold text-barro">${monthlyCosts.currentMonth.totalCost.toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* Fixed Infrastructure Costs */}
          <div>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-3">Fixed Costs (Infrastructure)</p>
            <div className="space-y-2">
              {INFRA_COSTS.filter(item => item.cost > 0).map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-chamomile/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    <span className="text-sm font-medium text-ebano">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-ebano">${item.cost.toFixed(2)}</span>
                </div>
              ))}
              {INFRA_COSTS.filter(item => item.cost === 0).length > 0 && (
                <div className="p-3 rounded-lg bg-chamomile/20">
                  <span className="text-xs text-text-muted">
                    Free: {INFRA_COSTS.filter(item => item.cost === 0).map(item => item.name.split(' (')[0]).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg bg-barro/5 border border-barro/10">
                <span className="text-sm font-semibold text-ebano">Fixed Total</span>
                <span className="text-sm font-bold text-barro">${totalInfraCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly History */}
        {monthlyCosts.monthlyHistory.length > 1 && (
          <div className="mt-6">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-3">Monthly History</p>
            <div className="space-y-2">
              {monthlyCosts.monthlyHistory.slice(0, 6).map((m) => {
                const mTotal = m.totalCost + totalInfraCost;
                const monthName = new Date(m.month + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
                const maxCost = Math.max(...monthlyCosts.monthlyHistory.map(h => h.totalCost + totalInfraCost), 1);
                const barWidth = Math.max((mTotal / maxCost) * 100, 2);
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-20 shrink-0">{monthName}</span>
                    <div className="flex-1 h-6 bg-chamomile/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-barro/70 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${barWidth}%`, minWidth: '40px' }}
                      >
                        <span className="text-[10px] font-semibold text-white">${mTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted w-16 text-right shrink-0">{m.messages} msgs</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Usage Stats */}
      <div className="card">
        <h3 className="font-display font-bold text-lg text-ebano mb-4">AI Usage</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-2">All Time</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-chamomile/30 rounded-lg">
                <p className="text-2xl font-bold text-barro">${aiStats.totalCostUsd.toFixed(2)}</p>
                <p className="text-xs text-text-muted">Cost</p>
              </div>
              <div className="text-center p-3 bg-chamomile/30 rounded-lg">
                <p className="text-2xl font-bold text-info">{formatNumber(aiStats.totalInputTokens + aiStats.totalOutputTokens)}</p>
                <p className="text-xs text-text-muted">Tokens</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wide mb-2">Last 24 Hours</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-chamomile/30 rounded-lg">
                <p className="text-2xl font-bold text-success">${aiStats.cost24h.toFixed(2)}</p>
                <p className="text-xs text-text-muted">Cost</p>
              </div>
              <div className="text-center p-3 bg-chamomile/30 rounded-lg">
                <p className="text-2xl font-bold text-sancocho">{formatNumber(aiStats.inputTokens24h + aiStats.outputTokens24h)}</p>
                <p className="text-xs text-text-muted">Tokens</p>
              </div>
            </div>
          </div>
        </div>

        {aiStats.modelBreakdown.length > 0 && (
          <div>
            <p className="text-sm text-text-muted mb-2">Model Breakdown</p>
            <div className="space-y-2">
              {aiStats.modelBreakdown.map((m) => (
                <div key={m.model} className="flex items-center justify-between p-2 rounded bg-chamomile/20">
                  <span className="text-sm font-medium text-ebano font-mono">{m.model}</span>
                  <div className="flex items-center gap-4 text-sm text-text-muted">
                    <span>{m.calls} calls</span>
                    <span>${m.cost.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Database Overview */}
      <div className="card">
        <h3 className="font-display font-bold text-lg text-ebano mb-4">Database Overview</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-barro">{health.totalUsersAllTime}</p>
            <p className="text-xs text-text-muted">Total Users</p>
          </div>
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-info">{formatNumber(health.totalMessagesAllTime)}</p>
            <p className="text-xs text-text-muted">Total Messages</p>
          </div>
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-success">{health.totalAiCallsAllTime}</p>
            <p className="text-xs text-text-muted">Total AI Calls</p>
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="card">
        <h3 className="font-display font-bold text-lg text-ebano mb-4">Recent Executions</h3>
        {recentExecs.length === 0 ? (
          <p className="text-text-muted text-sm">No recent executions logged</p>
        ) : (
          <div className="space-y-2">
            {recentExecs.map((exec, idx) => {
              const isError = exec.status === 'error';
              return (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${isError ? 'bg-error/5' : 'bg-chamomile/30'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isError ? 'bg-error' : 'bg-success'}`}></span>
                    <span className="text-sm font-medium text-ebano capitalize">{exec.status}</span>
                    {exec.intentType && (
                      <span className="text-xs text-text-muted bg-chamomile/50 rounded px-2 py-0.5">{exec.intentType}</span>
                    )}
                    {exec.nodeName && (
                      <span className="text-xs text-text-muted">{exec.nodeName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-muted">
                    <span>{exec.executionTimeMs}ms</span>
                    <span>{timeAgo(exec.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
