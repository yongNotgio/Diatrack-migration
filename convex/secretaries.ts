import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("secretaries").collect();
    return docs.map((d) => ({ ...d, secretary_id: d._id }));
  },
});

export const getById = query({
  args: { id: v.id("secretaries") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return { ...doc, secretary_id: doc._id };
  },
});

export const create = mutation({
  args: {
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("secretaries", {
      ...args,
      created_at: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("secretaries"),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("secretaries") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
