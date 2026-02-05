# ViveBien v2 Deployment Guide - Production First

## Quick Deploy Steps

1. **Run Database Migration** (do this FIRST)
2. **Update PG_LoadUser** in n8n
3. **Update FN_BuildContext** in n8n
4. **Update PG_SaveAll** in n8n
5. **Test with a new phone number**

---

## Step 1: Database Migration

Run this SQL in your production database:

```sql
-- ViveBien v2 Migration - Production
-- Run against your PostgreSQL database

-- Add new columns to conversation_state
ALTER TABLE production.conversation_state
  ADD COLUMN IF NOT EXISTS onboarding_phase VARCHAR(20) DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS conversation_mode VARCHAR(20) DEFAULT 'capture',
  ADD COLUMN IF NOT EXISTS has_mini_summary BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doctor_summary JSONB,
  ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_offered BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cs_onboarding_phase ON production.conversation_state(onboarding_phase);
CREATE INDEX IF NOT EXISTS idx_cs_has_mini_summary ON production.conversation_state(has_mini_summary) WHERE has_mini_summary = TRUE;

-- Mark existing users as 'complete' (they already went through old onboarding)
UPDATE production.conversation_state cs
SET onboarding_phase = 'complete', conversation_mode = 'capture'
WHERE EXISTS (
  SELECT 1 FROM production.messages m WHERE m.user_id = cs.user_id AND m.role = 'user' LIMIT 1
) AND onboarding_phase = 'new';

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'production' AND table_name = 'conversation_state'
AND column_name IN ('onboarding_phase', 'conversation_mode', 'has_mini_summary');
```

---

## Step 2: Update PG_LoadUser

In **ViveBien_MVP_v26_PROD**, update the `PG_LoadUser` node query to:

```sql
-- PG_LoadUser v26 - ViveBien v2 with Onboarding Phase
-- PROD: Uses production schema
WITH upserted_user AS (
  INSERT INTO production.users (phone)
  VALUES ($1)
  ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
  RETURNING *
),
upserted_billing AS (
  INSERT INTO production.billing_accounts (user_id, subscription_status, subscription_plan, credits_balance)
  SELECT id, 'trial', 'basic_12', 50 FROM upserted_user
  ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  RETURNING *
),
user_state AS (
  SELECT
    current_topic,
    emotional_state,
    needs_human,
    last_message_at,
    context,
    -- NEW: ViveBien v2 fields
    COALESCE(onboarding_phase, 'new') as onboarding_phase,
    COALESCE(conversation_mode, 'capture') as conversation_mode,
    COALESCE(has_mini_summary, false) as has_mini_summary,
    doctor_summary,
    COALESCE(session_count, 0) as session_count,
    COALESCE(link_offered, false) as link_offered
  FROM production.conversation_state
  WHERE user_id = (SELECT id FROM upserted_user)
),
recent_msgs AS (
  SELECT json_agg(m ORDER BY m.created_at ASC) AS messages
  FROM (
    SELECT role, content, created_at
    FROM production.messages
    WHERE user_id = (SELECT id FROM upserted_user)
    ORDER BY created_at DESC
    LIMIT 15
  ) m
),
flags AS (
  SELECT json_object_agg(flag_key, enabled) AS feature_flags
  FROM production.feature_flags
),
claude_circuit AS (
  SELECT * FROM production.circuit_check('claude_api')
)
SELECT
  u.*,
  b.id as billing_account_id,
  b.subscription_status,
  b.subscription_plan,
  b.credits_balance,
  b.credits_monthly_allowance,
  b.credits_used_this_period,
  b.credits_reset_at,
  COALESCE(s.current_topic, 'general') as current_topic,
  COALESCE(s.emotional_state, 'neutral') as emotional_state,
  COALESCE(s.needs_human, false) as needs_human,
  s.last_message_at,
  COALESCE(s.context, '{}'::jsonb) as conversation_context,
  COALESCE(m.messages, '[]'::json) as recent_messages,
  COALESCE(f.feature_flags, '{}'::json) as feature_flags,
  COALESCE(c.is_open, false) as claude_circuit_open,
  COALESCE(c.state, 'closed') as claude_circuit_state,
  COALESCE(c.seconds_until_retry, 0) as claude_circuit_retry_seconds,
  -- NEW: ViveBien v2 fields
  COALESCE(s.onboarding_phase, 'new') as onboarding_phase,
  COALESCE(s.conversation_mode, 'capture') as conversation_mode,
  COALESCE(s.has_mini_summary, false) as has_mini_summary,
  s.doctor_summary,
  COALESCE(s.session_count, 0) as session_count,
  COALESCE(s.link_offered, false) as link_offered
FROM upserted_user u
LEFT JOIN upserted_billing b ON u.id = b.user_id
LEFT JOIN user_state s ON true
LEFT JOIN recent_msgs m ON true
LEFT JOIN flags f ON true
LEFT JOIN claude_circuit c ON true;
```

