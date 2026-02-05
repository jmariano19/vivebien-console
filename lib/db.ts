import { Pool } from 'pg';

// Lazy pool initialization
let pool: Pool | null = null;

// Schema prefix for multi-tenant support
// Set DB_SCHEMA=test for staging, leave unset or 'public' for production
const SCHEMA = process.env.DB_SCHEMA || 'public';
const s = SCHEMA === 'public' ? '' : `${SCHEMA}.`;

// Mock data mode for local development without database
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

console.log(`[ViveBien Dashboard] Using schema: ${SCHEMA}${USE_MOCK_DATA ? ' (MOCK DATA MODE)' : ''}`);

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '') {
    return null;
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });
  }
  return pool;
}

async function safeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
  const p = getPool();
  if (!p) return [];
  try {
    const result = params ? await p.query(query, params) : await p.query(query);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

// Types
export interface User {
  id: string;
  phone: string;
  phone_normalized?: string;
  name?: string;
  preferred_name?: string;
  preferred_language: string;
  date_of_birth?: string;
  gender?: string;
  zip_code?: string;
  medical_vault?: MedicalVault;
  notification_preferences?: NotificationPreferences;
  credits_remaining?: number;
  status: string;
  created_at: string;
  updated_at?: string;
  chatwoot_conversation_id?: number;
}

export interface MedicalVault {
  conditions?: Array<{ name: string; status: string; diagnosed_date?: string }>;
  medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
  allergies?: Array<{ name: string; severity?: string }>;
  providers?: Array<{ name: string; specialty?: string; clinic?: string }>;
  insurance?: { provider?: string; member_id?: string };
  family_history?: Array<{ condition: string; relation: string }>;
  social_determinants?: { transportation?: string; food_security?: string; housing?: string };
}

export interface NotificationPreferences {
  followups?: boolean;
  reminders?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface ConversationState {
  id: string;
  user_id: string;
  current_topic?: string;
  topic_depth?: number;
  emotional_state?: string;
  needs_human: boolean;
  handoff_reason?: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  user_id: string;
  role: string;
  content: string;
  channel: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface OperatorNote {
  id: string;
  user_id: string;
  session_id?: string;
  note: string;
  tags?: string[];
  created_by: string;
  created_at: string;
}

export interface UserWithDetails extends User {
  credits_balance?: number;
  credits_used_this_period?: number;
  credits_monthly_allowance?: number;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_started_at?: string;
  next_billing_date?: string;
  current_topic?: string;
  emotional_state?: string;
  needs_human?: boolean;
  last_message_at?: string;
  handoff_reason?: string;
  message_count?: number;
  routine_count?: number;
}

// Mock Data for local development
const MOCK_USERS: UserWithDetails[] = [
  {
    id: 'mock-user-1',
    phone: '+1234567890',
    preferred_name: 'María',
    name: 'María García',
    status: 'active',
    created_at: new Date().toISOString(),
    preferred_language: 'es',
    credits_balance: 150,
    credits_used_this_period: 25,
    subscription_status: 'trial',
    current_topic: 'sleep',
    emotional_state: 'calm',
    needs_human: false,
    last_message_at: new Date().toISOString(),
    message_count: 45,
    routine_count: 1,
  },
  {
    id: 'mock-user-2',
    phone: '+0987654321',
    preferred_name: 'Carlos',
    name: 'Carlos Rodríguez',
    status: 'active',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    preferred_language: 'es',
    credits_balance: 75,
    credits_used_this_period: 50,
    subscription_status: 'trial',
    current_topic: 'diabetes',
    emotional_state: 'anxious',
    needs_human: true,
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    message_count: 23,
    routine_count: 0,
  },
  {
    id: 'mock-user-3',
    phone: '+1122334455',
    preferred_name: 'Ana',
    name: 'Ana Martínez',
    status: 'active',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    preferred_language: 'both',
    credits_balance: 200,
    credits_used_this_period: 10,
    subscription_status: 'trial',
    current_topic: undefined,
    emotional_state: undefined,
    needs_human: false,
    last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    message_count: 12,
    routine_count: 2,
  },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'msg-1', user_id: 'mock-user-1', role: 'user', content: 'Hola', channel: 'whatsapp', created_at: new Date(Date.now() - 60000).toISOString() },
  { id: 'msg-2', user_id: 'mock-user-1', role: 'assistant', content: '¡Hola María! ¿Cómo te puedo ayudar hoy?', channel: 'whatsapp', created_at: new Date(Date.now() - 55000).toISOString() },
  { id: 'msg-3', user_id: 'mock-user-1', role: 'user', content: 'Tengo problemas para dormir', channel: 'whatsapp', created_at: new Date(Date.now() - 50000).toISOString() },
  { id: 'msg-4', user_id: 'mock-user-1', role: 'assistant', content: 'Entiendo, cuéntame más sobre eso. ¿Hace cuánto tiempo tienes estos problemas?', channel: 'whatsapp', created_at: new Date(Date.now() - 45000).toISOString() },
];

// API Functions with schema support
export async function fetchUsers(): Promise<UserWithDetails[]> {
  if (USE_MOCK_DATA) return MOCK_USERS;
  return safeQuery(`
    SELECT 
      u.id, u.phone, u.preferred_name, u.name, u.status, u.created_at, u.preferred_language,
      ba.credits_balance, ba.credits_used_this_period, ba.subscription_status,
      cs.current_topic, cs.emotional_state, cs.needs_human, cs.last_message_at,
      (SELECT COUNT(*) FROM ${s}messages WHERE user_id = u.id) as message_count,
      (SELECT COUNT(*) FROM ${s}health_routines WHERE user_id = u.id) as routine_count
    FROM ${s}users u
    LEFT JOIN ${s}billing_accounts ba ON ba.user_id = u.id
    LEFT JOIN ${s}conversation_state cs ON cs.user_id = u.id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC
  `);
}

export async function fetchUserById(id: string): Promise<UserWithDetails | null> {
  if (USE_MOCK_DATA) return MOCK_USERS.find(u => u.id === id) || null;
  const rows = await safeQuery(`
    SELECT 
      u.*,
      ba.id as billing_account_id, ba.credits_balance, ba.credits_used_this_period, 
      ba.credits_monthly_allowance, ba.subscription_status, ba.subscription_plan,
      ba.created_at as subscription_started_at,
      ba.credits_reset_at as next_billing_date,
      cs.current_topic, cs.emotional_state, cs.needs_human, cs.last_message_at, cs.handoff_reason
    FROM ${s}users u
    LEFT JOIN ${s}billing_accounts ba ON ba.user_id = u.id
    LEFT JOIN ${s}conversation_state cs ON cs.user_id = u.id
    WHERE u.id = $1
  `, [id]);
  return rows[0] || null;
}

export async function fetchUserMessages(userId: string, limit = 50): Promise<Message[]> {
  if (USE_MOCK_DATA) return MOCK_MESSAGES.filter(m => m.user_id === userId).slice(0, limit);
  return safeQuery(`
    SELECT * FROM ${s}messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
  `, [userId, limit]);
}

export async function fetchUserNotes(userId: string): Promise<OperatorNote[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT * FROM ${s}operator_notes WHERE user_id = $1 ORDER BY created_at DESC
  `, [userId]);
}

export async function addOperatorNote(userId: string, note: string, createdBy: string, tags?: string[]): Promise<OperatorNote | null> {
  const rows = await safeQuery(`
    INSERT INTO ${s}operator_notes (user_id, note, created_by, tags)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [userId, note, createdBy, tags || []]);
  return rows[0] || null;
}

export async function fetchDashboardStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalCredits: number;
  activeRoutines: number;
  needsHuman: number;
}> {
  if (USE_MOCK_DATA) {
    return {
      totalUsers: MOCK_USERS.length,
      activeUsers: MOCK_USERS.filter(u => u.status === 'active').length,
      totalCredits: MOCK_USERS.reduce((sum, u) => sum + (u.credits_balance || 0), 0),
      activeRoutines: 0,
      needsHuman: MOCK_USERS.filter(u => u.needs_human).length,
    };
  }

  const rows = await safeQuery(`
    SELECT
      (SELECT COUNT(*) FROM ${s}users WHERE deleted_at IS NULL) as total_users,
      (SELECT COUNT(*) FROM ${s}users WHERE status = 'active' AND deleted_at IS NULL) as active_users,
      (SELECT COALESCE(SUM(credits_balance), 0) FROM ${s}billing_accounts) as total_credits,
      (SELECT COUNT(*) FROM ${s}health_routines WHERE status = 'active') as active_routines,
      (SELECT COUNT(*) FROM ${s}conversation_state WHERE needs_human = true) as needs_human
  `);

  if (rows.length === 0) {
    return { totalUsers: 0, activeUsers: 0, totalCredits: 0, activeRoutines: 0, needsHuman: 0 };
  }

  return {
    totalUsers: parseInt(rows[0].total_users) || 0,
    activeUsers: parseInt(rows[0].active_users) || 0,
    totalCredits: parseInt(rows[0].total_credits) || 0,
    activeRoutines: parseInt(rows[0].active_routines) || 0,
    needsHuman: parseInt(rows[0].needs_human) || 0,
  };
}

