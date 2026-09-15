# Foundly — Supabase Backend

Foundly runs entirely on **Supabase** (Postgres + Auth) plus **EmailJS**
for outbound email — there is no separate backend server. This README
covers the full step-by-step Supabase setup, the EmailJS setup, and what
changed in this update.

> **New here?** Skip to [Step-by-step: connecting your Supabase
> project](#step-by-step-connecting-your-supabase-project) — it walks
> through everything from creating the project to signing into the admin
> dashboard, in order.

---

## What's new in this update

This update turns Foundly from an anonymous, single-page reporting tool
into an accounts-based app that matches the real Lost & Found office
workflow:

1. **Real user accounts.** Register, log in/out, reset your password, and
   edit your profile — powered by Supabase Auth plus a new `profiles`
   table. See [`0003_accounts_and_workflow.sql`](supabase/migrations/0003_accounts_and_workflow.sql).
2. **Only lost items are self-reported.** The public "Report Found Item"
   flow is gone. Only the Foundly office (admin) creates Found listings —
   matching how the department actually works. See **How it works**
   below.
3. **Both Lost and Found are public, but contact info never is.** Every
   active report — lost or found — is visible to anyone browsing the
   site. The reporter's contact email is not. It's readable only by the
   report's own owner (via "My Reports") and by admins. This is enforced
   at the database level (see **Security model** below), not just hidden
   in the UI.
4. **The "come identify it" → "confirm handover" → "resolved" workflow.**
   Admins can link a Lost report to the Found report they believe matches
   it, email the person who lost it inviting them to come identify it in
   person, and — once confirmed — resolve both reports and notify
   *both* the person who lost it and whoever found it (if we have their
   contact).
5. **The self-service edit link now expires at resolution.** Once a report
   is resolved or deleted, its private edit link stops accepting changes.
6. **Bookmarks and "Report Suspicious"** are both new, and both tied to
   the new account system (bookmarks) or open to everyone (suspicious
   reports, so anonymous visitors can still flag something without an
   account).
7. **Photos are gone — categories use icons instead.** Every item now
   shows a category icon (see `getCategoryIcon()` in `js/foundly-data.js`)
   rather than an uploaded photo. This removes the old Storage bucket
   entirely.
8. **Everything lives on one page again — but properly.** `lost.html`,
   `found.html`, and `bookmarks.html` have been folded back into
   `index.html` as **view tabs** (All / Lost / Found / Bookmarks) inside
   the same browse section — no page navigation needed to switch between
   them. Reporting a lost item is now a **popup** (`#reportModal`)
   reachable from the sticky nav's "Report Lost" button or the "Report a
   Lost Item Now" call-to-action, instead of a separate page/section.
9. **Login is the front door.** Opening Foundly now always starts with
   **log in → how-it-works → homepage**. `index.html` (and every other
   page) requires an active session; if you're not logged in you're sent
   straight to `login.html`, and every successful login/registration
   routes through `how-it-works.html` before landing you on the
   homepage.
10. **Sticky nav + a little polish.** The top nav now stays pinned while
    you scroll (frosted-glass background), the "Report Lost" button has
    its own accent styling, nav buttons are more compact, the homepage has
    a subtle background tint, and successful account actions (register,
    log in, reset/change password) show a brief animated checkmark instead
    of just a static message.
11. **Admin dashboard: Users tab.** View every account, see a user's own
   reports, suspend/reactivate an account, or remove one entirely.
   Dashboard stats now include **Total Users** alongside Total / Lost /
   Found / Resolved reports.

### How it works (the workflow this update encodes)

```
1. A user registers/logs in and reports a Lost item.
   → They're advised to leave out one identifying detail on purpose.
   → They immediately get an email with their report + a private edit link.

2. The Foundly office receives a physical item at the department and
   lists it as a Found item themselves (public users cannot do this).

3. Both Lost and Found listings are browsable by any logged-in user —
   but the reporter's/finder's contact email is never shown publicly.

4. If the office believes a Lost report matches a Found item, they link
   the two ("match") and can email the person who lost it, inviting them
   to come identify it in person.

5. The person comes to the office and describes the item fully —
   including the detail they left out of their report.

6. The office confirms the handover and marks it resolved. Both the
   person who lost it and whoever found it (if we have their contact)
   get a resolution email. The private edit link for that report stops
   working.
```

This is also shown to every user as a required screen (`how-it-works.html`)
immediately after they log in or register, and is reachable any time from
the nav. In fact, the whole site now works this way: opening Foundly for
the first time always goes **login → how-it-works → homepage** — every
page requires an active session (enforced by `initSiteNav({ requireAuth:
true })` in `js/site-nav.js`), so there's no logged-out browsing mode
to reason about.

---

## Security model (why contact info actually stays private)

Hiding a field in the UI isn't real security — anyone can open dev tools
and call the API directly. So the `contact` column is protected at the
database level:

- Direct `select` access to the `reports` table is revoked for everyone
  except admins (enforced by a Row Level Security policy that checks
  `admin_users`).
- Public browsing goes through `list_public_reports()` / `get_public_report()`
  — Postgres functions (`SECURITY DEFINER`) that simply never select the
  `contact` column in the first place. There's no way to trick them into
  returning it.
- A signed-in user's own reports (with contact included, since it's their
  own data) come from `list_my_reports()`, which filters by
  `owner_id = auth.uid()` server-side.