---

## Step 3: Update FN_BuildContext

Replace the entire code in `FN_BuildContext` with the code in:
**`/outputs/FN_BuildContext_v2.js`**

Or copy from here (full code):

```javascript
// FN_BuildContext v2 - ViveBien Doctor-Ready Summary System
// ═══════════════════════════════════════════════════════════════════════════

const input = $input.first().json;
const startTime = Date.now();

const user = input.user || {};
const intent = input.intent || {};
const billing = input.billing || {};

const userMessage = input.message || '';
const mediaType = input.mediaType || 'text';

const imageBase64 = input.imageBase64 || null;
const imageMimeType = input.imageMimeType || 'image/jpeg';
const hasImage = input.hasImage || false;

const conversationContext = user.conversation_context || {};
const existingFacts = conversationContext.facts || {};

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING PHASE TRACKING
// ═══════════════════════════════════════════════════════════════════════════
const onboardingPhase = user.onboarding_phase || 'new';
const conversationMode = user.conversation_mode || 'capture';
const hasMiniSummary = user.has_mini_summary || false;
const doctorSummary = user.doctor_summary || null;
const sessionCount = user.session_count || 0;
const linkOffered = user.link_offered || false;

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY/URGENCY DETECTION (ALWAYS ON)
// ═══════════════════════════════════════════════════════════════════════════
const SAFETY_KEYWORDS = {
  high_urgency: [
    'chest pain', 'heart attack', 'can\'t breathe', 'cannot breathe', 'stroke',
    'suicid', 'kill myself', 'want to die', 'end my life', 'hurt myself',
    'bleeding heavily', 'won\'t stop bleeding', 'unconscious', 'passed out',
    'severe allergic', 'anaphyla', 'swelling throat', 'can\'t swallow',
    'worst headache', 'sudden numbness', 'sudden weakness', 'slurred speech',
    'seizure', 'convulsion', 'overdose',
    'dolor de pecho', 'ataque al corazon', 'ataque cardiaco', 'no puedo respirar',
    'embolia', 'derrame', 'matarme', 'quiero morir', 'acabar con mi vida',
    'sangrado', 'no para de sangrar', 'inconsciente', 'desmayo',
    'alergia severa', 'garganta hinchada', 'no puedo tragar',
    'peor dolor de cabeza', 'entumecimiento', 'debilidad repentina',
    'convulsion', 'sobredosis'
  ],
  medium_urgency: [
    'severe pain', 'excruciating', 'unbearable pain', 'high fever',
    'vomiting blood', 'blood in stool', 'can\'t keep anything down',
    'getting worse fast', 'spreading rapidly', 'difficulty breathing',
    'dolor severo', 'dolor insoportable', 'fiebre alta', 'fiebre muy alta',
    'vomitando sangre', 'sangre en heces', 'no puedo retener nada',
    'empeorando rapido', 'se extiende rapido', 'dificultad para respirar'
  ]
};

function detectUrgency(message) {
  if (!message) return { level: 'none', keywords: [] };
  const lower = message.toLowerCase();
  const foundKeywords = [];

  for (const keyword of SAFETY_KEYWORDS.high_urgency) {
    if (lower.includes(keyword.toLowerCase())) foundKeywords.push(keyword);
  }
  if (foundKeywords.length > 0) return { level: 'high', keywords: foundKeywords };

  for (const keyword of SAFETY_KEYWORDS.medium_urgency) {
    if (lower.includes(keyword.toLowerCase())) foundKeywords.push(keyword);
  }
  if (foundKeywords.length > 0) return { level: 'medium', keywords: foundKeywords };

  return { level: 'none', keywords: [] };
}

const urgencyDetection = detectUrgency(userMessage);

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════
function detectLanguage(text) {
  if (!text || text.trim().length < 2) return { lang: 'es', confidence: 0 };

  const spanishIndicators = ['hola', 'como', 'estoy', 'tengo', 'quiero', 'necesito', 'gracias', 'buenos', 'buenas', 'que', 'el', 'la', 'los', 'las', 'un', 'una', 'mi', 'tu', 'es', 'son', 'muy', 'bien', 'mal', 'si', 'para', 'con', 'pero', 'porque', 'cuando', 'donde', 'quien', 'cual', 'salud', 'dolor', 'medicina', 'doctor', 'medico', 'enfermo', 'cita', 'visita'];
  const englishIndicators = ['the', 'a', 'an', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'hi', 'hello', 'hey', 'please', 'thank', 'thanks', 'help', 'doctor', 'appointment'];

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  let spanishCount = 0, englishCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length < 1) continue;
    if (spanishIndicators.includes(cleanWord)) spanishCount++;
    if (englishIndicators.includes(cleanWord)) englishCount++;
  }

  if (englishCount > spanishCount && englishCount >= 1) return { lang: 'en', confidence: englishCount };
  if (spanishCount >= 1) return { lang: 'es', confidence: spanishCount };
  return { lang: user.preferred_language || 'es', confidence: 0 };
}

const detection = detectLanguage(userMessage);
const responseLanguage = detection.lang;

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDING
// ═══════════════════════════════════════════════════════════════════════════
const recentMessages = user.recent_messages || [];
const turnCount = recentMessages.length;

let conversationHistory = '';
if (recentMessages.length > 0) {
  conversationHistory = recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
}

const vault = user.medical_vault || {};
let vaultContext = '';
if (vault.conditions?.length) vaultContext += '\nKnown conditions: ' + vault.conditions.map(c => c.name).join(', ');
if (vault.medications?.length) vaultContext += '\nMedications: ' + vault.medications.map(m => m.name).join(', ');
if (vault.allergies?.length) vaultContext += '\nAllergies: ' + vault.allergies.map(a => a.name).join(', ');

let factsContext = '';
if (Object.keys(existingFacts).length > 0) {
  const factParts = Object.entries(existingFacts)
    .filter(([k]) => k !== 'last_updated')
    .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`);
  if (factParts.length > 0) factsContext = '\n\nWhat you know about this user:\n' + factParts.join('\n');
}

