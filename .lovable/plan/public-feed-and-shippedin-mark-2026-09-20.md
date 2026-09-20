# Public feed and ShippedIn mark

## What will change
- Make `/home` and individual ship threads publicly viewable without an account.
- Show the public “For You” feed to signed-out visitors; keep personalized “Following” and “Relevant” views for signed-in users.
- Keep posting, replying, liking, reacting, reshipping, and following behind sign-in. Signed-out clicks will lead clearly to sign-in instead of failing.
- Update navigation for guests with Home/Explore links and a visible Sign in action; signed-in navigation remains unchanged.
- Replace the green dot used beside “ShippedIn” with the existing S-and-up-arrow brand mark on the homepage, app navigation, and sign-in page.

## Technical details
- Move the `/home` and `/s/:shipId` pages outside the protected route group while preserving their URLs.
- Add public read functions that use anonymous, read-only database access for ships, public profile fields, counts, and signed image URLs. Keep all write functions authenticated.
- Separate guest and signed-in query keys/data so personalized state cannot leak into public cached results.
- Make the app shell and right rail session-aware, avoiding protected data calls for guests.
- Add a reusable brand-mark component based on the existing favicon artwork, then replace only the brand dots—not decorative/status dots.
- Verify guest feed/thread viewing, sign-in gates for every interaction, signed-in posting, and desktop/mobile logo rendering in the live preview.