// ============== NEW ENHANCED DASHBOARD FUNCTIONS ==============

// Follow-ups Interface
export interface Followup {
  id: string;
  user_id: string;
  type: string;
  scheduled_for: string;
  status: string;
  priority: string;
  notes?: string;
  created_at: string;
  user_name?: string;
  user_phone?: string;
}

// Fetch pending follow-ups
export async function fetchPendingFollowups(): Promise<Followup[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT
      f.*,
      COALESCE(u.preferred_name, u.name, 'Unknown') as user_name,
      u.phone as user_phone
    FROM ${s}followups f
    LEFT JOIN ${s}users u ON f.user_id = u.id
    WHERE f.status IN ('pending', 'scheduled')
    ORDER BY f.scheduled_for ASC
    LIMIT 20
  `);
}

// Fetch overdue follow-ups
export async function fetchOverdueFollowups(): Promise<Followup[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT
      f.*,
      COALESCE(u.preferred_name, u.name, 'Unknown') as user_name,
      u.phone as user_phone
    FROM ${s}followups f
    LEFT JOIN ${s}users u ON f.user_id = u.id
    WHERE f.status = 'pending' AND f.scheduled_for < NOW()
    ORDER BY f.scheduled_for ASC
    LIMIT 20
  `);
}

// Engagement Opportunities - users who need attention
export interface EngagementOpportunity {
  id: string;
  preferred_name?: string;
  name?: string;
  phone: string;
  last_message_at?: string;
  days_inactive: number;
  message_count: number;
  emotional_state?: string;
  reason: string;
}