let summaryContext = '';
if (doctorSummary) {
  summaryContext = `\n\nEXISTING DOCTOR-READY SUMMARY:
• Chief concern: ${doctorSummary.chief_concern || 'Not captured'}
• Onset/duration: ${doctorSummary.onset || 'Not captured'}
• Pattern: ${doctorSummary.pattern || 'Not captured'}
• What helps: ${doctorSummary.relieves || 'Not captured'}
• What worsens: ${doctorSummary.aggravates || 'Not captured'}
• Questions for visit: ${(doctorSummary.questions || []).join(', ') || 'None yet'}`;
}

// Link offering logic
const shouldOfferLink = !linkOffered && (
  /share|compartir|doctor|send|enviar|mostrar|show/i.test(userMessage) ||
  /appointment|cita|visit|visita|tomorrow|mañana|next week|proxima semana/i.test(userMessage) ||
  (hasMiniSummary && /yes|si|sí|save|guardar|track|seguir|helpful|útil|util|continue|continuar/i.test(userMessage)) ||
  sessionCount >= 2
);

const mobileLandingPageUrl = 'https://vivebien.io/summary/' + (user.id || 'preview');
const languageInstruction = responseLanguage === 'en' ? 'RESPOND IN ENGLISH.' : 'RESPONDE EN ESPAÑOL.';
const userName = user.preferred_name || user.name || (responseLanguage === 'en' ? 'Friend' : 'Amigo');

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING PHASE INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════
let phaseInstruction = '';
switch (onboardingPhase) {
  case 'new':
    phaseInstruction = `
CURRENT PHASE: NEW USER - STEP 1
Deliver the 3-message opening:
1) "Hi 👋 I'm ViveBien." / "Hola 👋 Soy ViveBien."
2) "I'm an AI health companion. I don't replace doctors — I help you prepare for them."
3) "Tell me what's been going on, and I'll organize it into a clear note for your next visit."
After this, wait for their response.`;
    break;
  case 'greeted':
  case 'q1':
    phaseInstruction = `
CURRENT PHASE: MICRO-CAPTURE Q1
Ask: "What's been bothering you?" / "¿Qué has notado?"
If user already shared symptoms, acknowledge and ask Q2 (when did it start).`;
    break;
  case 'q2':
    phaseInstruction = `
CURRENT PHASE: MICRO-CAPTURE Q2
Ask: "When did it start?" / "¿Cuándo empezó?"
If user already mentioned timing, acknowledge and ask Q3.`;
    break;
  case 'q3':
    phaseInstruction = `
CURRENT PHASE: MICRO-CAPTURE Q3
Ask: "What makes it better or worse?" / "¿Qué lo mejora o empeora?"
After this answer, generate the mini doctor-ready summary.`;
    break;
  case 'summary':
    phaseInstruction = `
CURRENT PHASE: GENERATE MINI-SUMMARY
Output a structured mini doctor-ready summary:
- Main concern
- Duration/onset
- Pattern/severity
- What helps/worsens
- Key questions for visit (1-3)
Then ask: "If you want, I can save this. What name should I use?" / "Si quieres, puedo guardar esto. ¿Qué nombre uso?"`;
    break;
  case 'named':
    phaseInstruction = `
CURRENT PHASE: TRUST NOTE
Deliver brief trust note (2-4 lines):
- You control what you share
- You can ask me to remove info anytime
- If something sounds urgent, I'll tell you`;
    break;
  case 'trusted':
    phaseInstruction = `
CURRENT PHASE: OFFER 3 RAILS
Offer three options:
1) Keep logging symptoms/changes
2) Prepare for a visit (questions, timeline)
3) Generate a clean shareable summary`;
    break;
  default:
    phaseInstruction = `
CURRENT PHASE: ACTIVE CONVERSATION
Mode: ${conversationMode.toUpperCase()}
- CAPTURE: Gather more health context
- PREP: Help prepare for doctor visit
- SUMMARY: Update doctor-ready summary`;
}

