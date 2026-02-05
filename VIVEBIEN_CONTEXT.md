# ViveBien Project Context for Claude

**READ THIS FIRST** - This file gives you everything you need to continue working on ViveBien without asking setup questions.

---

## What is ViveBien?

ViveBien is a WhatsApp-based AI health companion that helps users track health between doctor visits. The core mission is: **"Doctor-ready summaries between visits"**

**Multilingual**: ViveBien auto-detects the user's language and responds in that language. Not limited to Spanish speakers.

Users message ViveBien on WhatsApp → Chatwoot receives it → n8n workflow processes it → Claude generates response → Response sent back via Chatwoot.

---

## Your Access (What You Can Do)

### 1. n8n Workflows (via MCP)
You have full access to search, view, and execute n8n workflows:
```
mcp__d2e129e6-72a5-4f0d-b22e-1490f2f5bfa0__search_workflows
mcp__d2e129e6-72a5-4f0d-b22e-1490f2f5bfa0__get_workflow_details
mcp__d2e129e6-72a5-4f0d-b22e-1490f2f5bfa0__execute_workflow
```

### 2. Database Access (via DevOps Gateway)
Run any SQL query using this pattern:
```javascript
execute_workflow({
  workflowId: "dEoR_KiQ2LQYAE7Q9Jv9E",
  inputs: {
    type: "webhook",
    webhookData: {
      body: {
        tool: "database",
        query: "YOUR SQL HERE"
      }
    }
  }
})
```

### 3. File System
Read/write files in the user's workspace folder: `/sessions/*/mnt/vivebien-dashboard-local/`

---

## Key Workflows

| Workflow | ID | Purpose |
|----------|-----|---------|
| ViveBien_MVP_v26_PROD | R6DctMTLfsvtN3AbYIkSV | Production - handles all WhatsApp messages |
| ViveBien_MVP_v24_STAGE | 4CHim8kQbKrfaIuRpjtH4 | Staging environment |
| Claude_DevOps_Gateway_v3 | dEoR_KiQ2LQYAE7Q9Jv9E | Database queries (use this!) |
| ViveBien_AutoTest | HplGHg_vg86-bivZ77qm6 | Automated testing (webhook-triggered) |

---

## Production Workflow Key Nodes

**ViveBien_MVP_v26_PROD** flow:
1. **Chatwoot_Webhook** - Receives WhatsApp messages
2. **FN_Normalize** - Normalizes input data
3. **PG_LoadUser** - Loads/creates user, billing, conversation state
4. **FN_ClassifyIntent** - Classifies message intent
5. **FN_BuildContext** - **IMPORTANT**: Builds system prompt for Claude
6. **Claude_Respond** - HTTP request to Claude API
7. **FN_ProcessResponse** - Processes Claude's response
8. **PG_SaveAll** - Saves everything to database
9. **HTTP_SendChatwoot** - Sends response back to WhatsApp

---

## Database Schema (production.*)

### production.users
- id (UUID), phone, preferred_name, preferred_language, chatwoot_conversation_id

### production.conversation_state
- user_id, current_topic, emotional_state, needs_human, context (JSONB)
- **ViveBien v2 fields**: onboarding_phase, conversation_mode, has_mini_summary, doctor_summary, session_count, link_offered

### production.messages
- user_id, role ('user'/'assistant'), content, metadata (JSONB)

### production.billing_accounts
- user_id, subscription_status, subscription_plan, credits_balance

---

## Current Implementation Status (as of Jan 30, 2026)

### ✅ COMPLETED
- PG_SaveAll updated with ViveBien v2 fields (31 query parameters)
- Database migration applied (new columns in conversation_state)
- Basic ViveBien v2 identity working (changed from "CONFIANZA" to "ViveBien")
- Test user cleanup working

### ⚠️ NEEDS WORK
- **Onboarding too long**: User complained "asking too many questions"
  - Current: 7-step onboarding flow
  - User wants: Shorter (1-3 questions max)
  - Action needed: Update system prompt in FN_BuildContext

- **Multilingual support**: System should auto-detect user's language and respond accordingly
  - NOT Spanish-only anymore - serve everyone
  - Action needed: Update system prompt in FN_BuildContext to detect language from first message

- **Onboarding phase not dynamic**: Currently hardcoded to 'new', 'capture', false, false in PG_SaveAll
  - Need to make these values come from FN_ProcessResponse output

### 📋 PENDING DECISIONS
- How many onboarding questions? (1, 3, or skip entirely)

---

## Common Tasks

### Clean up a test user
```javascript
// First find the user
execute_workflow with query:
"SELECT id, phone, preferred_name FROM production.users WHERE phone = '+12017370113'"

// Then delete (use the UUID from above)
execute_workflow with query:
"DELETE FROM production.messages WHERE user_id = '<uuid>';
DELETE FROM production.conversation_state WHERE user_id = '<uuid>';
DELETE FROM production.billing_accounts WHERE user_id = '<uuid>';
DELETE FROM production.users WHERE id = '<uuid>';"
```

### Check a user's state
```sql
SELECT u.id, u.phone, u.preferred_name,
       cs.onboarding_phase, cs.conversation_mode, cs.has_mini_summary
FROM production.users u
LEFT JOIN production.conversation_state cs ON u.id = cs.user_id
WHERE u.phone = '+12017370113';
```

### View recent messages
```sql
SELECT m.role, m.content, m.created_at
FROM production.messages m
JOIN production.users u ON m.user_id = u.id
WHERE u.phone = '+12017370113'
ORDER BY m.created_at DESC LIMIT 10;
```

---

## Test Information

- **Jeff's test phone**: +12017370113 (always include + prefix)
- **n8n URL**: https://projecto-1-n8n.yydhsb.easypanel.host/

---

## Files in This Project

- `VIVEBIEN_CONTEXT.md` - This file (handoff context)
- `DEPLOY_VIVEBIEN_V2.md` - Full deployment guide with SQL and code
- `ViveBien_SystemPrompt_v2.txt` - The new system prompt text

---

## What To Do Next

1. **Ask user**: "How many onboarding questions do you want - 1, 3, or skip entirely?"
2. **Update FN_BuildContext** in ViveBien_MVP_v26_PROD with simplified onboarding
3. **Make onboarding transitions dynamic** in FN_ProcessResponse → PG_SaveAll
4. **Test** by cleaning up +12017370113 and sending "Hola"

---

## Working Style

- Jeff prefers to make n8n updates himself for speed - provide exact code/queries to paste
- Use the database gateway to check state rather than asking Jeff to run queries
- Don't ask "what access do I have" - you have n8n + database access as documented above
- Don't ask "what are we working on" - continue from the NEEDS WORK section above