export async function fetchEngagementOpportunities(): Promise<EngagementOpportunity[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH user_activity AS (
      SELECT
        u.id,
        u.preferred_name,
        u.name,
        u.phone,
        cs.last_message_at,
        cs.emotional_state,
        EXTRACT(DAY FROM NOW() - COALESCE(cs.last_message_at, u.created_at)) as days_inactive,
        (SELECT COUNT(*) FROM ${s}messages WHERE user_id = u.id) as message_count
      FROM ${s}users u
      LEFT JOIN ${s}conversation_state cs ON cs.user_id = u.id
      WHERE u.deleted_at IS NULL
    )
    SELECT
      *,
      CASE
        WHEN days_inactive > 7 THEN 'Inactive for ' || days_inactive::int || ' days'
        WHEN message_count < 5 THEN 'Low engagement (' || message_count || ' messages)'
        WHEN emotional_state IN ('anxious', 'frustrated', 'worried') THEN 'Needs emotional support'
        ELSE 'Check-in recommended'
      END as reason
    FROM user_activity
    WHERE days_inactive > 3 OR message_count < 5 OR emotional_state IN ('anxious', 'frustrated', 'worried')
    ORDER BY
      CASE WHEN emotional_state IN ('anxious', 'frustrated', 'worried') THEN 0 ELSE 1 END,
      days_inactive DESC
    LIMIT 10
  `);
}

// System Health Stats
export interface SystemHealth {
  totalMessages24h: number;
  totalAiCalls24h: number;
  avgResponseTimeMs: number;
  errorCount24h: number;
  activeConversations: number;
  totalMessagesAllTime: number;
  totalUsersAllTime: number;
  totalAiCallsAllTime: number;
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  if (USE_MOCK_DATA) {
    return {
      totalMessages24h: 0,
      totalAiCalls24h: 0,
      avgResponseTimeMs: 0,
      errorCount24h: 0,
      activeConversations: 0,
      totalMessagesAllTime: 0,
      totalUsersAllTime: 0,
      totalAiCallsAllTime: 0,
    };
  }

  const rows = await safeQuery(`
    SELECT
      (SELECT COUNT(*) FROM ${s}messages WHERE created_at > NOW() - INTERVAL '24 hours') as total_messages_24h,
      (SELECT COUNT(*) FROM ${s}ai_usage WHERE created_at > NOW() - INTERVAL '24 hours') as total_ai_calls_24h,
      (SELECT COALESCE(AVG(latency_ms), 0) FROM ${s}ai_usage WHERE created_at > NOW() - INTERVAL '24 hours') as avg_response_time_ms,
      (SELECT COUNT(*) FROM ${s}execution_logs WHERE status = 'error' AND created_at > NOW() - INTERVAL '24 hours') as error_count_24h,
      (SELECT COUNT(*) FROM ${s}conversation_state WHERE last_message_at > NOW() - INTERVAL '1 hour') as active_conversations,
      (SELECT COUNT(*) FROM ${s}messages) as total_messages_all_time,
      (SELECT COUNT(*) FROM ${s}users WHERE deleted_at IS NULL) as total_users_all_time,
      (SELECT COUNT(*) FROM ${s}ai_usage) as total_ai_calls_all_time
  `);

  if (rows.length === 0) {
    return {
      totalMessages24h: 0, totalAiCalls24h: 0, avgResponseTimeMs: 0,
      errorCount24h: 0, activeConversations: 0,
      totalMessagesAllTime: 0, totalUsersAllTime: 0, totalAiCallsAllTime: 0,
    };
  }

  return {
    totalMessages24h: parseInt(rows[0].total_messages_24h) || 0,
    totalAiCalls24h: parseInt(rows[0].total_ai_calls_24h) || 0,
    avgResponseTimeMs: Math.round(parseFloat(rows[0].avg_response_time_ms) || 0),
    errorCount24h: parseInt(rows[0].error_count_24h) || 0,
    activeConversations: parseInt(rows[0].active_conversations) || 0,
    totalMessagesAllTime: parseInt(rows[0].total_messages_all_time) || 0,
    totalUsersAllTime: parseInt(rows[0].total_users_all_time) || 0,
    totalAiCallsAllTime: parseInt(rows[0].total_ai_calls_all_time) || 0,
  };
}

// Circuit Breaker details (all services)
export interface CircuitBreakerInfo {
  serviceName: string;
  state: string;
  failureCount: number;
  lastFailureAt: string | null;
  failureThreshold: number;
  recoveryTimeoutSeconds: number;
}

export async function fetchCircuitBreakers(): Promise<CircuitBreakerInfo[]> {
  if (USE_MOCK_DATA) return [];
  const rows = await safeQuery(`
    SELECT service_name, state, failure_count, last_failure_at,
           failure_threshold, recovery_timeout_seconds
    FROM ${s}circuit_breakers
    ORDER BY service_name
  `);
  return rows.map(r => ({
    serviceName: r.service_name,
    state: r.state || 'closed',
    failureCount: parseInt(r.failure_count) || 0,
    lastFailureAt: r.last_failure_at,
    failureThreshold: parseInt(r.failure_threshold) || 5,
    recoveryTimeoutSeconds: parseInt(r.recovery_timeout_seconds) || 60,
  }));
}

// AI Usage Stats (all-time + 24h cost/token breakdown)
export interface AiUsageStats {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cost24h: number;
  inputTokens24h: number;
  outputTokens24h: number;
  avgLatency24h: number;
  modelBreakdown: Array<{ model: string; calls: number; cost: number }>;
}

export async function fetchAiUsageStats(): Promise<AiUsageStats> {
  if (USE_MOCK_DATA) {
    return {
      totalCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0,
      cost24h: 0, inputTokens24h: 0, outputTokens24h: 0, avgLatency24h: 0,
      modelBreakdown: [],
    };
  }

  // Query ai_usage (Claude chat) + production.media (Whisper transcription & Vision)
  const [totals, recent, models, mediaTotals, mediaRecent, mediaModels] = await Promise.all([
    // --- ai_usage totals (all time) ---
    safeQuery(`
      SELECT
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(input_tokens), 0) as total_input,
        COALESCE(SUM(output_tokens), 0) as total_output
      FROM ${s}ai_usage
    `),
    // --- ai_usage recent (24h) ---
    safeQuery(`
      SELECT
        COALESCE(SUM(cost_usd), 0) as cost_24h,
        COALESCE(SUM(input_tokens), 0) as input_24h,
        COALESCE(SUM(output_tokens), 0) as output_24h,
        COALESCE(AVG(latency_ms), 0) as avg_latency_24h
      FROM ${s}ai_usage
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `),
    // --- ai_usage model breakdown ---
    safeQuery(`
      SELECT model, COUNT(*) as calls, COALESCE(SUM(cost_usd), 0) as cost
      FROM ${s}ai_usage
      GROUP BY model
      ORDER BY calls DESC
    `),
    // --- production.media totals (all time) ---
    safeQuery(`
      SELECT
        COALESCE(SUM(ai_cost_usd), 0) as total_cost,
        COALESCE(SUM(ai_tokens_used), 0) as total_tokens
      FROM production.media
      WHERE ai_model IS NOT NULL
    `),
    // --- production.media recent (24h) ---
    safeQuery(`
      SELECT
        COALESCE(SUM(ai_cost_usd), 0) as cost_24h,
        COALESCE(SUM(ai_tokens_used), 0) as tokens_24h
      FROM production.media
      WHERE ai_model IS NOT NULL
        AND created_at > NOW() - INTERVAL '24 hours'
    `),
    // --- production.media model breakdown ---
    safeQuery(`
      SELECT
        ai_model as model,
        media_type,
        COUNT(*) as calls,
        COALESCE(SUM(ai_cost_usd), 0) as cost
      FROM production.media
      WHERE ai_model IS NOT NULL
      GROUP BY ai_model, media_type
      ORDER BY calls DESC
    `),
  ]);

  // Combine ai_usage + media model breakdowns
  const aiModels = models.map(m => ({
    model: m.model || 'unknown',
    calls: parseInt(m.calls) || 0,
    cost: parseFloat(m.cost) || 0,
  }));

  const mediaModelEntries = mediaModels.map(m => ({
    model: `${m.model || 'unknown'} (${m.media_type || 'media'})`,
    calls: parseInt(m.calls) || 0,
    cost: parseFloat(m.cost) || 0,
  }));

  const allModels = [...aiModels, ...mediaModelEntries].sort((a, b) => b.calls - a.calls);

  // Sum up totals from both sources
  const mediaTotalCost = parseFloat(mediaTotals[0]?.total_cost) || 0;
  const mediaTotalTokens = parseInt(mediaTotals[0]?.total_tokens) || 0;
  const mediaRecentCost = parseFloat(mediaRecent[0]?.cost_24h) || 0;
  const mediaRecentTokens = parseInt(mediaRecent[0]?.tokens_24h) || 0;

  return {
    totalCostUsd: (parseFloat(totals[0]?.total_cost) || 0) + mediaTotalCost,
    totalInputTokens: (parseInt(totals[0]?.total_input) || 0) + mediaTotalTokens,
    totalOutputTokens: parseInt(totals[0]?.total_output) || 0,
    cost24h: (parseFloat(recent[0]?.cost_24h) || 0) + mediaRecentCost,
    inputTokens24h: (parseInt(recent[0]?.input_24h) || 0) + mediaRecentTokens,
    outputTokens24h: parseInt(recent[0]?.output_24h) || 0,
    avgLatency24h: Math.round(parseFloat(recent[0]?.avg_latency_24h) || 0),
    modelBreakdown: allModels,
  };
}

// Recent Executions log
export interface RecentExecution {
  status: string;
  executionTimeMs: number;
  createdAt: string;
  intentType: string | null;
  nodeName: string | null;
}

export async function fetchRecentExecutions(limit = 10): Promise<RecentExecution[]> {
  if (USE_MOCK_DATA) return [];
  const rows = await safeQuery(`
    SELECT status, execution_time_ms, created_at, intent_type, node_name
    FROM ${s}execution_logs
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  return rows.map(r => ({
    status: r.status || 'unknown',
    executionTimeMs: parseInt(r.execution_time_ms) || 0,
    createdAt: r.created_at,
    intentType: r.intent_type,
    nodeName: r.node_name,
  }));
}