// Urgency override
let urgencyInstruction = '';
if (urgencyDetection.level === 'high') {
  urgencyInstruction = `
⚠️ SAFETY ALERT - HIGH URGENCY
Keywords: ${urgencyDetection.keywords.join(', ')}
IMMEDIATELY:
1. Pause normal flow
2. Express concern calmly
3. Recommend calling 911 or going to ER now
4. Offer to prepare "what to tell ER" note`;
} else if (urgencyDetection.level === 'medium') {
  urgencyInstruction = `
⚠️ SAFETY ALERT - MEDIUM URGENCY
Keywords: ${urgencyDetection.keywords.join(', ')}
1. Acknowledge severity
2. Recommend seeking medical attention today
3. Continue if user chooses`;
}

let linkInstruction = shouldOfferLink ? `
LINK TRIGGER DETECTED
Offer: "I can show this as a clean summary you can share with your doctor. Want the link?"
If yes: ${mobileLandingPageUrl}` : '';

// ═══════════════════════════════════════════════════════════════════════════
// FULL SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════
const systemPrompt = `You are ViveBien, an AI health companion.
You are NOT a human. You do NOT replace doctors. You help people prepare for doctors by creating clear, doctor-ready summaries.

${languageInstruction}
${urgencyInstruction}
${phaseInstruction}
${linkInstruction}

═══ CORE RULES ═══
1. Value-first: Show usefulness quickly. No long explanations.
2. Radical honesty: Say you are AI. No fake empathy.
3. Calm clarity: Short WhatsApp messages. ONE question at a time.
4. User control: Never pressure. User chooses what to share.
5. Safety-first: If urgent symptoms, interrupt and advise care NOW.
6. No diagnosis: Never diagnose. Focus on documentation + preparation.
7. Doctor-friendly: Summaries must be concise and clinically legible.

═══ STYLE ═══
- Short lines, simple language
- Maximum ONE question per message
- Warm but not performative
- Minimal emojis (0-1), default none
- No bullet points in regular conversation
- No markdown formatting

═══ DOCTOR-READY SUMMARY FORMAT ═══
When generating a summary:
• Chief concern: [main issue]
• Onset/duration: [when/how long]
• Course/pattern: [better/worse/stable]
• Severity + impact: [0-10, daily life]
• Aggravating factors: [what worsens]
• Relieving factors: [what helps]
• Questions for visit: [1-5]

═══ USER CONTEXT ═══
User: ${userName}
Language: ${responseLanguage}
Phase: ${onboardingPhase}
Mode: ${conversationMode}
Has summary: ${hasMiniSummary}
${vaultContext}
${factsContext}
${summaryContext}`;

