import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /** Verified SocialAPI deliveries, kept for a day; the app subscribes to new ones. */
  events: defineTable({
    /** X-SocialAPI-Delivery (absent on test deliveries) — used to drop retries. */
    delivery: v.optional(v.string()),
    event: v.string(),
    body: v.any(),
  }).index("by_delivery", ["delivery"]),
});