// Recent activity feed
export interface ActivityItem {
  id: string;
  type: string;
  user_id: string;
  user_name?: string;
  description: string;
  created_at: string;
}

export async function fetchRecentActivity(limit = 15): Promise<ActivityItem[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH activity AS (
      SELECT
        m.id::text,
        'message' as type,
        m.user_id,
        m.role || ': ' || LEFT(m.content, 50) || CASE WHEN LENGTH(m.content) > 50 THEN '...' ELSE '' END as description,
        m.created_at
      FROM ${s}messages m
      WHERE m.created_at > NOW() - INTERVAL '24 hours'

      UNION ALL

      SELECT
        cl.id::text,
        'credit' as type,
        cl.user_id,
        cl.change_type || ': ' || cl.change_amount || ' credits' as description,
        cl.created_at
      FROM ${s}credit_ledger cl
      WHERE cl.created_at > NOW() - INTERVAL '24 hours'
    )
    SELECT
      a.*,
      COALESCE(u.preferred_name, u.name, 'Unknown') as user_name
    FROM activity a
    LEFT JOIN ${s}users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT $1
  `, [limit]);
}

// ============== ANALYTICS FUNCTIONS ==============

// Message volume by day (last 14 days)
export interface DailyMessageCount {
  date: string;
  user_messages: number;
  assistant_messages: number;
  total: number;
}

export async function fetchMessageVolumeByDay(days = 14): Promise<DailyMessageCount[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days - 1} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_counts AS (
      SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE role = 'user') as user_messages,
        COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
        COUNT(*) as total
      FROM ${s}messages
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
    )
    SELECT
      TO_CHAR(ds.date, 'MM/DD') as date,
      COALESCE(dc.user_messages, 0) as user_messages,
      COALESCE(dc.assistant_messages, 0) as assistant_messages,
      COALESCE(dc.total, 0) as total
    FROM date_series ds
    LEFT JOIN daily_counts dc ON ds.date = dc.date
    ORDER BY ds.date ASC
  `);
}

