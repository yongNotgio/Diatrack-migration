import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("doctors").order("asc").collect();
    return docs.map((d) => ({ ...d, doctor_id: d._id }));
  },
});

export const getById = query({
  args: { id: v.id("doctors") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return { ...doc, doctor_id: doc._id };
  },
});

export const getStatus = query({
  args: { id: v.id("doctors") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    return doc ? doc.doctor_is_in : false;
  },
});

export const create = mutation({
  args: {
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),
    specialization: v.optional(v.string()),
    affiliation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("doctors", {
      ...args,
      doctor_is_in: false,
      created_at: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("doctors"),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    specialization: v.optional(v.string()),
    affiliation: v.optional(v.string()),
    doctor_is_in: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    await ctx.db.patch(id, updates);
  },
});

export const updateStatus = mutation({
  args: { id: v.id("doctors"), doctor_is_in: v.boolean() },
  handler: async (ctx, { id, doctor_is_in }) => {
    await ctx.db.patch(id, { doctor_is_in });
  },
});

export const remove = mutation({
  args: { id: v.id("doctors") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const listWithSecretaryInfo = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("doctors").collect();
    const result = [];
    for (const doc of docs) {
      const links = await ctx.db
        .query("secretary_doctor_links")
        .withIndex("by_doctor", (q) => q.eq("doctor_id", doc._id))
        .collect();
      const secretaries = [];
      for (const link of links) {
        const sec = await ctx.db.get(link.secretary_id);
        if (sec) secretaries.push({ first_name: sec.first_name, last_name: sec.last_name });
      }
      result.push({
        ...doc,
        doctor_id: doc._id,
        secretary_doctor_links: secretaries.map((s) => ({ secretaries: s })),
      });
    }
    return result;
  },
});
