# WorthMe™

A fast, mobile-first entertainment experience: short questionnaire → free launch-pass reveal → a 100-point result → a shareable card/link. Payments and AI are intentionally absent for this preview.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
3. Put its Project URL in `SUPABASE_URL` and its **server-only** service-role key in `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `npm install`, then `npm run dev`.

Without Supabase, the original result still opens using its compact public payload in the link; configure Supabase before launch for clean, durable share links.

## Vercel

Import the GitHub repository in Vercel, set the three variables from `.env.local` (including `NEXT_PUBLIC_SITE_URL` to the deployed URL), then deploy. Never expose `SUPABASE_SERVICE_ROLE_KEY` with the `NEXT_PUBLIC_` prefix.

## Privacy & product decisions

- Only the display result is persisted; raw form answers are not written to the database. An optional profile photo is browser-compressed and the stored data payload is limited to 100 KB.
- The score is deterministic and entertainment-only—there is no AI provider in this build.
- The product is 18+ and intentionally makes no real financial, employment, psychological, or human-value claim.
- A full production launch still needs terms, privacy, retention/deletion handling, Razorpay integration, rate limiting, analytics consent, and legal review appropriate to launch markets.
