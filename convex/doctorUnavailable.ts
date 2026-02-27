import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByDoctors = query({
  args: { doctorIds: v.array(v.id("doctors")) },
  handler: async (ctx, { doctorIds }) => {
    const results = [];
    for (const doctorId of doctorIds) {
      const dates = await ctx.db
        .query("doctor_unavailable_dates")
        .withIndex("by_doctor", (q) => q.eq("doctor_id", doctorId))
        .collect();
      for (const d of dates) {
        const doctor = await ctx.db.get(d.doctor_id);
        results.push({
          ...d,
          id: d._id,
          doctors: doctor
            ? {
                first_name: doctor.first_name,
                last_name: doctor.last_name,
                specialization: doctor.specialization,
              }
            : null,
        });
      }
    }
    return results.sort((a, b) => (a.unavailable_date > b.unavailable_date ? 1 : -1));
  },
});

export const create = mutation({
  args: {
    doctor_id: v.id("doctors"),
    secretary_id: v.id("secretaries"),
    unavailable_date: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc: any = {
      doctor_id: args.doctor_id,
      secretary_id: args.secretary_id,
      unavailable_date: args.unavailable_date,
      created_at: Date.now(),
    };
    if (args.reason) doc.reason = args.reason;
    const id = await ctx.db.insert("doctor_unavailable_dates", doc);
    const inserted = await ctx.db.get(id);
    return { ...inserted, id };
  },
});

export const remove = mutation({
  args: { id: v.id("doctor_unavailable_dates") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