- The token-gated edit page (`edit.html`) proves ownership via the emailed
  token, not a login — `get_report_by_token()` checks the token before
  returning anything, contact included.
- Admins see everything through the normal admin-only table policy.

Same pattern as the original token-based edit links: **capability through
a `SECURITY DEFINER` function that does its own explicit check**, not
through hoping the client behaves.

---

## What's in this project

```
public/                       → static site, deploy anywhere (Netlify, Vercel, GitHub Pages, etc.)
  index.html                   → the whole public site in one page: hero, how-it-works summary,
                                  the lost-item guide + found-item guide, and the unified browse
                                  section (All / Lost / Found / Bookmarks view tabs — no separate
                                  pages), safety tips, FAQ, contact, privacy. Reporting a lost item
                                  opens as a popup from here. Requires login — see below.
  register.html / login.html   → account creation / sign in
  forgot-password.html          → request a password-reset email
  reset-password.html           → set a new password (landing page for the emailed link)
  profile.html                  → view/edit your name & phone, change password
  my-reports.html               → your own lost reports — edit / resolve / delete (no token needed,
                                  you're logged in as the owner)
  how-it-works.html             → full walkthrough, shown right after every login/registration
  edit.html                     → token-gated self-service edit/resolve/delete (locked once resolved)
  console-<random>.html         → admin dashboard — deliberately NOT linked from anywhere;
                                  only reachable if you have the exact URL (see below)
  foundly.css
  js/
    supabase-config.js          → YOUR project's URL + anon key (fill this in)
    supabase-init.js            → shared client bootstrap
    auth.js                     → register/login/logout/reset-password/profile helpers
    site-nav.js                 → shared navbar auth-state + suspended-account + login-gate enforcement
    success-animation.js        → the small animated-checkmark overlay used after account actions
    foundly-data.js             → all Postgres/RPC calls, category icons, email senders, UI helpers
    emailjs-config.js           → YOUR EmailJS service/template/public-key IDs (fill this in)
    home.js                     → the unified homepage: view tabs, filters, bookmarks, report
                                  popup, suspicious reports, FAQ accordion
    register.js / login.js / forgot-password.js / reset-password.js / profile.js / how-it-works.js
    my-reports.js
    edit.js                     → edit-link page logic
    admin.js                    → admin dashboard logic

supabase/
  migrations/
    0001_init.sql                → original tables, RLS, storage bucket, RPC functions
    0002_fix_image_clear.sql     → bugfix from a previous update (image clearing)
    0003_accounts_and_workflow.sql → accounts, hidden contact, matching/identify/resolve workflow,
                                      bookmarks, suspicious reports, admin user management
```

### Finding the admin dashboard

There's no "Admin" link anywhere on the site — on purpose. The file is
named something like `console-7f3ae21c.html` instead of `admin.html`.
Bookmark that exact URL somewhere private. This is defense-in-depth, not
the real security boundary — Supabase Auth + the `admin_users` table is
what actually gates access (see Step 5 below); the obscure filename just
stops a random visitor from stumbling onto a login screen. Rename the file
any time to rotate it — nothing else references it by name.

---

## Step-by-step: connecting your Supabase project

