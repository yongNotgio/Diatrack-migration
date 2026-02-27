import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const links = await ctx.db
      .query("patient_specialists")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .collect();

    const result = [];
    for (const link of links) {
      const doctor = await ctx.db.get(link.doctor_id);
      result.push({
        ...link,
        id: link._id,
        doctors: doctor
          ? {
              doctor_id: doctor._id,
              first_name: doctor.first_name,
              last_name: doctor.last_name,
              specialization: doctor.specialization,
            }
          : null,
      });
    }
    return result;
  },
});

export const listByDoctor = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, { doctorId }) => {
    return await ctx.db
      .query("patient_specialists")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", doctorId))
      .collect();
  },
});

export const exists = query({
  args: { patientId: v.id("patients"), doctorId: v.id("doctors") },
  handler: async (ctx, { patientId, doctorId }) => {
    const all = await ctx.db
      .query("patient_specialists")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .collect();
    return all.some((s) => s.doctor_id === doctorId);
  },
});

export const create = mutation({
  args: {
    patient_id: v.id("patients"),
    doctor_id: v.id("doctors"),
    specialization: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("patient_specialists", {
      patient_id: args.patient_id,
      doctor_id: args.doctor_id,
      specialization: args.specialization ?? undefined,
      assigned_at: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("patient_specialists") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
