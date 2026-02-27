import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("audit_logs").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    actor_type: v.string(),
    actor_id: v.string(),
    actor_name: v.string(),
    user_id: v.optional(v.string()),
    module: v.string(),
    action_type: v.string(),
    old_value: v.optional(v.string()),
    new_value: v.optional(v.string()),
    source_page: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    session_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc: any = {
      timestamp: Date.now(),
      actor_type: args.actor_type,
      actor_id: args.actor_id,
      actor_name: args.actor_name,
      module: args.module,
      action_type: args.action_type,
    };
    if (args.user_id) doc.user_id = args.user_id;
    if (args.old_value) doc.old_value = args.old_value;
    if (args.new_value) doc.new_value = args.new_value;
    if (args.source_page) doc.source_page = args.source_page;
    if (args.ip_address) doc.ip_address = args.ip_address;
    if (args.user_agent) doc.user_agent = args.user_agent;
    if (args.session_id) doc.session_id = args.session_id;

    await ctx.db.insert("audit_logs", doc);
  },
});