### 1. Create the project
Go to [supabase.com](https://supabase.com) → New Project. Pick a name,
a database password (save it somewhere safe), and a region. Wait a
minute or two for provisioning.

### 2. Run the three migrations, in order
Dashboard → **SQL Editor** → New query.

1. Paste the entire contents of `supabase/migrations/0001_init.sql` → **Run**.
2. New query → paste `supabase/migrations/0002_fix_image_clear.sql` → **Run**.
3. New query → paste `supabase/migrations/0003_accounts_and_workflow.sql` → **Run**.

(CLI alternative: `npx supabase login`, `npx supabase link --project-ref
YOUR_PROJECT_REF`, then `npx supabase db push`.)

Migration 3 is the big one for this update — it adds `profiles`,
`bookmarks`, `suspicious_reports`, the matching/identify-email columns on
`reports`, and every new RPC function described above.

### 3. Get your API credentials
Dashboard → **Project Settings → API**. Copy:
- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **anon / public key** (a long JWT — safe to expose in client-side code)

Paste both into `public/js/supabase-config.js`:
```js
export const SUPABASE_URL = "https://abcdefgh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

### 4. Create your admin account
The easiest way is to use the site itself:
1. Serve the site locally (see Step 6) and register a normal account
   through `register.html` using the email you want to be your admin.
2. Or, Dashboard → **Authentication → Users → Add user** instead, and set
   an email + password directly (leave "Auto Confirm User" on for a quick
   start).

Either way, migration 3's trigger automatically creates a matching row in
`public.profiles` for the account.

### 5. Grant that account admin access
Dashboard → **SQL Editor** → run:
```sql
insert into public.admin_users (user_id)
values ('paste-the-user-uuid-here');
```
Find the UUID on **Authentication → Users** (click the user, copy the
"UID" field). That's it — no service keys, no custom claims, just a row in
a table. To revoke admin access later, delete that row. This account can
now sign in at your `console-<random>.html` file.

### 6. Run it locally to test
These are static files using ES module imports, so they need to be served
over HTTP (not opened as `file://`). From the `public/` folder:
```bash
npx serve .
# or: python3 -m http.server 8080
```
Open the printed URL and try the flow end to end:
1. Register a second, non-admin account.
2. Report a lost item — you should land on the "how it works" screen
   right after logging in, then be able to submit the report.
3. Check the console for the "email not configured" warning (until you
   set up EmailJS — see below) or an actual email if you did.
4. Sign into your admin dashboard file with the account from Step 4/5.
   Try **Add Found Item**, link it as a match to the lost report you just
   made, and walk through **Send Identify Email** → **Confirm Handover &
   Resolve**.
5. Check the **Users** tab — suspend the test account, then try logging
   into it again from an incognito window to confirm it gets signed back
   out.

### 7. Deploy
Supabase doesn't host static files — deploy the `public/` folder to any
static host: Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc. No
build step is needed; everything loads Supabase from a CDN (`esm.sh`), so
"deploy" really just means "upload these files somewhere that serves
static content over HTTPS."

**One more thing after deploying:** Supabase Auth needs to know your real
site URL to build password-reset links correctly. Dashboard →
**Authentication → URL Configuration** → set **Site URL** to your deployed
URL, and add it (plus `http://localhost:PORT` for local testing) to
**Redirect URLs**.

---

## Email setup (EmailJS)

Email is entirely client-side via [EmailJS](https://www.emailjs.com) — no
server or secret key needed, consistent with the rest of this project.
There are **four** templates now:

| Config variable | When it's sent | Template variables to include |
|---|---|---|
| `EMAILJS_LOST_REPORT_TEMPLATE_ID` | The moment someone reports a lost item | `{{to_email}}` `{{item_title}}` `{{item_type}}` `{{item_category}}` `{{item_location}}` **`{{edit_link}}`** |
| `EMAILJS_TEMPLATE_ID` | An admin marks a report Resolved | `{{to_email}}` `{{item_title}}` `{{item_type}}` `{{item_category}}` `{{item_location}}` |
| `EMAILJS_IDENTIFY_TEMPLATE_ID` *(new)* | An admin sends a "come identify your item" invite | `{{to_email}}` `{{item_title}}` `{{item_category}}` `{{item_location}}` |
| `EMAILJS_FINDER_TEMPLATE_ID` *(new)* | Handover confirmed — thank-you to whoever found it (if we have their contact) | `{{to_email}}` `{{item_title}}` `{{item_category}}` `{{item_location}}` |

**Important:** make sure your `EMAILJS_LOST_REPORT_TEMPLATE_ID` template
actually includes `{{edit_link}}` somewhere in its body — that's the
reporter's private link to edit/resolve/delete their own report. Without
it in the template, the email still sends but won't contain the link.

Setup:
1. Create a free account at [emailjs.com](https://www.emailjs.com).
2. Add an Email Service (e.g. connect a Gmail account) — copy its
   **Service ID**.
3. Create the two new Email Templates listed above — copy each
   **Template ID**.
4. Account → General → copy your **Public Key**.
5. Paste everything into `public/js/emailjs-config.js`. The two carried
   over from the previous update (`EMAILJS_SERVICE_ID`,
   `EMAILJS_PUBLIC_KEY`, `EMAILJS_LOST_REPORT_TEMPLATE_ID`,
   `EMAILJS_TEMPLATE_ID`) already have real values filled in from before
   — only the two new template IDs are placeholders.

Until the two new ones are filled in, everything else still works exactly
the same — the app just logs a console warning and skips that particular
email, so nothing else is blocked by it.

---

## Removing accounts (a note on `admin_delete_user_account`)

Migration 3's `admin_delete_user_account()` function deletes directly from
`auth.users` inside a `SECURITY DEFINER` function. This works because the
function is created by the same role that runs your migrations (typically
`postgres`), which already has the necessary privileges on the `auth`
schema in Supabase — no service-role key needed.

If your specific Supabase project ever restricts this further and the
call fails with a permissions error, the fallback is a small **Supabase
Edge Function** using the Admin API + your service role key (which never
touches the browser):

```ts
// supabase/functions/delete-user/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { user_id } = await req.json()
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  // TODO: verify the caller is an admin (check their JWT against admin_users)
  // before calling this — see the auth header on `req`.
  const { error } = await admin.auth.admin.deleteUser(user_id)
  return new Response(JSON.stringify({ error: error?.message ?? null }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```
Deploy with `npx supabase functions deploy delete-user` and set the
service role key as a secret (`npx supabase secrets set
SUPABASE_SERVICE_ROLE_KEY=...`) — never put it in client-side code. Swap
the `admin_delete_user_account` call in `js/foundly-data.js` for a
`fetch()` to this function if you need it.

---

## Data model additions (migration 3)

```
profiles
  id            uuid, primary key, references auth.users(id)
  email         text
  full_name     text
  phone         text
  is_suspended  boolean
  suspended_at  timestamptz | null
  created_at    timestamptz

reports (new columns)
  owner_id                uuid | null   — references auth.users(id)
  matched_report_id       uuid | null   — the linked Lost↔Found pair
  identify_email_sent_at  timestamptz | null

bookmarks
  user_id, report_id   — composite primary key, references auth.users / reports

suspicious_reports
  id, report_id, reporter_id (nullable), reporter_contact (nullable),
  reason, details, status ('open' | 'reviewed' | 'dismissed'), created_at
```

`contact` on `reports` is now nullable (an admin-added Found item might
not have the finder's contact on file).

---

## Known trade-offs (worth knowing about)

- **Search is client-side.** Filtering by keyword happens in the browser
  after fetching active items by type. Fine at this scale — if the
  catalog grows large, Postgres's `tsvector`/`tsquery` support (or a
  hosted search service) is worth adding.
- **Account deletion keeps past reports.** When an admin removes a user's
  account, their historical reports are kept (for department
  record-keeping) but unlinked (`owner_id` set to null) rather than
  deleted. If you'd rather they be deleted too, change the `owner_id`
  foreign key from `ON DELETE SET NULL` to `ON DELETE CASCADE` in a new
  migration.
- **Suspended accounts don't retroactively hide past reports.** Suspending
  someone stops them from logging in or reporting further items; it
  doesn't hide reports they already made. Remove those individually from
  the admin Reports tab if needed.
- **Matching is manual.** There's no automatic "these look like the same
  item" suggestion — an admin picks the match themselves from the found
  items list. That's intentional (avoids false positives), but a
  similarity search could be layered on top later.
