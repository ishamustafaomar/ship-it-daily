## Admin Panel for ShippedIn

A protected `/admin` area, accessible only to `omarmlaptop@gmail.com`, for monitoring signups, posts, and platform health.

### Access control

- Add a `user_roles` table + `app_role` enum (`admin`, `user`) with a `has_role(user_id, role)` security-definer function (safe pattern, no privilege escalation via profiles).
- Seed `omarmlaptop@gmail.com` as `admin` via a migration that looks up the user in `auth.users` by email.
- Also add an auth trigger: on new user creation, if email = `omarmlaptop@gmail.com` AND email is verified, auto-grant admin (so re-signup still works).
- Gate `/admin/*` routes with a `beforeLoad` check calling a `requireAdmin` server fn (uses `requireSupabaseAuth` + `has_role`). Non-admins get redirected home.
- All admin data fetches go through server functions that re-check admin role server-side (defense in depth — never trust the client).

### Pages

**`/admin` — Dashboard**
- Top-line stats: total users, new users (24h / 7d / 30d), total ships, ships today, active streaks, total likes, total follows.
- Simple sparkline / bar chart: signups per day (last 30d), ships per day (last 30d).
- Top tools used (count of ships by `tool_tag`).
- Top topic tags (last 7d).

**`/admin/users` — Users table**
- Columns: avatar, display name, @username, email, signed-up date, last ship date, streak, ship count, follower count.
- Search by username / display name / email.
- Sort by signup date, streak, ship count.
- Click a row → user detail drawer with their recent ships, focus tags, bio, and quick actions.

**`/admin/users/$id` — User detail**
- Full profile info + all their ships (paginated).
- Actions: delete a ship, delete the account (calls Auth Admin API via `supabaseAdmin` loaded inside the handler).

**`/admin/ships` — Content feed**
- All ships across the platform, newest first, filterable by post_type, tool_tag, and topic tag.
- Search body text.
- Quick delete action per ship (with confirm).

**`/admin/activity` — Recent activity**
- Combined stream of newest signups, ships, follows, likes for a live "what's happening" view.

### Also useful (recommendations)

- **Report/flag button** on ship cards (adds a `reports` table) + a `/admin/reports` queue. Not built yet, but wire the table so moderation is ready.
- **Health checks**: users with 0 ships after 7 days (activation funnel), streaks broken today, ships with broken/non-http links.
- **Export CSV** button on users and ships tables.
- **Impersonation-safe view**: link to a user's public profile from the admin row (no true impersonation — that's a security risk).

### Technical notes

- New table: `user_roles(user_id, role)` + `app_role` enum + `has_role()` SECURITY DEFINER function + owner-scoped RLS + service_role grants.
- New table: `reports(id, reporter_id, ship_id, reason, status, created_at)` with RLS (users insert their own, admins read all via `has_role`).
- Migration seeds the admin role by email lookup in `auth.users`; if the account doesn't exist yet, the auth trigger handles it on first sign-in.
- New server fns in `src/lib/admin.functions.ts`: `requireAdmin` middleware, `getAdminStats`, `listAdminUsers`, `getAdminUser`, `listAdminShips`, `deleteShip`, `deleteUser`, `listReports`, `resolveReport`. Admin fns dynamically import `@/integrations/supabase/client.server` inside handlers.
- New route tree: `src/routes/_admin/route.tsx` (pathless gate) with children `admin.tsx`, `admin.users.tsx`, `admin.users.$id.tsx`, `admin.ships.tsx`, `admin.activity.tsx`, `admin.reports.tsx`.
- Add an "Admin" link in `AppShell` that only renders when `has_role('admin')` is true (via a small client hook).
- Charts: use `recharts` (already common in shadcn stack) — install if missing.

### Out of scope for this pass

- No email notifications to admin.
- No bulk actions.
- No audit log of admin actions (can add later).