// Emotional state distribution
export interface EmotionalStateCount {
  state: string;
  count: number;
  percentage: number;
}

export async function fetchEmotionalStateDistribution(): Promise<EmotionalStateCount[]> {
  if (USE_MOCK_DATA) return [];
  const rows = await safeQuery(`
    WITH states AS (
      SELECT
        COALESCE(emotional_state, 'unknown') as state,
        COUNT(*) as count
      FROM ${s}conversation_state
      GROUP BY emotional_state
    ),
    total AS (
      SELECT SUM(count) as total FROM states
    )
    SELECT
      s.state,
      s.count::int,
      ROUND((s.count::numeric / NULLIF(t.total, 0) * 100), 1) as percentage
    FROM states s, total t
    ORDER BY s.count DESC
  `);
  return rows.map(r => ({
    state: r.state || 'unknown',
    count: parseInt(r.count) || 0,
    percentage: parseFloat(r.percentage) || 0
  }));
}

// Topic distribution
export interface TopicCount {
  topic: string;
  count: number;
}

export async function fetchTopicDistribution(): Promise<TopicCount[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT
      COALESCE(current_topic, 'general') as topic,
      COUNT(*) as count
    FROM ${s}conversation_state
    WHERE current_topic IS NOT NULL
    GROUP BY current_topic
    ORDER BY count DESC
    LIMIT 10
  `);
}

// User growth over time
export interface UserGrowth {
  date: string;
  new_users: number;
  cumulative: number;
}

export async function fetchUserGrowth(days = 30): Promise<UserGrowth[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days - 1} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_new AS (
      SELECT DATE(created_at) as date, COUNT(*) as new_users
      FROM ${s}users
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
    ),
    cumulative AS (
      SELECT
        ds.date,
        COALESCE(dn.new_users, 0) as new_users,
        (SELECT COUNT(*) FROM ${s}users WHERE DATE(created_at) <= ds.date) as cumulative
      FROM date_series ds
      LEFT JOIN daily_new dn ON ds.date = dn.date
    )
    SELECT
      TO_CHAR(date, 'MM/DD') as date,
      new_users::int,
      cumulative::int
    FROM cumulative
    ORDER BY date ASC
  `);
}

