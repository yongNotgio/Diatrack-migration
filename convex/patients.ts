import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ---------- Queries ----------

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const patients = await ctx.db.query("patients").collect();
    const result = [];
    for (const p of patients) {
      let doctor = null;
      if (p.preferred_doctor_id) {
        const d = await ctx.db.get(p.preferred_doctor_id);
        if (d) doctor = { first_name: d.first_name, last_name: d.last_name };
      }
      result.push({
        ...p,
        patient_id: p._id,
        // Alias for Supabase relational pattern: patients.preferred_doctor_id → doctors(...)
        preferred_doctor_id: p.preferred_doctor_id,
        doctors: doctor,
      });
    }
    return result;
  },
});

export const listForDoctor = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, { doctorId }) => {
    // 1. Patients where preferred_doctor_id = doctorId
    const preferred = await ctx.db
      .query("patients")
      .withIndex("by_preferred_doctor", (q) => q.eq("preferred_doctor_id", doctorId))
      .collect();

    // 2. Patients assigned via patient_specialists
    const specialistLinks = await ctx.db
      .query("patient_specialists")
      .withIndex("by_doctor", (q) => q.eq("doctor_id", doctorId))
      .collect();

    const specialistPatientIds = new Set(specialistLinks.map((s) => s.patient_id));
    const preferredIds = new Set(preferred.map((p) => p._id));

    // Fetch specialist patients that aren't already in preferred list
    const additionalPatients = [];
    for (const patientId of specialistPatientIds) {
      if (!preferredIds.has(patientId)) {
        const pat = await ctx.db.get(patientId);
        if (pat) additionalPatients.push(pat);
      }
    }

    const allPatients = [...preferred, ...additionalPatients];

    // Enrich each patient with latest health metrics and lab data
    const result = [];
    for (const p of allPatients) {
      // Latest health metric
      const metrics = await ctx.db
        .query("health_metrics")
        .withIndex("by_patient", (q) => q.eq("patient_id", p._id))
        .order("desc")
        .first();

      // Latest lab
      const latestLab = await ctx.db
        .query("patient_labs")
        .withIndex("by_patient", (q) => q.eq("patient_id", p._id))
        .order("desc")
        .first();

      // All health metrics for risk/compliance
      const allMetrics = await ctx.db
        .query("health_metrics")
        .withIndex("by_patient", (q) => q.eq("patient_id", p._id))
        .order("desc")
        .collect();

      result.push({
        ...p,
        patient_id: p._id,
        latestHealthMetrics: metrics || null,
        latestLab: latestLab || null,
        allHealthMetrics: allMetrics,
      });
    }
    return result;
  },
});

export const getById = query({
  args: { id: v.id("patients") },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) return null;
    let doctor = null;
    if (p.preferred_doctor_id) {
      const d = await ctx.db.get(p.preferred_doctor_id);
      if (d) doctor = { ...d, doctor_id: d._id };
    }
    return { ...p, patient_id: p._id, doctors: doctor };
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const p = await ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!p) return null;
    return { ...p, patient_id: p._id };
  },
});

// ---------- Mutations ----------

