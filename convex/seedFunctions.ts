import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generic insert mutation for seeding.
 * Accepts any table name and document, then inserts it.
 * Schema validation happens at ctx.db.insert() time.
 */
export const insert = mutation({
  args: {
    table: v.string(),
    doc: v.any(),
  },
  handler: async (ctx, { table, doc }) => {
    return await ctx.db.insert(table as any, doc);
  },
});

/**
 * Batch insert mutation for seeding large tables efficiently.
 * Returns an array of Convex IDs in the same order as the input docs.
 */
export const insertBatch = mutation({
  args: {
    table: v.string(),
    docs: v.array(v.any()),
  },
  handler: async (ctx, { table, docs }) => {
    const ids: string[] = [];
    for (const doc of docs) {
      const id = await ctx.db.insert(table as any, doc);
      ids.push(id as string);
    }
    return ids;
  },
});