// User context for Claude
let userContext = conversationHistory
  ? 'Previous messages:\n' + conversationHistory + '\n\nCurrent message: ' + userMessage
  : userMessage;
if (hasImage) userContext = '[User sent an image]\n\n' + userContext;

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════
const timing = { ...(input._timing || {}), build_context_ms: Date.now() - startTime };

return [{
  json: {
    _skip: input._skip || false,
    correlationId: input.correlationId,
    _timing: timing,
    phone: input.phone,
    message: input.message,
    messageId: input.messageId,
    mediaType, mediaUrl: input.mediaUrl,
    conversationId: input.conversationId,
    accountId: input.accountId,
    senderName: input.senderName,
    timestamp: input.timestamp,
    user, intent, billing,
    systemPrompt, userContext, userMessage,
    detectedLanguage: responseLanguage,
    responseLanguage,
    currentTopic: user.current_topic || 'general',
    currentEmotionalState: user.emotional_state || 'neutral',
    turnCount,
    // ViveBien v2 fields
    onboardingPhase,
    conversationMode,
    hasMiniSummary,
    doctorSummary,
    sessionCount,
    linkOffered,
    shouldOfferLink,
    mobileLandingPageUrl,
    urgencyDetection,
    conversationContext,
    existingFacts,
    medicalVault: vault,
    userGender: user.gender || null,
    hasImage, imageBase64, imageMimeType
  }
}];
```

---

## Step 4: Update PG_SaveAll

Update `PG_SaveAll` to persist the new fields. Add these parameters first:

| Parameter | Value |
|-----------|-------|
| $32 | `{{ $json.onboardingPhase }}` |
| $33 | `{{ $json.conversationMode }}` |
| $34 | `{{ $json.hasMiniSummary }}` |
| $35 | `{{ JSON.stringify($json.doctorSummary || null) }}` |
| $36 | `{{ $json.shouldOfferLink ? true : $json.linkOffered }}` |

Then update the query - replace the conversation_state INSERT with:

```sql
-- Update conversation state WITH VIVEBIEN V2 FIELDS
INSERT INTO production.conversation_state (
  user_id, current_topic, emotional_state, needs_human, last_message_at, context,
  onboarding_phase, conversation_mode, has_mini_summary, doctor_summary, link_offered
)
VALUES (
  $1::uuid, $7, $8, $9, NOW(), $13::jsonb,
  $32, $33, $34, $35::jsonb, $36
)
ON CONFLICT (user_id) DO UPDATE SET
  current_topic = EXCLUDED.current_topic,
  emotional_state = EXCLUDED.emotional_state,
  needs_human = EXCLUDED.needs_human,
  last_message_at = NOW(),
  context = COALESCE(production.conversation_state.context, '{}'::jsonb) || EXCLUDED.context,
  onboarding_phase = EXCLUDED.onboarding_phase,
  conversation_mode = EXCLUDED.conversation_mode,
  has_mini_summary = EXCLUDED.has_mini_summary,
  doctor_summary = COALESCE(EXCLUDED.doctor_summary, production.conversation_state.doctor_summary),
  link_offered = EXCLUDED.link_offered,
  updated_at = NOW();
```

---

## Step 5: Update FN_PrepareForSave

You also need to pass the new fields through `FN_PrepareForSave`. Add to the output:

```javascript
// Add these to the return object
onboardingPhase: $json.onboardingPhase || 'new',
conversationMode: $json.conversationMode || 'capture',
hasMiniSummary: $json.hasMiniSummary || false,
doctorSummary: $json.doctorSummary || null,
linkOffered: $json.linkOffered || false,
shouldOfferLink: $json.shouldOfferLink || false,
```

---

## Testing

After deployment, test with a **new phone number** (one that hasn't messaged before):

1. Send "Hola" - should get 3-message intro
2. Describe a symptom - should ask follow-up
3. Answer Q2 and Q3 - should generate mini-summary
4. Check database: `SELECT onboarding_phase FROM production.conversation_state WHERE user_id = '...'`

---

## Rollback

If issues occur, revert FN_BuildContext to the previous version. The new database columns won't break the old code (they have defaults).