export const create = mutation({
  args: {
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),
    preferred_doctor_id: v.optional(v.id("doctors")),
    date_of_birth: v.optional(v.string()),
    contact_info: v.optional(v.string()),
    medication: v.optional(v.string()),
    phase: v.optional(v.string()),
    gender: v.optional(v.string()),
    address: v.optional(v.string()),
    emergency_contact: v.optional(v.string()),
    diabetes_type: v.optional(v.string()),
    allergies: v.optional(v.string()),
    complication_history: v.optional(v.string()),
    smoking_status: v.optional(v.string()),
    monitoring_frequency: v.optional(v.string()),
    last_doctor_visit: v.optional(v.string()),
    last_eye_exam: v.optional(v.string()),
    patient_picture: v.optional(v.string()),
    BMI: v.optional(v.number()),
    patient_height: v.optional(v.number()),
    patient_weight: v.optional(v.number()),
    diabetes_duration: v.optional(v.number()),
    family_diabetes: v.optional(v.boolean()),
    hypertensive: v.optional(v.boolean()),
    cardiovascular: v.optional(v.boolean()),
    stroke: v.optional(v.boolean()),
    family_hypertension: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const doc: any = { ...args, created_at: Date.now(), patient_visits: 0 };
    if (!doc.phase) doc.phase = "Pre-Operative";
    // Remove undefined values
    for (const k of Object.keys(doc)) {
      if (doc[k] === undefined) delete doc[k];
    }
    const id = await ctx.db.insert("patients", doc);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("patients"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    // Filter out undefined/null values that shouldn't be set
    const patch: Record<string, any> = {};
    for (const [k, val] of Object.entries(updates as Record<string, any>)) {
      if (k === "_id" || k === "_creationTime" || k === "patient_id") continue;
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

export const updatePhase = mutation({
  args: { id: v.id("patients"), phase: v.string() },
  handler: async (ctx, { id, phase }) => {
    await ctx.db.patch(id, { phase });
  },
});

export const incrementVisits = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (p) {
      await ctx.db.patch(id, { patient_visits: (p.patient_visits || 0) + 1 });
    }
  },
});

export const listForDoctors = query({
  args: { doctorIds: v.array(v.id("doctors")) },
  handler: async (ctx, { doctorIds }) => {
    const seenIds = new Set<string>();
    const result = [];

    for (const doctorId of doctorIds) {
      const preferred = await ctx.db
        .query("patients")
        .withIndex("by_preferred_doctor", (q) => q.eq("preferred_doctor_id", doctorId))
        .collect();

      for (const p of preferred) {
        if (seenIds.has(p._id)) continue;
        seenIds.add(p._id);

        let doctor = null;
        if (p.preferred_doctor_id) {
          const d = await ctx.db.get(p.preferred_doctor_id);
          if (d) doctor = { doctor_id: d._id, first_name: d.first_name, last_name: d.last_name };
        }

        const latestMetric = await ctx.db
          .query("health_metrics")
          .withIndex("by_patient", (q) => q.eq("patient_id", p._id))
          .order("desc")
          .first();

        const latestLab = await ctx.db
          .query("patient_labs")
          .withIndex("by_patient", (q) => q.eq("patient_id", p._id))
          .order("desc")
          .first();

        result.push({
          ...p,
          patient_id: p._id,
          doctors: doctor,
          latestHealthMetrics: latestMetric ? { ...latestMetric, metric_id: latestMetric._id } : null,
          latestLab: latestLab ? { ...latestLab, lab_id: latestLab._id } : null,
        });
      }
    }
    return result;
  },
});

export const remove = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, { id }) => {
    // Cascade delete related records
    const labs = await ctx.db
      .query("patient_labs")
      .withIndex("by_patient", (q) => q.eq("patient_id", id))
      .collect();
    for (const lab of labs) await ctx.db.delete(lab._id);

    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patient_id", id))
      .collect();
    for (const appt of appts) await ctx.db.delete(appt._id);

    const specialists = await ctx.db
      .query("patient_specialists")
      .withIndex("by_patient", (q) => q.eq("patient_id", id))
      .collect();
    for (const s of specialists) await ctx.db.delete(s._id);

    const metrics = await ctx.db
      .query("health_metrics")
      .withIndex("by_patient", (q) => q.eq("patient_id", id))
      .collect();
    for (const m of metrics) await ctx.db.delete(m._id);

    const meds = await ctx.db
      .query("medications")
      .withIndex("by_user", (q) => q.eq("user_id", id))
      .collect();
    for (const med of meds) {
      const freqs = await ctx.db
        .query("medication_frequencies")
        .withIndex("by_medication", (q) => q.eq("medication_id", med._id))
        .collect();
      for (const f of freqs) await ctx.db.delete(f._id);
      const schedules = await ctx.db
        .query("medication_schedules")
        .withIndex("by_medication", (q) => q.eq("medication_id", med._id))
        .collect();
      for (const s of schedules) await ctx.db.delete(s._id);
      await ctx.db.delete(med._id);
    }

    await ctx.db.delete(id);
  },
});
