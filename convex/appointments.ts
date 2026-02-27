import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByDoctor = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, { doctorId }) => {
    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", doctorId))
      .order("asc")
      .collect();
    const result = [];
    for (const a of appts) {
      let patient = null;
      if (a.patient_id) {
        const p = await ctx.db.get(a.patient_id);
        if (p) patient = { first_name: p.first_name, last_name: p.last_name };
      }
      result.push({ ...a, appointment_id: a._id, patients: patient });
    }
    return result;
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .collect();
    return appts.map((a) => ({ ...a, appointment_id: a._id }));
  },
});

export const listBySecretary = query({
  args: { secretaryId: v.id("secretaries") },
  handler: async (ctx, { secretaryId }) => {
    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_secretary", (q) => q.eq("secretary_id", secretaryId))
      .order("asc")
      .collect();
    const result = [];
    for (const a of appts) {
      let patient = null;
      if (a.patient_id) {
        const p = await ctx.db.get(a.patient_id);
        if (p) patient = { first_name: p.first_name, last_name: p.last_name };
      }
      let doctor = null;
      if (a.doctor_id) {
        const d = await ctx.db.get(a.doctor_id);
        if (d) doctor = { first_name: d.first_name, last_name: d.last_name };
      }
      result.push({ ...a, appointment_id: a._id, patients: patient, doctors: doctor });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    doctor_id: v.optional(v.id("doctors")),
    patient_id: v.optional(v.id("patients")),
    secretary_id: v.optional(v.id("secretaries")),
    appointment_datetime: v.number(),
    notes: v.optional(v.string()),
    appointment_state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc: any = { ...args };
    if (!doc.appointment_state) doc.appointment_state = "Pending";
    for (const k of Object.keys(doc)) {
      if (doc[k] === undefined) delete doc[k];
    }
    const id = await ctx.db.insert("appointments", doc);
    const inserted = await ctx.db.get(id);
    return { ...inserted, appointment_id: id };
  },
});

export const update = mutation({
  args: {
    id: v.id("appointments"),
    doctor_id: v.optional(v.id("doctors")),
    patient_id: v.optional(v.id("patients")),
    appointment_datetime: v.optional(v.number()),
    notes: v.optional(v.string()),
    appointment_state: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    await ctx.db.patch(id, updates);
    const updated = await ctx.db.get(id);
    return { ...updated, appointment_id: id };
  },
});

export const updateState = mutation({
  args: { id: v.id("appointments"), appointment_state: v.string() },
  handler: async (ctx, { id, appointment_state }) => {
    await ctx.db.patch(id, { appointment_state });
  },
});

export const listByDoctors = query({
  args: { doctorIds: v.array(v.id("doctors")) },
  handler: async (ctx, { doctorIds }) => {
    const results = [];
    for (const doctorId of doctorIds) {
      const appts = await ctx.db
        .query("appointments")
        .withIndex("by_doctor", (q) => q.eq("doctor_id", doctorId))
        .collect();
      for (const a of appts) {
        let patient = null;
        if (a.patient_id) {
          const p = await ctx.db.get(a.patient_id);
          if (p) patient = { first_name: p.first_name, last_name: p.last_name };
        }
        let doctor = null;
        if (a.doctor_id) {
          const d = await ctx.db.get(a.doctor_id);
          if (d) doctor = { first_name: d.first_name, last_name: d.last_name };
        }
        results.push({ ...a, appointment_id: a._id, patients: patient, doctors: doctor });
      }
    }
    return results;
  },
});

export const getById = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const a = await ctx.db.get(id);
    if (!a) return null;
    return { ...a, appointment_id: a._id };
  },
});

export const remove = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const appt = await ctx.db.get(id);
    await ctx.db.delete(id);
    return appt ? { ...appt, appointment_id: id } : null;
  },
});
