# Shipped — Build Plan

A build-in-public social feed for AI-tool builders. Dark-first, one electric accent, monospace tool tags, three-column responsive layout.

## Design system

- Dark by default (no theme toggle needed). Background near-black, elevated surfaces one step up, hairline borders.
- Single electric accent (proposing electric lime `oklch(0.88 0.24 130)` — high-signal on dark, distinct from typical purple/blue AI apps). Used for the flame, active nav, primary CTA, like/reship active states.
- Type: Inter for UI, JetBrains Mono for tool tags, timestamps, and streak counts.
- Tool tags render as `[ Lovable ]` style mono chips with a subtle border.

## Backend (Lovable Cloud)

Enable Cloud, then one migration creates the full schema:

- Tables: `profiles`, `ships`, `likes`, `reships`, `follows`, `notifications` exactly as specified.
- GRANTs on every public table to `authenticated` + `service_role`; `anon` SELECT only on `profiles` and `ships` (public read for share links).
- RLS: authenticated read-all; insert/update/delete only own rows (`auth.uid() = user_id` / `author_id` / `follower_id` / `id` for profiles). Notifications: recipient can select + update `read`; anyone authenticated can insert (created by triggers as the acting user).
- Trigger `handle_new_user` on `auth.users` insert → creates empty profile row (username filled in by onboarding step).
- Trigger `handle_ship_streak` on `ships` insert where `parent_ship_id IS NULL` → applies the specified streak logic on the author's profile.
- Triggers `notify_like`, `notify_reship`, `notify_reply`, `notify_follow` → insert notification rows (skip self-actions).
- Storage bucket `ship-images` (public read, authenticated write to own folder `${uid}/...`).
- Auth: email/password + Google (via `supabase--configure_social_auth`).

## Routes (TanStack file-based)

Public:
- `/` — landing/marketing if signed out; redirects to `/home` if signed in.
- `/auth` — sign in / sign up (email + Google).
- `/u/$username` — public profile + that user's ships.
- `/s/$shipId` — single ship + replies (shareable).

Authenticated (`_authenticated/`):
- `/home` — three-column app shell with Following / For You tabs.
- `/explore` — For You global feed, plus trending tools.
- `/notifications` — list, marks read on view.
- `/profile` — redirects to own `/u/$username`.
- `/onboarding` — username + display name capture on first sign-in (redirect target if profile.username is null).

## Layout

App shell (`_authenticated/route.tsx`):

```text
┌───────────┬────────────────────────┬──────────────┐
│  Nav rail │  Compose + Feed        │  Streak card │
│  Home     │  [Following][For You]  │  Suggestions │
│  Explore  │                        │  Trending    │
│  Notif •3 │                        │              │
│  Profile  │                        │              │
│ [+ Ship]  │                        │              │
└───────────┴────────────────────────┴──────────────┘
```

- Desktop ≥1024px: 3 columns (nav 240, feed 600, right 320).
- Tablet: 2 columns (nav collapses to icons, right column hides, accessible via drawer).
- Mobile: single column, bottom tab bar (Home/Explore/Notif/Profile), floating "+" for new ship, streak visible at top of Home.

## Features & wiring

- **Auth**: `supabase.auth` with email + Google via lovable broker; root `onAuthStateChange` invalidates router/query. On sign-in, check profile.username → route to `/onboarding` if null.
- **Compose**: textarea (280 char soft limit), tool-tag select (Lovable, Cursor, Bolt, Replit, v0, Other), optional link URL, optional image upload to `ship-images/${uid}/${uuid}`. Server fn `createShip` inserts row; streak update is trigger-driven.
- **Feed**: TanStack Query with `useInfiniteQuery`, page size 20, cursor by `created_at`. Following tab joins `follows` on `author_id`; For You is global newest.
- **Ship card**: avatar, display_name, @username, mono timestamp, body, tool-tag chip, optional link preview, optional image, action row (reply, reship, like, share). Reply opens inline composer that sets `parent_ship_id`.
- **Ship detail `/s/$shipId`**: parent ship + reply thread (one level), inline reply composer.
- **Like / Reship / Follow**: optimistic via `useMutation` with `onMutate` cache patch, rollback on error, invalidate on settle. Counts stored derived (COUNT queries via view or per-row `count(*)` — using a small view `ship_counts` for like/reship/reply totals).
- **Profile**: avatar, display_name, @username, bio, `building_now` line, streak with flame (`streak_count` + longest), follow button, ship list.
- **Notifications**: query with unread count badge in nav; opening page marks all read (`update ... set read=true where recipient_id=auth.uid()`).
- **Right column**:
  - Streak card: current streak + flame, longest, next-day countdown.
  - Builders to follow: 5 profiles the user doesn't follow yet, ordered by recent ship activity.
  - Trending tools: `select tool_tag, count(*) from ships where created_at > now()-interval '7 days' group by tool_tag order by count desc limit 5`.

## Technical details

- Server functions in `src/lib/*.functions.ts` using `requireSupabaseAuth` for all writes and personalized reads (feed, notifications, suggestions). Public reads (`/u/$username`, `/s/$shipId`) via server publishable client with narrow `TO anon` SELECT policies on `profiles` and `ships`.
- Head metadata per route; `/s/$shipId` and `/u/$username` derive OG title/description from loader data.
- Image upload path validated in RLS: `storage.foldername(name)[1] = auth.uid()::text`.
- Root `__root.tsx` head updated to real title/description ("Shipped — build in public with AI").
- Toasts via existing shadcn `sonner` for errors; optimistic UI hides latency on happy path.

## Scope guardrails (v1)

Included: auth+onboarding, compose w/ image, feed (Following/For You), ship detail + one-level replies, like, reship, follow, profile, notifications, streak, trending tools, builders to follow.

Excluded (as specified): DMs, search beyond Explore, quote-reships, edit/delete UI beyond own-ship delete menu, email digests, deeper reply threading.

## Build order

1. Enable Cloud, run schema migration (tables, GRANTs, RLS, triggers, storage bucket).
2. Configure Google auth.
3. Design tokens in `src/styles.css` (dark defaults, accent, mono font via `<link>` in `__root.tsx`).
4. Auth pages + onboarding + `_authenticated` shell.
5. Server fns: ships CRUD, feed queries, likes/reships/follows, notifications, suggestions, trending.
6. Compose + ShipCard + feed with infinite scroll and optimistic mutations.
7. Profile, ship detail, notifications, right rail.
8. Mobile layout pass + verification.
