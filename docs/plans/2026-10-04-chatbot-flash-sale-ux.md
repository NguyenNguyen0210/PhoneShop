# Chatbot Flash Sale Rich UX & Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement rich Flash Sale cards, strike-through pricing, source badges, and quick chips in the storefront Chatbot widget, while verifying backend grounding on production.

**Architecture:** Frontend `chatbotService.ts` receives typed product variants with `flashPrice` and `compareAtPrice`. `AiChatWidget.tsx` renders dynamic badges (`⚡ Flash Sale`, `🏷️ Voucher`), highlighted price comparison, and clickable suggestions. Backend grounding is verified against Render live deployment.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, Vite, NestJS, Prisma.

---

### Task 1: Update Frontend Chatbot Types & Helpers

**Files:**
- Modify: `frontend/src/services/chatbotService.ts`

- [ ] **Step 1: Extend ChatbotProduct and ChatbotVariant interfaces**
Add `variants`, `compareAtPrice`, `flashPrice`, `specsSummary`, `warrantyMonths` to `ChatbotProduct` and `ChatbotVariant`.

- [ ] **Step 2: Add helper `getFlashSaleInfo(product)`**
Helper computes if any variant or product has an active flash sale price, returning the lowest flash price and original price.

- [ ] **Step 3: Run TypeScript compiler check on frontend**
Run: `npm run type-check` or `npx tsc --noEmit` in `frontend/`
Expected: 0 errors.

- [ ] **Step 4: Commit**
`git commit -m "feat(frontend): extend chatbot product types with flash sale pricing"`

---

### Task 2: Enhance AiChatWidget with Flash Sale Badges, Pricing & Quick Chips

**Files:**
- Modify: `frontend/src/components/storefront/AiChatWidget.tsx`

- [ ] **Step 1: Add default suggestions for Flash Sale & Vouchers**
Add `'⚡ Flash sale nào đang chạy?'` and `'🏷️ Voucher dùng được hôm nay?'` to `DEFAULT_SUGGESTIONS`.

- [ ] **Step 2: Preserve and display sources badges**
Include `sources?: string[]` in `UiMessage`. Render badges:
- `flash-sale`: `⚡ Flash Sale`
- `voucher`: `🏷️ Voucher`
- `warranty`: `🛡️ Bảo hành`

- [ ] **Step 3: Render rich product card with Flash Sale badge and strike-through price**
When a product has flash pricing, display `⚡ Flash Sale` tag, bold `rose-600` price, and line-through original price.

- [ ] **Step 4: Run Vite build / type-check**
Run: `npm run build` in `frontend/`
Expected: Build succeeds.

- [ ] **Step 5: Commit**
`git commit -m "feat(frontend): rich flash sale badges, strikethrough price, and sources in ai chat widget"`

---

### Task 3: Verify Live Production Deployment & End-to-End Chatbot Response

**Files:**
- Test backend live: `https://phoneshop-api.onrender.com/api/chatbot/ask`

- [ ] **Step 1: Check Render deployment status**
Verify deploy `dep-db170su0tbcc739r3uhg` reaches `live`.

- [ ] **Step 2: Test live query for Flash Sale**
Send `POST /api/chatbot/ask` with `{"message": "sản phẩm flash sale"}`.
Verify returned `products` array contains active flash sale products and `reply` lists valid products and discounts.

- [ ] **Step 3: Commit and merge all changes to `main` and deploy frontend**
Sync branches, push to `main` to trigger automated deployment.
