# AI study chat

Implemented 2026-11-19. Signed-in `/chat` provides saved conversations and follow-up questions. “Explain deeper” uses the same backend and allowance.

## Provider and sessions

OpenCode Go, using `https://opencode.ai/zen/go/v1/chat/completions` with Bearer authentication. Default model: `mimo-v2.6-flash`, selected by the owner after comparing the live model catalog. Listed input/output prices are $0.14/$0.28 per million tokens; Go consumes shared subscription allowance rather than billing each question separately within its limits. No automatic paid fallback or model substitution is implemented by this app. Extra Usage is controlled separately in OpenCode Console.

Muse Spark 1.3 Contributor lists lower token prices, but allows training on request data. The owner chose MiMo Flash instead; its catalog entry lists no training and zero retention. Recheck model terms/pricing when changing models. Go documentation describes coding-agent clients; this application identifies itself honestly as an educational study chat. Provider acceptance and availability are outside the app's control.

Each conversation has a server-generated UUID, reused in `x-opencode-session` on every turn. This supports routing and prompt caching. Conversation memory is our responsibility: completed turns are stored in Supabase and the last six turns are included with each question. Separate chats have separate IDs; users cannot select other users' conversations. Explain requests use their request UUID as their session ID.

## Quota and reliability

- 10 successful answers per Clerk account per UTC calendar week, shared by chat, follow-ups and Explain deeper. Resets Monday 00:00 UTC.
- A Postgres reservation function serializes quota decisions across Vercel instances. Pending reservations count toward quota; one generation can be in flight per user.
- Request UUIDs make retries idempotent: a completed request returns its existing answer without a second generation or charge.
- Provider timeout: 45 seconds. Failed requests release quota. Abandoned reservations expire after two minutes and cannot subsequently complete.
- At most five reserved attempts per user per minute, including failed attempts.
- A shared 1,000-answer weekly safety cap is enforced in the database. This is not a dollar budget; provider billing/Extra Usage needs a separate Console cap.
- Deleting a conversation redacts message content but preserves its usage count. Deletion and reservation share a transaction lock.
- Shared explanation cache is intentionally bypassed so every generated answer uses the same quota rules. Legacy ai_cache/ai_usage tables remain for existing feedback and compatibility.

## Security and grounding

Clerk authenticates every API call. Next.js derives the owner ID from the verified session, never request JSON. The Supabase service key and OpenCode key live only in server modules guarded by `server-only`. No provider credentials or derived access tokens reach the browser. Tables have RLS and no public/anon/authenticated grants; only the server service role can access tables/RPCs. Functions use SECURITY INVOKER with a fixed empty search path.

Mutation requests require same-origin JSON and a bounded 16 KB body. Questions are limited to 3,000 characters and replies to 1,200 output tokens. Model and destination are server-controlled; credentials can only be sent to known OpenCode API paths, and redirects are rejected. Raw provider errors, keys and headers are not logged or returned. Markdown images and model-generated links are disabled; related study links are generated from trusted repository content. AI has no tools or access to environment variables.

Chat retrieves up to three matching published answers. The system prompt separates excerpts from instructions, distinguishes general knowledge from supplied references, declines unrelated topics and patient-specific care, and labels all output AI-generated. Retrieval is lexical, not a guarantee of medical accuracy. The UI links the retrieved sources and asks users to verify answers.

## Production setup

Vercel → areyoureadydoc → Settings → Environment Variables, Production:

| Variable | Value |
|---|---|
| OPENCODE_GO_API_KEY | Your sensitive secret (never paste in chat or commit) |
| OPENCODE_GO_BASE_URL | https://opencode.ai/zen/go/v1 |
| AI_MODEL | mimo-v2.6-flash |
| AI_ENABLED | true |
| NEXT_PUBLIC_SUPABASE_URL | Existing project URL |
| SUPABASE_SERVICE_ROLE_KEY | Existing sensitive service key |

Apply `supabase/migrations/*_weekly_ai_chat.sql` before enabling and redeploy after environment changes. `AI_DAILY_LIMIT` is obsolete; the weekly limit is enforced as 10 in SQL. Set `AI_ENABLED=false` and redeploy to disable generation. Saved chats remain readable.

## Acceptance checks

1. Signed-out `/chat` redirects to sign-in; all AI APIs return 401 without a session.
2. Sign in, select Ask AI, ask a question and send a follow-up. Reload and reopen the saved conversation.
3. The counter decreases once per successful question; a replay of the same request ID does not decrease it again.
4. At 10 requests the next is rejected. A second account has its own allowance and cannot read/use/delete the first account's conversation.
5. Delete a conversation: text disappears and the weekly allowance stays unchanged.
6. Inspect browser requests: they call only our AI API; no OpenCode or Supabase service key should appear.
7. With provider disabled/unavailable, failures are contained and published answers remain accessible.

Automated database tests live in `scripts/test-ai-quota.sql`; run inside a transaction and roll back all fixtures. `npm run test:ai` checks request validation, provider destination and session headers, and credential redaction. Build/type checks and `scripts/check-public-access.mjs` cover integration boundaries. A complete real-user Google login and browser interaction still need user verification.
