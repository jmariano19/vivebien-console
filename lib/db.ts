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
