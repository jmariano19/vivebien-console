import {
  fetchMessageVolumeByDay,
  fetchEmotionalStateDistribution,
  fetchTopicDistribution,
  fetchUserGrowth,
  fetchEngagementMetrics,
  fetchDashboardStats,
  fetchTodaysActiveUsers,
  fetchDailyActiveUsers,
} from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CSS-based Bar Chart Component with hover tooltip
function BarChart({ data, dataKey, maxValue, color = 'barro', label, labelEvery }: {
  data: Array<{ date: string; [key: string]: any }>;
  dataKey: string;
  maxValue?: number;
  color?: string;
  label?: string;
  labelEvery?: number;
}) {
  const max = maxValue || Math.max(...data.map(d => d[dataKey] || 0), 1);
  const unitLabel = label || dataKey;
  const step = labelEvery || (data.length > 16 ? Math.ceil(data.length / 8) : 1);

  return (
    <div className="flex items-end gap-1 h-48">
      {data.map((item, idx) => {
        const value = item[dataKey] || 0;
        const height = (value / max) * 100;
        const showLabel = idx % step === 0 || idx === data.length - 1;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ebano text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <p className="font-semibold">{item.date}</p>
              <p>{value} {unitLabel}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ebano" />
            </div>
            <div className="w-full flex flex-col justify-end h-36">
              <div
                className={`w-full bg-${color} rounded-t transition-all group-hover:opacity-80 cursor-default`}
                style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-[10px] text-text-muted truncate w-full text-center">
              {showLabel ? item.date : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Stacked Bar Chart for messages with hover tooltip
function StackedBarChart({ data, labelEvery }: {
  data: Array<{ date: string; user_messages: number; assistant_messages: number }>;
  labelEvery?: number;
}) {
  const max = Math.max(...data.map(d => (d.user_messages || 0) + (d.assistant_messages || 0)), 1);
  const step = labelEvery || (data.length > 16 ? Math.ceil(data.length / 8) : 1);

  return (
    <div className="flex items-end gap-1 h-48">
      {data.map((item, idx) => {
        const total = (item.user_messages || 0) + (item.assistant_messages || 0);
        const userHeight = ((item.user_messages || 0) / max) * 100;
        const assistantHeight = ((item.assistant_messages || 0) / max) * 100;
        const showLabel = idx % step === 0 || idx === data.length - 1;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ebano text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <p className="font-semibold">{item.date}</p>
              <p><span className="inline-block w-2 h-2 bg-barro rounded mr-1"></span>User: {item.user_messages}</p>
              <p><span className="inline-block w-2 h-2 bg-info rounded mr-1"></span>AI: {item.assistant_messages}</p>
              <p className="border-t border-white/20 mt-1 pt-1">Total: {total}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ebano" />
            </div>
            <div className="w-full flex flex-col justify-end h-36 cursor-default">
              <div
                className="w-full bg-info rounded-t group-hover:opacity-80 transition-all"
                style={{ height: `${assistantHeight}%`, minHeight: item.assistant_messages > 0 ? '2px' : '0' }}
              />
              <div
                className="w-full bg-barro group-hover:opacity-80 transition-all"
                style={{ height: `${userHeight}%`, minHeight: item.user_messages > 0 ? '2px' : '0' }}
              />
            </div>
            <span className="text-[10px] text-text-muted truncate w-full text-center">
              {showLabel ? item.date : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Donut Chart Component
function DonutChart({ data, colors }: {
  data: Array<{ label: string; value: number; percentage: number }>;
  colors: string[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-text-muted">No data</p>
      </div>
    );
  }

  let cumulativePercentage = 0;
  const segments = data.map((item, idx) => {
    const percentage = (item.value / total) * 100;
    const segment = {
      ...item,
      percentage,
      offset: cumulativePercentage,
      color: colors[idx % colors.length],
    };
    cumulativePercentage += percentage;
    return segment;
  });

  // Create conic gradient
  const gradientStops = segments.map((seg, idx) => {
    const start = seg.offset;
    const end = seg.offset + seg.percentage;
    return `${seg.color} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="flex items-center gap-6">
      <div
        className="w-32 h-32 rounded-full relative"
        style={{
          background: `conic-gradient(${gradientStops})`,
        }}
      >
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <span className="font-bold text-lg text-ebano">{total}</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.slice(0, 5).map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm text-ebano capitalize">{seg.label}</span>
            <span className="text-xs text-text-muted">({seg.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Metric Card
function MetricCard({ title, value, subtitle, change, changeType }: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="card">
      <p className="text-sm text-text-muted mb-1">{title}</p>
      <p className="text-3xl font-bold text-ebano">{value}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      {change !== undefined && (
        <p className={`text-xs mt-2 ${
          changeType === 'positive' ? 'text-success' :
          changeType === 'negative' ? 'text-error' : 'text-text-muted'
        }`}>
          {change > 0 ? '+' : ''}{change}% from last period
        </p>
      )}
    </div>
  );
}

// Line Chart visualization with hover tooltips and spaced labels
function LineChart({ data, dataKey, color = '#C4613A', label, labelEvery }: {
  data: Array<{ date: string; [key: string]: any }>;
  dataKey: string;
  color?: string;
  label?: string;
  labelEvery?: number;
}) {
  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min;
  const unitLabel = label || dataKey;
  const step = labelEvery || (data.length > 16 ? Math.ceil(data.length / 8) : 1);

  const width = 100;
  const height = 60;
  const padding = 5;

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / (range || 1)) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Calculate percentage positions for overlay dots
  const dotPositions = values.map((val, idx) => {
    const xPct = (padding + (idx / (values.length - 1 || 1)) * (width - 2 * padding)) / width * 100;
    const yPct = (height - padding - ((val - min) / (range || 1)) * (height - 2 * padding)) / height * 100;
    return { xPct, yPct, val, date: data[idx]?.date || '' };
  });

  return (
    <div className="relative">
      {/* SVG chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e5e5" strokeWidth="0.5" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e5e5e5" strokeWidth="0.5" />

        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />

        {/* Area under line */}
        <polygon
          fill={color}
          fillOpacity="0.1"
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        />

        {/* Dots */}
        {values.map((val, idx) => {
          const x = padding + (idx / (values.length - 1 || 1)) * (width - 2 * padding);
          const y = height - padding - ((val - min) / (range || 1)) * (height - 2 * padding);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2"
              fill={color}
            />
          );
        })}
      </svg>

      {/* Hover overlay with tooltips */}
      <div className="absolute inset-0" style={{ height: '6rem' }}>
        {dotPositions.map((dot, idx) => (
          <div
            key={idx}
            className="absolute group"
            style={{
              left: `${dot.xPct}%`,
              top: `${dot.yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
            }}
          >
            {/* Invisible hover area */}
            <div className="w-full h-full rounded-full cursor-default" />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ebano text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
              <p className="font-semibold">{dot.date}</p>
              <p>{dot.val} {unitLabel}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ebano" />
            </div>
          </div>
        ))}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-[10px] text-text-muted">
        {data.map((item, idx) => {
          const showLabel = idx % step === 0 || idx === data.length - 1;
          return (
            <span key={idx} className="flex-1 text-center truncate">
              {showLabel ? item.date : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [
    messageVolume,
    emotionalStates,
    topics,
    userGrowth,
    engagement,
    stats,
    todaysActiveUsers,
    dailyActiveUsers,
  ] = await Promise.all([
    fetchMessageVolumeByDay(14),
    fetchEmotionalStateDistribution(),
    fetchTopicDistribution(),
    fetchUserGrowth(30),
    fetchEngagementMetrics(),
    fetchDashboardStats(),
    fetchTodaysActiveUsers(),
    fetchDailyActiveUsers(14),
  ]);

  const emotionalColors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];
  const topicColors = ['#C4613A', '#D4A84B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'];

  // Calculate totals
  const totalMessages = messageVolume.reduce((sum, d) => sum + (parseInt(String(d.total)) || 0), 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ebano">Analytics</h1>
          <p className="text-text-muted mt-1">Insights and trends from your data</p>
        </div>
        <Link href="/" className="text-barro hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Key Metrics */}
      <section>
        <h2 className="font-display font-bold text-lg text-ebano mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Patients"
            value={stats.totalUsers}
            subtitle="All time"
          />
          <MetricCard
            title="Messages (14 days)"
            value={totalMessages}
            subtitle={`${Math.round(totalMessages / 14)} avg/day`}
          />
          <MetricCard
            title="Active Rate"
            value={`${engagement.activeUserRate}%`}
            subtitle="Active in 24h"
          />
          <MetricCard
            title="Return Rate"
            value={`${engagement.returnRate}%`}
            subtitle="Active in 7 days"
          />
        </div>
      </section>

      {/* Daily Active Users Chart */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-ebano">Active Users per Day</h2>
          <span className="text-sm text-text-muted">Last 14 days</span>
        </div>
        <BarChart
          data={dailyActiveUsers.map(d => ({
            date: d.date,
            value: parseInt(String(d.active_users)) || 0,
          }))}
          dataKey="value"
          color="info"
          label="users"
        />
      </section>

      {/* Today's Active Users */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-ebano">Today&apos;s Active Users</h2>
            <p className="text-sm text-text-muted">{todaysActiveUsers.length} user{todaysActiveUsers.length !== 1 ? 's' : ''} interacted today</p>
          </div>
          <div className="bg-barro/10 rounded-full px-3 py-1">
            <span className="font-display font-bold text-barro text-lg">{todaysActiveUsers.length}</span>
          </div>
        </div>

        {todaysActiveUsers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-text-muted/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-text-muted">No users have interacted today yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysActiveUsers.map((activeUser) => {
              const stateEmoji: Record<string, string> = {
                neutral: '😐', calm: '😌', anxious: '😰', grateful: '🙏',
                frustrated: '😤', sad: '😢', urgent: '🚨', worried: '😟',
              };
              const displayName = activeUser.preferred_name || activeUser.name || activeUser.phone;
              const firstTime = new Date(activeUser.first_message_today);
              const lastTime = new Date(activeUser.last_message_today);
              const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

              return (
                <Link
                  key={activeUser.id}
                  href={`/patient/${activeUser.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-chamomile/30 hover:bg-chamomile/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-barro-light to-sancocho-subtle flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-bold text-sm text-barro">
                      {displayName[0]?.toUpperCase() || '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body font-semibold text-ebano truncate">{displayName}</p>
                      {activeUser.emotional_state && (
                        <span title={activeUser.emotional_state}>
                          {stateEmoji[activeUser.emotional_state] || '💬'}
                        </span>
                      )}
                      <span className="text-xs text-text-muted uppercase">{activeUser.preferred_language}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                      <span>{activeUser.message_count_today} message{activeUser.message_count_today !== 1 ? 's' : ''}</span>
                      {activeUser.current_topic && (
                        <span className="capitalize">· {activeUser.current_topic}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-ebano">{formatTime(lastTime)}</p>
                    {firstTime.getTime() !== lastTime.getTime() && (
                      <p className="text-[10px] text-text-muted">from {formatTime(firstTime)}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Message Volume Chart */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-ebano">Message Volume</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-barro rounded"></span> User
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-info rounded"></span> AI
            </span>
          </div>
        </div>
        <StackedBarChart data={messageVolume.map(d => ({
          date: d.date,
          user_messages: parseInt(String(d.user_messages)) || 0,
          assistant_messages: parseInt(String(d.assistant_messages)) || 0,
        }))} />
        <p className="text-xs text-text-muted mt-4 text-center">Last 14 days</p>
      </section>

      {/* Two Column: Emotional States + Topics */}
      <section className="grid md:grid-cols-2 gap-4 md:gap-6">
        <div className="card">
          <h2 className="font-display font-bold text-lg text-ebano mb-4">Emotional States</h2>
          <DonutChart
            data={emotionalStates.map(s => ({
              label: s.state,
              value: s.count,
              percentage: s.percentage,
            }))}
            colors={emotionalColors}
          />
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-lg text-ebano mb-4">Conversation Topics</h2>
          <DonutChart
            data={topics.map(t => ({
              label: t.topic,
              value: parseInt(String(t.count)) || 0,
              percentage: 0,
            }))}
            colors={topicColors}
          />
        </div>
      </section>

      {/* User Growth */}
      <section className="card">
        <h2 className="font-display font-bold text-lg text-ebano mb-4">User Growth</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-text-muted mb-2">Cumulative Users</p>
            <LineChart
              data={userGrowth.map(d => ({
                date: d.date,
                value: parseInt(String(d.cumulative)) || 0,
              }))}
              dataKey="value"
              color="#10B981"
              label="users"
            />
          </div>
          <div>
            <p className="text-sm text-text-muted mb-2">New Users per Day</p>
            <BarChart
              data={userGrowth.map(d => ({
                date: d.date,
                value: parseInt(String(d.new_users)) || 0,
              }))}
              dataKey="value"
              color="success"
            />
          </div>
        </div>
        <p className="text-xs text-text-muted mt-4 text-center">Last 30 days</p>
      </section>

      {/* Engagement Summary */}
      <section className="card">
        <h2 className="font-display font-bold text-lg text-ebano mb-4">Engagement Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-barro">{engagement.avgMessagesPerUser}</p>
            <p className="text-xs text-text-muted">Avg messages/user</p>
          </div>
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-info">{engagement.activeUserRate}%</p>
            <p className="text-xs text-text-muted">Daily active rate</p>
          </div>
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-success">{engagement.returnRate}%</p>
            <p className="text-xs text-text-muted">7-day return rate</p>
          </div>
          <div className="text-center p-4 bg-chamomile/30 rounded-lg">
            <p className="text-3xl font-bold text-sancocho">{todaysActiveUsers.length}</p>
            <p className="text-xs text-text-muted">Active today</p>
          </div>
        </div>
      </section>
    </div>
  );
}
