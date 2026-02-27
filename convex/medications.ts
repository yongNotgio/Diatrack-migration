import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const meds = await ctx.db
      .query("medications")
      .withIndex("by_user", (q) => q.eq("user_id", patientId))
      .order("asc")
      .collect();

    const result = [];
    for (const med of meds) {
      // Fetch prescriber info
      let prescriber = null;
      if (med.prescribed_by) {
        const d = await ctx.db.get(med.prescribed_by);
        if (d) prescriber = { first_name: d.first_name, last_name: d.last_name };
      }

      // Fetch frequencies
      const freqs = await ctx.db
        .query("medication_frequencies")
        .withIndex("by_medication", (q) => q.eq("medication_id", med._id))
        .collect();

      result.push({
        ...med,
        id: med._id,
        doctors: prescriber,
        medication_frequencies: freqs.map((f) => ({
          time_of_day: f.time_of_day,
          start_date: f.start_date,
          frequency: f.time_of_day,
        })),
      });
    }
    return result;
  },
});

export const getById = query({
  args: { id: v.id("medications") },
  handler: async (ctx, { id }) => {
    const med = await ctx.db.get(id);
    if (!med) return null;
    const freqs = await ctx.db
      .query("medication_frequencies")
      .withIndex("by_medication", (q) => q.eq("medication_id", id))
      .collect();
    return {
      ...med,
      id: med._id,
      medication_frequencies: freqs.map((f) => ({
        time_of_day: f.time_of_day,
        start_date: f.start_date,
      })),
    };
  },
});

export const create = mutation({
  args: {
    user_id: v.id("patients"),
    name: v.string(),
    dosage: v.optional(v.string()),
    prescribed_by: v.optional(v.id("doctors")),
    timeOfDay: v.optional(v.array(v.string())),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, { user_id, name, dosage, prescribed_by, timeOfDay, startDate }) => {
    const medDoc: any = { user_id, name, created_at: Date.now() };
    if (dosage) medDoc.dosage = dosage;
    if (prescribed_by) medDoc.prescribed_by = prescribed_by;

    const medId = await ctx.db.insert("medications", medDoc);

    if (timeOfDay && timeOfDay.length > 0 && startDate) {
      await ctx.db.insert("medication_frequencies", {
        medication_id: medId,
        time_of_day: timeOfDay as any,
        start_date: startDate,
      });
    }

    const inserted = await ctx.db.get(medId);
    return { ...inserted, id: medId };
  },
});

export const update = mutation({
  args: {
    id: v.id("medications"),
    name: v.optional(v.string()),
    dosage: v.optional(v.string()),
    timeOfDay: v.optional(v.array(v.string())),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, dosage, timeOfDay, startDate }) => {
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (dosage !== undefined) updates.dosage = dosage;
    await ctx.db.patch(id, updates);

    // Update frequency
    if (timeOfDay !== undefined || startDate !== undefined) {
      const freqs = await ctx.db
        .query("medication_frequencies")
        .withIndex("by_medication", (q) => q.eq("medication_id", id))
        .collect();
      if (freqs.length > 0) {
        const freqUpdates: Record<string, any> = {};
        if (timeOfDay !== undefined) freqUpdates.time_of_day = timeOfDay;
        if (startDate !== undefined) freqUpdates.start_date = startDate;
        await ctx.db.patch(freqs[0]._id, freqUpdates);
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("medications") },
  handler: async (ctx, { id }) => {
    // Get med data before deletion (for audit)
    const med = await ctx.db.get(id);
    const freqs = await ctx.db
      .query("medication_frequencies")
      .withIndex("by_medication", (q) => q.eq("medication_id", id))
      .collect();

    // Delete frequencies first
    for (const f of freqs) await ctx.db.delete(f._id);

    // Delete schedules
    const schedules = await ctx.db
      .query("medication_schedules")
      .withIndex("by_medication", (q) => q.eq("medication_id", id))
      .collect();
    for (const s of schedules) await ctx.db.delete(s._id);

    // Delete medication
    await ctx.db.delete(id);
    return med ? { ...med, id, medication_frequencies: freqs } : null;
  },
});
