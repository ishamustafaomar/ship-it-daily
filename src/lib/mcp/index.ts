import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listFeed from "./tools/list-feed";
import createShip from "./tools/create-ship";
import replyToShip from "./tools/reply-to-ship";
import getShip from "./tools/get-ship";
import dailyShip from "./tools/daily-ship";
import hasShippedToday from "./tools/has-shipped-today";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "shippedin-mcp",
  title: "ShippedIn",
  version: "0.1.0",
  instructions:
    "Tools for ShippedIn, a build-in-public feed for people building with AI tools. Use `list_feed` to read recent ships, `get_ship` to expand a thread, `create_ship` to post ad-hoc, and `reply_to_ship` to join a thread. For scheduled/agent auto-posting once per day, use `has_shipped_today` then `daily_ship` — `daily_ship` is idempotent per UTC day so it's safe to run on a schedule without creating duplicates. Posting a ship keeps the daily streak going.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listFeed, getShip, createShip, replyToShip, dailyShip, hasShippedToday],
});