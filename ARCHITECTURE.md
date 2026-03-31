# CLEAN ARCHITECTURE - PAYMENT & AI FIX GUIDE

## 🟢 SYSTEM DESIGN SUMMARY

This document outlines the **4-layer architecture** that fixes the payment system, prevents AI hallucination, and ensures data isolation.

### Problem Overview
1. ❌ AI generates fake payment links (hallucination)
2. ❌ Chat page goes blank (undefined state crash)
3. ❌ Manual payment config table doesn't exist in DB yet
4. ❌ Data might leak across tenants (no user_id filtering)
5. ❌ Wrong account details shown (cached/global config)

### Solution: 4-Layer Clean Architecture

---

## **LAYER A: AI CHAT ENGINE** (No Business Logic)

**File:** `supabase/functions/chat/index.ts`

### Rules
- ✅ ONLY handles conversation
- ✅ NOT allowed to generate payment links
- ✅ NOT allowed to guess account details
- ✅ Updates system prompt with strict PAYMENT RULES section

### What Changed
```typescript
// NEW - System prompt now includes:
PAYMENT RULES (CRITICAL - DO NOT VIOLATE):
⚠️ YOU CANNOT AND MUST NOT:
- Generate payment links or URLs
- Invent or guess bank account details
- Fabricate Paystack/Stripe/payment information

✅ INSTEAD, YOU MUST:
- Tell user "Let me process your order"
- Confirm customer details
- Trust the system to show real payment options
```

### How It Works
1. User sends message → AI processes via chat function
2. AI ONLY uses provided product/knowledge data
3. If order mentioned → AI confirms details only
4. **Never calls payment functions directly**

---

## **LAYER B: PAYMENT ENGINE** (All Payment Logic)

**File:** `supabase/functions/payment-engine.ts`

### Purpose
- Single source of truth for ALL payment operations
- AI cannot touch this layer directly
- Backend-only, never exposed to frontend

### Key Functions

#### `getPaymentInstructions(supabase, siteId)`
Returns payment method for a site:
```typescript
// Returns one of:
{
  type: "gateway",
  gateway: { provider: "paystack" }
}
// OR
{
  type: "manual",
  manual: {
    bank_name: "First Bank",
    account_name: "Business Name",
    account_number: "1234567890",
    instructions: "..."
  }
}
// OR
{
  type: "none",
  error: "No payment config"
}
```

#### `createPaystackLink(supabase, siteId, amount, email)`
- Creates REAL Paystack payment link
- Reads actual secret_key from DB
- Never invoked by AI (backend only)

#### `validateSiteOwnership(supabase, siteId, userId)`
- Data isolation check
- Prevents cross-tenant access
- Called in every user-facing operation

### Important
- ✅ Reads from actual database tables
- ✅ No fabrication of financial data
- ✅ All operations are site_id filtered

---

## **LAYER C: DATA ACCESS LAYER** (Read-Only)

**File:** `supabase/functions/data-access-layer.ts`

### Rule
**Every query MUST filter by user_id automatically**

### Key Functions

#### `getProductsForSite(supabase, context)`
```typescript
// First: Validates user owns site
// Then: Returns products only for that site
// BLOCKS: Cross-tenant access
```

#### `getPaymentConfigForSite(supabase, context)`
```typescript
// User can ONLY see their own site's payment config
// Ownership validated first
// No global/shared configs
```

#### `getOrdersForSite(supabase, context)`
```typescript
// User can ONLY see orders for their sites
// Same site_id filtering pattern
```

#### `getChatHistory(supabase, conversationId, siteId)`
```typescript
// Validates conversation belongs to this site
// Prevents chat leaks across sites
```

### Pattern (Use for all new queries)
```typescript
// 1. VALIDATE OWNERSHIP FIRST
const { data: ownership } = await supabase
  .from("sites")
  .select("id")
  .eq("id", siteId)
  .eq("user_id", userId)
  .single();

if (!ownership) {
  throw new Error("DATA LEAK BLOCKED: Unauthorized");
}

// 2. THEN FETCH DATA (safe because verified)
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("site_id", siteId);

return data;
```

---

## **LAYER D: UI/DASHBOARD LAYER** (Safe Rendering)

**File:** `src/lib/safe-render.tsx`

### Purpose
- Prevents blank page crashes
- Safe state handling
- Proper loading/error boundaries

### Key Utilities

#### `SafeDataWrapper`
```typescript
<SafeDataWrapper
  isLoading={loading}
  error={error}
  data={messages}
  loadingFallback={<Loader />}
  errorFallback={<Error />}
  emptyFallback={<Empty />}
>
  {/* Render safe data */}
</SafeDataWrapper>
```

#### `renderSafeMessages`
```typescript
// WRONG ❌
{messages.map(m => <div>{m.content}</div>)}

// CORRECT ✅
{renderSafeMessages(messages, (m, i) => (
  <div key={i}>{m.content}</div>
))}
```