// Engagement metrics summary
export interface EngagementMetrics {
  avgMessagesPerUser: number;
  avgSessionLength: number;
  returnRate: number;
  activeUserRate: number;
}

export async function fetchEngagementMetrics(): Promise<EngagementMetrics> {
  if (USE_MOCK_DATA) {
    return { avgMessagesPerUser: 0, avgSessionLength: 0, returnRate: 0, activeUserRate: 0 };
  }

  const rows = await safeQuery(`
    SELECT
      (SELECT ROUND(AVG(msg_count), 1) FROM (
        SELECT COUNT(*) as msg_count FROM ${s}messages GROUP BY user_id
      ) t) as avg_messages_per_user,
      (SELECT COUNT(*) FROM ${s}users WHERE id IN (
        SELECT DISTINCT user_id FROM ${s}messages WHERE created_at > NOW() - INTERVAL '7 days'
      ))::float / NULLIF((SELECT COUNT(*) FROM ${s}users), 0) * 100 as return_rate,
      (SELECT COUNT(*) FROM ${s}conversation_state WHERE last_message_at > NOW() - INTERVAL '24 hours')::float /
        NULLIF((SELECT COUNT(*) FROM ${s}users), 0) * 100 as active_user_rate
  `);

  if (rows.length === 0) {
    return { avgMessagesPerUser: 0, avgSessionLength: 0, returnRate: 0, activeUserRate: 0 };
  }

  return {
    avgMessagesPerUser: parseFloat(rows[0].avg_messages_per_user) || 0,
    avgSessionLength: 0, // Would need session tracking
    returnRate: Math.round(parseFloat(rows[0].return_rate) || 0),
    activeUserRate: Math.round(parseFloat(rows[0].active_user_rate) || 0),
  };
}

