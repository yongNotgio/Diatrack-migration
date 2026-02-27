import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByMedications = query({
  args: { medicationIds: v.array(v.id("medications")) },
  handler: async (ctx, { medicationIds }) => {
    const all = [];
    for (const medId of medicationIds) {
      const schedules = await ctx.db
        .query("medication_schedules")
        .withIndex("by_medication", (q) => q.eq("medication_id", medId))
        .order("desc")
        .collect();
      all.push(...schedules);
    }
    return all;
  },
});