#### `validateRequiredFields`
```typescript
const { valid, missingFields } = validateRequiredFields(
  data,
  ["name", "email", "payment_method"]
);

if (!valid) {
  return <div>Missing: {missingFields.join(", ")}</div>;
}
```

### Usage in Components
```typescript
const ChatInterface = ({ messages }) => {
  // ALWAYS declare state with defaults
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ALWAYS add guards
  if (loading) return <div>Loading chat...</div>;
  if (error) return <div>Error loading chat</div>;
  if (!msgs?.length) return <div>No messages yet</div>;

  // NOW safe to render
  return (
    <div>
      {msgs.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
    </div>
  );
};
```

---

## 🔴 IMPLEMENTING THE FIX - STEP BY STEP

### STEP 1: Apply Database Migration
1. Go to Supabase Dashboard
2. SQL Editor → Run `APPLY_MIGRATION.sql`
3. Creates:
   - `manual_payment_config` table
   - `payment_confirmations` table
   - All RLS policies
   - All triggers

### STEP 2: Update Chat Function
✅ Already done in `supabase/functions/chat/index.ts`
- System prompt now forbids payment generation
- Added explicit PAYMENT RULES section
- No changes to core logic needed

### STEP 3: Add Payment Engine
✅ Already created: `supabase/functions/payment-engine.ts`
- Place in Supabase Functions
- Export functions for use in other endpoints
- Test with: `curl -X POST https://your-project.supabase.co/functions/v1/chat`

### STEP 4: Add Data Access Layer
✅ Already created: `supabase/functions/data-access-layer.ts`
- All new queries must use these functions
- Enforce site_id + user_id filtering
- Prevents data leaks automatically

### STEP 5: Update Frontend Components
✅ Already created: `src/lib/safe-render.tsx`
- Use `SafeDataWrapper` in all pages
- Add proper loading states
- Use `renderSafeMessages` in chat components
- Test locally with blank data states

### STEP 6: Update Existing Queries
For every query in frontend that fetches data:

```typescript
// BEFORE ❌
const { data: payments } = await supabase
  .from("payment_configs")
  .select("*");

// AFTER ✅
const { data: payments } = await supabase
  .from("payment_configs")
  .select("*")
  .eq("site_id", currentSiteId)  // ADD THIS
  .eq("is_active", true);
```

---

## 🧪 TESTING THE FIX

### Test 1: Verify AI Cannot Generate Payments
```bash
# Try asking AI for payment link
Chat: "Send me a payment link for this order"

# Expected: "Let me process your order. Our secure system will handle payment."
# NOT: "Here's a fake Paystack link..."
```

### Test 2: Verify Data Isolation
```typescript
// Login as User A, view User B's site
// Should get error: "DATA LEAK BLOCKED: Unauthorized"
```

### Test 3: Verify Chat Doesn't Crash
```bash
# Open chat with empty messages
# Should show: "👋 Welcome! What are you looking to buy?"
# NOT: Blank page or error
```

### Test 4: Verify Payment Config Works
```bash
# Add manual payment config for site
# Add product
# Start chat
# User should see real bank details when ordering (not AI-generated)
```

---

## 📋 DATABASE REQUIREMENTS

You MUST apply the migration first:

**Tables Created:**
- `manual_payment_config` - Bank details per site
- `payment_confirmations` - Payment proof reviews

**Tables Modified:**
- `sites` - Added slug, show_chat_on_landing_page, etc.

**No existing data is deleted or modified** ✅

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Run migration in Supabase
- [ ] Deploy payment-engine.ts to Functions
- [ ] Deploy data-access-layer.ts to Functions
- [ ] Update chat/index.ts with new system prompt
- [ ] Add safe-render.tsx to frontend
- [ ] Update all data queries to use data-access-layer
- [ ] Test chat with empty messages
- [ ] Test payment flow (gateway + manual)
- [ ] Verify data isolation (cross-tenant access blocked)
- [ ] Test AI doesn't generate payment links

---

## ⚠️ CRITICAL RULES

1. **DATABASE IS IMMUTABLE**
   - Never alter existing table structure
   - Never delete user columns
   - Only add new tables

2. **PAYMENT LOGIC IS CENTRALIZED**
   - All payment operations in Layer B only
   - AI cannot access payment functions
   - Backend validates everything

3. **DATA IS ISOLATED BY USER**
   - Every query filters by user_id
   - Cross-tenant access blocked
   - Validation runs first, data fetch second

4. **UI NEVER CRASHES**
   - Safe state guards everywhere
   - Loading states always shown
   - Error boundaries in place

---

## 📚 REFERENCE

- Layer A (AI): Conversation only, follows system prompt
- Layer B (Payments): Single source of truth for money operations
- Layer C (Data): All queries filtered by user/site
- Layer D (UI): Safe rendering, no undefined crashes

**Result:** 
- ✅ AI cannot hallucinate payments
- ✅ No data leaks
- ✅ No blank page crashes
- ✅ Real payment links only
- ✅ Database integrity maintained
