import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const metrics = await ctx.db
      .query("health_metrics")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .collect();
    return metrics.map((m) => ({ ...m, metric_id: m._id }));
  },
});

export const getLatestByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const m = await ctx.db
      .query("health_metrics")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .first();
    return m ? { ...m, metric_id: m._id } : null;
  },
});

export const getSubmissions = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("health_metrics").order("desc").collect();
    return all.map((m) => ({
      patient_id: m.patient_id,
      updated_at: m.updated_at,
    }));
  },
});

export const getWoundPhotos = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const metrics = await ctx.db
      .query("health_metrics")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .collect();
    return metrics
      .filter((m) => m.wound_photo_url)
      .map((m) => ({
        url: m.wound_photo_url,
        updated_at: m.updated_at,
        notes: m.notes,
        metric_id: m._id,
      }));
  },
});

export const getWoundAnalysis = query({
  args: { patientId: v.id("patients"), woundPhotoUrl: v.string() },
  handler: async (ctx, { patientId, woundPhotoUrl }) => {
    const metrics = await ctx.db
      .query("health_metrics")
      .withIndex("by_patient", (q) => q.eq("patient_id", patientId))
      .order("desc")
      .collect();
    const match = metrics.find((m) => m.wound_photo_url === woundPhotoUrl);
    if (!match) return null;
    return {
      wound_photo_grad_url: match.wound_photo_grad_url,
      wound_photo_mask_url: match.wound_photo_mask_url,
      risk_classification: match.risk_classification,
      wound_diagnosis: match.wound_diagnosis,
      wound_care: match.wound_care,
      wound_dressing: match.wound_dressing,
      wound_medication: match.wound_medication,
      wound_follow_up: match.wound_follow_up,
      wound_important_notes: match.wound_important_notes,
    };
  },
});

export const update = mutation({
  args: {
    id: v.id("health_metrics"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    const patch: Record<string, any> = {};
    for (const [k, val] of Object.entries(updates as Record<string, any>)) {
      if (k === "_id" || k === "_creationTime" || k === "metric_id") continue;
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
  },
});
