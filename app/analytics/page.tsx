import {
  fetchMessageVolumeByDay,
  fetchEmotionalStateDistribution,
  fetchTopicDistribution,
  fetchUserGrowth,
  fetchCreditsUsage,
  fetchEngagementMetrics,
  fetchDashboardStats,
} from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CSS-based Bar Chart Component
function BarChart({ data, dataKey, maxValue, color = 'barro' }: {
  data: Array<{ date: string; [key: string]: any }>;
  dataKey: string;
  maxValue?: number;
  color?: string;
}) {
  const max = maxValue || Math.max(...data.map(d => d[dataKey] || 0), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((item, idx) => {
        const value = item[dataKey] || 0;
        const height = (value / max) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end h-32">
              <div
                className={`w-full bg-${color} rounded-t transition-all hover:opacity-80`}
                style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0' }}
                title={`${item.date}: ${value}`}
              />
            </div>
            <span className="text-[10px] text-text-muted truncate w-full text-center">
              {item.date.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Stacked Bar Chart for messages
function StackedBarChart({ data }: {
  data: Array<{ date: string; user_messages: number; assistant_messages: number }>;
}) {
  const max = Math.max(...data.map(d => (d.user_messages || 0) + (d.assistant_messages || 0)), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((item, idx) => {
        const userHeight = ((item.user_messages || 0) / max) * 100;
        const assistantHeight = ((item.assistant_messages || 0) / max) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end h-32">
              <div
                className="w-full bg-info rounded-t"
                style={{ height: `${assistantHeight}%`, minHeight: item.assistant_messages > 0 ? '2px' : '0' }}
                title={`AI: ${item.assistant_messages}`}
              />
              <div
                className="w-full bg-barro"
                style={{ height: `${userHeight}%`, minHeight: item.user_messages > 0 ? '2px' : '0' }}
                title={`User: ${item.user_messages}`}
              />
            </div>
            <span className="text-[10px] text-text-muted truncate w-full text-center">
              {item.date.split(' ')[0]}
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

// Line Chart visualization using SVG
function LineChart({ data, dataKey, color = '#C4613A' }: {
  data: Array<{ date: string; [key: string]: any }>;
  dataKey: string;
  color?: string;
}) {
  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min;

  const width = 100;
  const height = 60;
  const padding = 5;

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / (range || 1)) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative">
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
      <div className="flex justify-between text-[10px] text-text-muted px-1">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
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
    creditsUsage,
    engagement,
    stats,
  ] = await Promise.all([
    fetchMessageVolumeByDay(14),
    fetchEmotionalStateDistribution(),
    fetchTopicDistribution(),
    fetchUserGrowth(30),
    fetchCreditsUsage(14),
    fetchEngagementMetrics(),
    fetchDashboardStats(),
  ]);

  const emotionalColors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];
  const topicColors = ['#C4613A', '#D4A84B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'];

  // Calculate totals
  const totalMessages = messageVolume.reduce((sum, d) => sum + (parseInt(String(d.total)) || 0), 0);
  const totalCreditsUsed = creditsUsage.reduce((sum, d) => sum + (parseInt(String(d.credits_used)) || 0), 0);

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

      {/* Credits Usage */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-ebano">Credits Usage</h2>
          <span className="text-sm text-text-muted">{totalCreditsUsed} total used</span>
        </div>
        <BarChart
          data={creditsUsage.map(d => ({
            date: d.date,
            value: parseInt(String(d.credits_used)) || 0,
          }))}
          dataKey="value"
          color="sancocho"
        />
        <p className="text-xs text-text-muted mt-4 text-center">Last 14 days</p>
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
            <p className="text-3xl font-bold text-sancocho">{stats.activeRoutines}</p>
            <p className="text-xs text-text-muted">Active routines</p>
          </div>
        </div>
      </section>
    </div>
  );
}
