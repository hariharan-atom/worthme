# WorthMe

WorthMe is a Next.js entertainment experience: navbar quiz → optional photo and profile → details → a result card with a shareable link and PNG download. It uses 100 prewritten result combinations, with no AI or payment service.

## Run locally

Create `.env.local` with these server-only variables:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
```

Run `supabase/schema.sql` in the Supabase SQL Editor, then:

```sh
npm install
npm run dev
```

Omit **both** Supabase variables to use portable preview links. A partial configuration reports a service error. Browser session storage is optional; a blocked browser storage API does not prevent opening results.

## Deploy on Vercel

Use the **Next.js** framework preset, repository root as the root directory, and automatic output directory. Set both Supabase variables for Production (and separately for Preview if wanted), then redeploy. Never prefix the service-role key with `NEXT_PUBLIC_`. No AI, payment, or public site URL variable is required by this build.

## Verify

```sh
npm test
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
npm audit
```

The browser suite runs an isolated local production server on port 3100 with Supabase disabled. It tests the real portable-link flow, validates API inputs and request limits, and mocks persisted-result reads. It **does not verify a live Supabase deployment** or create remote database records. Screenshots/downloads and failed traces are saved under `test-results/`.

## Data and sharing

- New verdicts never embed raw questionnaire answers.
- A public card includes the name, optional photo, scores, verdict, and suggestion. Anyone with its link can view it; it is not authenticated/private storage.
- Photos are compressed in the browser and the stored data-URL string must be at most 100 KB.
- The API caps request bodies at 120 KB and validates the same field constraints as the form.
- Without Supabase, the share link carries a validated portable result, excluding the photo. These portable results are user-editable and are not verified records.
- Existing cards created before this audit keep their original verdict text.
- Payment, authentication, self-service deletion, and production abuse/rate controls are not implemented. Configure suitable traffic limits in the deployment before advertising broadly.

## Implementation

`components/quiz-dialog.tsx` owns the native two-step dialog. `lib/worth.ts` validates answers and selects the result. `lib/profile.ts` prepares uploads, `lib/share.ts` validates portable links, and `lib/download-card.ts` draws downloadable cards. The server alone uses Supabase credentials.

The PostCSS override pins a patched 8.x release without upgrading the Next.js major version.

## Website review

See [WEBSITE_REVIEW.md](WEBSITE_REVIEW.md) for the latest fixes, design changes, verification scope, and remaining limits.
