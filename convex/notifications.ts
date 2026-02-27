import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByUser = query({
  args: { userId: v.string(), userRole: v.string() },
  handler: async (ctx, { userId, userRole }) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .order("desc")
      .collect();
    return all
      .filter((n) => n.user_role === userRole)
      .map((n) => ({ ...n, notification_id: n._id }));
  },
});

export const create = mutation({
  args: {
    user_id: v.string(),
    user_role: v.union(
      v.literal("doctor"),
      v.literal("secretary"),
      v.literal("patient")
    ),
    title: v.string(),
    message: v.string(),
    type: v.optional(
      v.union(
        v.literal("appointment"),
        v.literal("patient"),
        v.literal("medication"),
        v.literal("wound")
      )
    ),
    is_read: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("notifications", {
      user_id: args.user_id,
      user_role: args.user_role,
      title: args.title,
      message: args.message,
      type: args.type,
      is_read: args.is_read ?? false,
      created_at: Date.now(),
    });
    return id;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { is_read: true });
  },
});

export const markAllRead = mutation({
  args: { userId: v.string(), userRole: v.string() },
  handler: async (ctx, { userId, userRole }) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    for (const n of all) {
      if (n.user_role === userRole && !n.is_read) {
        await ctx.db.patch(n._id, { is_read: true });
      }
    }
  },
});
