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

export interface BillingAccount {
  id: string;
  user_id: string;
  subscription_status: string;
  subscription_plan?: string;
  credits_balance: number;
  credits_monthly_allowance: number;
  credits_used_this_period: number;
  credits_reset_at?: string;
  created_at: string;
}

export interface CreditLedgerEntry {
  id: string;
  billing_account_id: string;
  user_id: string;
  change_amount: number;
  change_type: string;
  balance_after: number;
  description?: string;
  external_ref?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface HealthRoutine {
  id: string;
  user_id: string;
  type: string;
  status: string;
  schedule: RoutineSchedule;
  configuration: RoutineConfiguration;
  created_at: string;
  updated_at: string;
}

export interface RoutineSchedule {
  timezone?: string;
  evening_message?: string;
  morning_message?: string;
  pre_bed_message?: string;
}

export interface RoutineConfiguration {
  goal?: string;
  bedtime?: string;
  wake_time?: string;
  language?: string;
  risk_flags?: string[];
  evidence_basis?: string;
  takes_sleep_meds?: boolean;
  medications_confirmed?: boolean;
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

const MOCK_ROUTINES: HealthRoutine[] = [
  {
    id: 'routine-1',
    user_id: 'mock-user-1',
    type: 'sleep_improvement',
    status: 'active',
    schedule: { timezone: 'America/New_York', evening_message: '9pm', morning_message: '7am' },
    configuration: { goal: 'Better sleep quality', bedtime: '22:00', wake_time: '06:00' },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
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

export async function fetchUserRoutines(userId: string): Promise<HealthRoutine[]> {
  if (USE_MOCK_DATA) return MOCK_ROUTINES.filter(r => r.user_id === userId);
  return safeQuery(`
    SELECT * FROM ${s}health_routines WHERE user_id = $1 ORDER BY created_at DESC
  `, [userId]);
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

export async function fetchCreditHistory(userId: string): Promise<CreditLedgerEntry[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT cl.* FROM ${s}credit_ledger cl
    JOIN ${s}billing_accounts ba ON cl.billing_account_id = ba.id
    WHERE ba.user_id = $1
    ORDER BY cl.created_at DESC
    LIMIT 50
  `, [userId]);
}

export async function addCredits(userId: string, amount: number, description: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const p = getPool();
  if (!p) return { success: false, error: 'Database not available' };
  
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    
    const baResult = await client.query(`SELECT id, credits_balance FROM ${s}billing_accounts WHERE user_id = $1`, [userId]);
    if (baResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'No billing account found' };
    }
    
    const ba = baResult.rows[0];
    const newBalance = ba.credits_balance + amount;
    
    await client.query(`UPDATE ${s}billing_accounts SET credits_balance = $1, updated_at = NOW() WHERE id = $2`, [newBalance, ba.id]);
    
    await client.query(`
      INSERT INTO ${s}credit_ledger (billing_account_id, user_id, change_amount, change_type, balance_after, description)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [ba.id, userId, amount, amount > 0 ? 'admin_add' : 'admin_deduct', newBalance, description]);
    
    await client.query('COMMIT');
    return { success: true, newBalance };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function addOperatorNote(userId: string, note: string, createdBy: string, tags?: string[]): Promise<OperatorNote | null> {
  const rows = await safeQuery(`
    INSERT INTO ${s}operator_notes (user_id, note, created_by, tags)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [userId, note, createdBy, tags || []]);
  return rows[0] || null;
}

export async function updateRoutineStatus(routineId: string, status: string): Promise<HealthRoutine | null> {
  const rows = await safeQuery(`
    UPDATE ${s}health_routines SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
  `, [status, routineId]);
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
      activeRoutines: MOCK_ROUTINES.filter(r => r.status === 'active').length,
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
  circuitBreakerStatus: string;
  creditsUsed24h: number;
  activeConversations: number;
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  if (USE_MOCK_DATA) {
    return {
      totalMessages24h: 0,
      totalAiCalls24h: 0,
      avgResponseTimeMs: 0,
      errorCount24h: 0,
      circuitBreakerStatus: 'closed',
      creditsUsed24h: 0,
      activeConversations: 0,
    };
  }

  const rows = await safeQuery(`
    SELECT
      (SELECT COUNT(*) FROM ${s}messages WHERE created_at > NOW() - INTERVAL '24 hours') as total_messages_24h,
      (SELECT COUNT(*) FROM ${s}ai_usage WHERE created_at > NOW() - INTERVAL '24 hours') as total_ai_calls_24h,
      (SELECT COALESCE(AVG(latency_ms), 0) FROM ${s}ai_usage WHERE created_at > NOW() - INTERVAL '24 hours') as avg_response_time_ms,
      (SELECT COUNT(*) FROM ${s}execution_logs WHERE status = 'error' AND created_at > NOW() - INTERVAL '24 hours') as error_count_24h,
      (SELECT COALESCE(state, 'closed') FROM ${s}circuit_breakers WHERE service_name = 'claude_api' LIMIT 1) as circuit_breaker_status,
      (SELECT COALESCE(SUM(ABS(change_amount)), 0) FROM ${s}credit_ledger WHERE change_type = 'work_action' AND created_at > NOW() - INTERVAL '24 hours') as credits_used_24h,
      (SELECT COUNT(*) FROM ${s}conversation_state WHERE last_message_at > NOW() - INTERVAL '1 hour') as active_conversations
  `);

  if (rows.length === 0) {
    return {
      totalMessages24h: 0,
      totalAiCalls24h: 0,
      avgResponseTimeMs: 0,
      errorCount24h: 0,
      circuitBreakerStatus: 'closed',
      creditsUsed24h: 0,
      activeConversations: 0,
    };
  }

  return {
    totalMessages24h: parseInt(rows[0].total_messages_24h) || 0,
    totalAiCalls24h: parseInt(rows[0].total_ai_calls_24h) || 0,
    avgResponseTimeMs: Math.round(parseFloat(rows[0].avg_response_time_ms) || 0),
    errorCount24h: parseInt(rows[0].error_count_24h) || 0,
    circuitBreakerStatus: rows[0].circuit_breaker_status || 'closed',
    creditsUsed24h: parseInt(rows[0].credits_used_24h) || 0,
    activeConversations: parseInt(rows[0].active_conversations) || 0,
  };
}

// Appointments
export interface Appointment {
  id: string;
  user_email: string;
  provider_id?: string;
  scheduled_at: string;
  status: string;
  type: string;
  reason?: string;
  notes?: string;
  meeting_link?: string;
  created_at: string;
  provider_name?: string;
}

export async function fetchUpcomingAppointments(): Promise<Appointment[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT
      a.*,
      p.name as provider_name
    FROM ${s}appointments a
    LEFT JOIN ${s}providers p ON a.provider_id = p.id::text
    WHERE a.scheduled_at >= NOW() AND a.status != 'cancelled'
    ORDER BY a.scheduled_at ASC
    LIMIT 10
  `);
}

// Provider stats
export interface Provider {
  id: string;
  name: string;
  specialty?: string;
  clinic?: string;
  phone?: string;
  email?: string;
  status: string;
  appointment_count?: number;
}

export async function fetchProviders(): Promise<Provider[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM ${s}appointments WHERE provider_id = p.id::text) as appointment_count
    FROM ${s}providers p
    WHERE p.status = 'active'
    ORDER BY p.name
  `);
}

// Health Vault Summary for a user
export interface VaultSummary {
  conditions_count: number;
  medications_count: number;
  allergies_count: number;
  has_profile: boolean;
}

export async function fetchUserVaultSummary(userId: string): Promise<VaultSummary> {
  if (USE_MOCK_DATA) {
    return { conditions_count: 0, medications_count: 0, allergies_count: 0, has_profile: false };
  }

  const rows = await safeQuery(`
    SELECT
      (SELECT COUNT(*) FROM ${s}vault_conditions WHERE user_id = $1) as conditions_count,
      (SELECT COUNT(*) FROM ${s}vault_medications WHERE user_id = $1) as medications_count,
      (SELECT COUNT(*) FROM ${s}vault_allergies WHERE user_id = $1) as allergies_count,
      (SELECT EXISTS(SELECT 1 FROM ${s}vault_profiles WHERE user_id = $1)) as has_profile
  `, [userId]);

  if (rows.length === 0) {
    return { conditions_count: 0, medications_count: 0, allergies_count: 0, has_profile: false };
  }

  return {
    conditions_count: parseInt(rows[0].conditions_count) || 0,
    medications_count: parseInt(rows[0].medications_count) || 0,
    allergies_count: parseInt(rows[0].allergies_count) || 0,
    has_profile: rows[0].has_profile || false,
  };
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
      TO_CHAR(ds.date, 'Mon DD') as date,
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
      TO_CHAR(date, 'Mon DD') as date,
      new_users::int,
      cumulative::int
    FROM cumulative
    ORDER BY date ASC
  `);
}

// Credits usage over time
export interface CreditsUsage {
  date: string;
  credits_used: number;
  credits_added: number;
}

export async function fetchCreditsUsage(days = 14): Promise<CreditsUsage[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days - 1} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_credits AS (
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN change_amount < 0 THEN ABS(change_amount) ELSE 0 END) as credits_used,
        SUM(CASE WHEN change_amount > 0 THEN change_amount ELSE 0 END) as credits_added
      FROM ${s}credit_ledger
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
    )
    SELECT
      TO_CHAR(ds.date, 'Mon DD') as date,
      COALESCE(dc.credits_used, 0)::int as credits_used,
      COALESCE(dc.credits_added, 0)::int as credits_added
    FROM date_series ds
    LEFT JOIN daily_credits dc ON ds.date = dc.date
    ORDER BY ds.date ASC
  `);
}

// Response time trends
export interface ResponseTimeTrend {
  date: string;
  avg_latency_ms: number;
  max_latency_ms: number;
  request_count: number;
}

export async function fetchResponseTimeTrends(days = 7): Promise<ResponseTimeTrend[]> {
  if (USE_MOCK_DATA) return [];
  return safeQuery(`
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days - 1} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_latency AS (
      SELECT
        DATE(created_at) as date,
        AVG(latency_ms) as avg_latency_ms,
        MAX(latency_ms) as max_latency_ms,
        COUNT(*) as request_count
      FROM ${s}ai_usage
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
    )
    SELECT
      TO_CHAR(ds.date, 'Mon DD') as date,
      COALESCE(ROUND(dl.avg_latency_ms), 0)::int as avg_latency_ms,
      COALESCE(dl.max_latency_ms, 0)::int as max_latency_ms,
      COALESCE(dl.request_count, 0)::int as request_count
    FROM date_series ds
    LEFT JOIN daily_latency dl ON ds.date = dl.date
    ORDER BY ds.date ASC
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