// Today's active users with interaction details
export interface TodaysActiveUser {
  id: string;
  preferred_name?: string;
  name?: string;
  phone: string;
  preferred_language: string;
  message_count_today: number;
  first_message_today: string;
  last_message_today: string;
  emotional_state?: string;
  current_topic?: string;
}

export async function fetchTodaysActiveUsers(): Promise<TodaysActiveUser[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT
      u.id,
      u.preferred_name,
      u.name,
      u.phone,
      u.preferred_language,
      COUNT(m.id)::int as message_count_today,
      MIN(m.created_at) as first_message_today,
      MAX(m.created_at) as last_message_today,
      cs.emotional_state,
      cs.current_topic
    FROM ${s}users u
    INNER JOIN ${s}messages m ON m.user_id = u.id
      AND m.created_at >= CURRENT_DATE
      AND m.role = 'user'
    LEFT JOIN ${s}conversation_state cs ON cs.user_id = u.id
    WHERE u.deleted_at IS NULL
    GROUP BY u.id, u.preferred_name, u.name, u.phone, u.preferred_language,
             cs.emotional_state, cs.current_topic
    ORDER BY MAX(m.created_at) DESC
  `);
}

// Active users per day for the last N days
export interface DailyActiveUserCount {
  date: string;
  active_users: number;
}

export async function fetchDailyActiveUsers(days = 14): Promise<DailyActiveUserCount[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days - 1} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_active AS (
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as active_users
      FROM ${s}messages
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND role = 'user'
      GROUP BY DATE(created_at)
    )
    SELECT
      TO_CHAR(ds.date, 'MM/DD') as date,
      COALESCE(da.active_users, 0)::int as active_users
    FROM date_series ds
    LEFT JOIN daily_active da ON ds.date = da.date
    ORDER BY ds.date ASC
  `);
}
