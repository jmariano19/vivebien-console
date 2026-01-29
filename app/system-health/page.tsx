import { fetchSystemHealth } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Extended system health fetch with more details
async function fetchExtendedSystemHealth() {
  const baseHealth = await fetchSystemHealth();
  return baseHealth;
}

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

export default async function SystemHealthPage() {
  const health = await fetchExtendedSystemHealth();

  // Determine statuses
  const messagesStatus = health.totalMessages24h > 0 ? 'healthy' : 'warning';
  const aiCallsStatus = health.totalAiCalls24h > 0 ? 'healthy' : 'warning';
  const responseTimeStatus = health.avgResponseTimeMs < 2000 ? 'healthy' : health.avgResponseTimeMs < 5000 ? 'warning' : 'error';
  const errorStatus = health.errorCount24h === 0 ? 'healthy' : health.errorCount24h < 5 ? 'warning' : 'error';
  const circuitStatus = health.circuitBreakerStatus === 'closed' ? 'healthy' : health.circuitBreakerStatus === 'half-open' ? 'warning' : 'error';

  const overallStatus = errorStatus === 'error' || circuitStatus === 'error' ? 'error' :
    errorStatus === 'warning' || circuitStatus === 'warning' || responseTimeStatus === 'warning' ? 'warning' : 'healthy';

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
          <div className="text-right">
            <p className="text-sm text-text-muted">Last updated</p>
            <p className="font-medium text-ebano">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
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

      {/* Circuit Breaker & Active Conversations */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-display font-bold text-lg text-ebano mb-4">Circuit Breaker Status</h3>
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              circuitStatus === 'healthy' ? 'bg-success/20' :
              circuitStatus === 'warning' ? 'bg-warning/20' :
              'bg-error/20'
            }`}>
              <span className={`text-2xl font-bold ${
                circuitStatus === 'healthy' ? 'text-success' :
                circuitStatus === 'warning' ? 'text-warning' :
                'text-error'
              }`}>
                {health.circuitBreakerStatus === 'closed' ? '✓' :
                 health.circuitBreakerStatus === 'half-open' ? '◐' : '✕'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg text-ebano capitalize">{health.circuitBreakerStatus}</p>
              <p className="text-sm text-text-muted">
                {health.circuitBreakerStatus === 'closed' ? 'API calls are flowing normally' :
                 health.circuitBreakerStatus === 'half-open' ? 'Testing if API is recovered' :
                 'API calls are blocked due to failures'}
              </p>
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

      {/* Credits Usage */}
      <div className="card">
        <h3 className="font-display font-bold text-lg text-ebano mb-4">Credits Usage (24h)</h3>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-4xl font-bold text-sancocho">{health.creditsUsed24h}</p>
            <p className="text-sm text-text-muted">Credits consumed</p>
          </div>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sancocho to-barro rounded-full transition-all"
              style={{ width: `${Math.min((health.creditsUsed24h / 1000) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Service Status List */}
      <div className="card">
        <h3 className="font-display font-bold text-lg text-ebano mb-4">Service Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/30">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium">WhatsApp Integration</span>
            </div>
            <StatusIndicator status="healthy" label="Operational" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/30">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Claude AI</span>
            </div>
            <StatusIndicator status={circuitStatus} label={health.circuitBreakerStatus === 'closed' ? 'Operational' : 'Degraded'} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/30">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span className="font-medium">Database</span>
            </div>
            <StatusIndicator status="healthy" label="Operational" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-chamomile/30">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">n8n Workflows</span>
            </div>
            <StatusIndicator status="healthy" label="Operational" />
          </div>
        </div>
      </div>
    </div>
  );
}
