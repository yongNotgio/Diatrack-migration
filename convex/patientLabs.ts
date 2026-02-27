import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const labs = await ctx.db
      .query("patient_labs")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .collect();
    return labs.map((l) => ({ ...l, lab_id: l._id }));
  },
});

export const getLatestByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const lab = await ctx.db
      .query("patient_labs")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .first();
    return lab ? { ...lab, lab_id: lab._id } : null;
  },
});

export const listForDoctors = query({
  args: { doctorIds: v.array(v.id("doctors")) },
  handler: async (ctx, { doctorIds }) => {
    const results = [];
    const seenPatients = new Set<string>();
    for (const doctorId of doctorIds) {
      const patients = await ctx.db
        .query("patients")
        .withIndex("by_preferred_doctor", (q) => q.eq("preferred_doctor_id", doctorId))
        .collect();
      for (const p of patients) {
        if (seenPatients.has(p._id)) continue;
        seenPatients.add(p._id);
        const labs = await ctx.db
          .query("patient_labs")
          .withIndex("by_patient", (q) => q.eq("patient_id", p._id))
          .collect();
        results.push(...labs.map((l) => ({ ...l, lab_id: l._id })));
      }
    }
    return results;
  },
});

export const create = mutation({
  args: {
    patient_id: v.id("patients"),
    date_submitted: v.number(),
    Hba1c: v.optional(v.number()),
    ucr: v.optional(v.number()),
    got_ast: v.optional(v.number()),
    gpt_alt: v.optional(v.number()),
    cholesterol: v.optional(v.number()),
    triglycerides: v.optional(v.number()),
    hdl_cholesterol: v.optional(v.number()),
    ldl_cholesterol: v.optional(v.number()),
    urea: v.optional(v.number()),
    bun: v.optional(v.number()),
    uric: v.optional(v.number()),
    egfr: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const doc: any = { ...args };
    for (const k of Object.keys(doc)) {
      if (doc[k] === undefined || doc[k] === null) delete doc[k];
    }
    const id = await ctx.db.insert("patient_labs", doc);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("patient_labs"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    const patch: Record<string, any> = {};
    for (const [k, val] of Object.entries(updates as Record<string, any>)) {
      if (k === "_id" || k === "_creationTime" || k === "lab_id") continue;
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
  },
});
