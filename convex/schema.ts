import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // =========================
  // ADMINS
  // =========================
  admins: defineTable({
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),
    created_at: v.number(),
  }).index("by_email", ["email"]),


  // =========================
  // DOCTORS
  // =========================
  doctors: defineTable({
    first_name: v.string(),
    last_name: v.string(),
    specialization: v.optional(v.string()),
    email: v.string(),
    password: v.string(),
    affiliation: v.optional(v.string()),
    doctor_is_in: v.boolean(),
    created_at: v.number(),
  }).index("by_email", ["email"]),


  // =========================
  // SECRETARIES
  // =========================
  secretaries: defineTable({
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),
    created_at: v.number(),
  }).index("by_email", ["email"]),


  // =========================
  // PATIENTS
  // =========================
  patients: defineTable({
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),

    preferred_doctor_id: v.optional(v.id("doctors")),

    created_at: v.number(),
    date_of_birth: v.optional(v.string()),
    contact_info: v.optional(v.string()),
    medication: v.optional(v.string()),
    phase: v.string(),
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

    patient_visits: v.number(),

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
  }).index("by_email", ["email"])
    .index("by_preferred_doctor", ["preferred_doctor_id"]),


  // =========================
  // SECRETARY DOCTOR LINKS
  // =========================
  secretary_doctor_links: defineTable({
    secretary_id: v.id("secretaries"),
    doctor_id: v.id("doctors"),
  })
    .index("by_secretary", ["secretary_id"])
    .index("by_doctor", ["doctor_id"]),


  // =========================
  // APPOINTMENTS
  // =========================
  appointments: defineTable({
    secretary_id: v.optional(v.id("secretaries")),
    doctor_id: v.optional(v.id("doctors")),
    patient_id: v.optional(v.id("patients")),

    date_set: v.optional(v.number()),
    appointment_datetime: v.number(),

    notes: v.optional(v.string()),
    appointment_state: v.optional(v.string()),
  })
    .index("by_doctor", ["doctor_id"])
    .index("by_patient", ["patient_id"])
    .index("by_secretary", ["secretary_id"]),


  // =========================
  // DOCTOR UNAVAILABLE DATES
  // =========================
  doctor_unavailable_dates: defineTable({
    doctor_id: v.id("doctors"),
    secretary_id: v.id("secretaries"),
    unavailable_date: v.string(),
    reason: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_doctor", ["doctor_id"])
    .index("by_secretary", ["secretary_id"]),


  // =========================
  // HEALTH METRICS
  // =========================
  health_metrics: defineTable({
    patient_id: v.id("patients"),
    submission_date: v.number(),

    blood_glucose: v.optional(v.number()),
    bp_systolic: v.optional(v.number()),
    bp_diastolic: v.optional(v.number()),
    pulse_rate: v.optional(v.number()),

    wound_photo_url: v.optional(v.string()),
    food_photo_url: v.optional(v.string()),
    notes: v.optional(v.string()),

    updated_at: v.optional(v.number()),

    risk_classification: v.string(),
    bp_classification: v.optional(v.string()),
    wound_diagnosis: v.optional(v.string()),

    wound_care: v.optional(v.array(v.string())),
    wound_dressing: v.optional(v.array(v.string())),
    wound_medication: v.optional(v.array(v.string())),
    wound_follow_up: v.optional(v.array(v.string())),
    wound_important_notes: v.optional(v.string()),

    wound_photo_grad_url: v.optional(v.string()),
    wound_photo_mask_url: v.optional(v.string()),

    risk_score: v.optional(v.number()),
  }).index("by_patient", ["patient_id"]),


  // =========================
  // MEDICATIONS
  // =========================
  medications: defineTable({
    user_id: v.id("patients"),
    name: v.string(),
    dosage: v.optional(v.string()),
    created_at: v.number(),
    prescribed_by: v.optional(v.id("doctors")),
  })
    .index("by_user", ["user_id"])
    .index("by_prescriber", ["prescribed_by"]),


  // =========================
  // MEDICATION FREQUENCIES
  // =========================
  medication_frequencies: defineTable({
    medication_id: v.id("medications"),
    time_of_day: v.array(
      v.union(
        v.literal("morning"),
        v.literal("noon"),
        v.literal("dinner")
      )
    ),
    start_date: v.string(),
  }).index("by_medication", ["medication_id"]),


  // =========================
  // MEDICATION SCHEDULES
  // =========================
  medication_schedules: defineTable({
    medication_id: v.id("medications"),
    date: v.string(),
    time_of_day: v.union(
      v.literal("morning"),
      v.literal("noon"),
      v.literal("dinner")
    ),
    taken: v.boolean(),
  }).index("by_medication", ["medication_id"]),


  // =========================
  // NOTIFICATIONS
  // =========================
  notifications: defineTable({
    user_id: v.string(),
    user_role: v.union(
      v.literal("doctor"),
      v.literal("secretary"),
      v.literal("patient")
    ),
    title: v.string(),
    message: v.string(),
    type: v.optional(
      v.union(
        v.literal("appointment"),
        v.literal("patient"),
        v.literal("medication"),
        v.literal("wound")
      )
    ),
    reference_id: v.optional(v.string()),
    created_at: v.number(),
    is_read: v.boolean(),
  }).index("by_user", ["user_id"]),


  // =========================
  // PATIENT LABS
  // =========================
  patient_labs: defineTable({
    date_submitted: v.number(),

    Hba1c: v.optional(v.number()),
    ucr: v.optional(v.number()),
    got_ast: v.optional(v.number()),
    gpt_alt: v.optional(v.number()),
    triglycerides: v.optional(v.number()),
    hdl_cholesterol: v.optional(v.number()),
    ldl_cholesterol: v.optional(v.number()),
    cholesterol: v.optional(v.number()),
    urea: v.optional(v.number()),
    bun: v.optional(v.number()),
    uric: v.optional(v.number()),
    egfr: v.optional(v.number()),

    patient_id: v.optional(v.id("patients")),

    diasight_time: v.optional(v.array(v.string())),
    dr_class: v.optional(v.array(v.union(
      v.string(),
      v.object({
        confidence: v.number(),
        prediction: v.string(),
        risk_score: v.number(),
        timestamp: v.string(),
      })
    ))),
  }).index("by_patient", ["patient_id"]),


  // =========================
  // PATIENT SPECIALISTS
  // =========================
  patient_specialists: defineTable({
    patient_id: v.id("patients"),
    doctor_id: v.id("doctors"),
    specialization: v.optional(v.string()),
    assigned_at: v.number(),
  })
    .index("by_patient", ["patient_id"])
    .index("by_doctor", ["doctor_id"]),


  // =========================
  // AUDIT LOGS
  // =========================
  audit_logs: defineTable({
    timestamp: v.number(),

    actor_type: v.union(
      v.literal("admin"),
      v.literal("doctor"),
      v.literal("secretary"),
      v.literal("patient"),
      v.literal("system")
    ),

    actor_id: v.string(),
    actor_name: v.string(),
    user_id: v.optional(v.string()),

    module: v.union(
      v.literal("metrics"),
      v.literal("profile"),
      v.literal("credentials"),
      v.literal("medications"),
      v.literal("appointments"),
      v.literal("ml_settings"),
      v.literal("lab_results"),
      v.literal("user_management"),
      v.literal("authentication")
    ),

    action_type: v.union(
      v.literal("create"),
      v.literal("edit"),
      v.literal("delete"),
      v.literal("reset"),
      v.literal("login"),
      v.literal("logout"),
      v.literal("schedule"),
      v.literal("cancel"),
      v.literal("reschedule"),
      v.literal("upload"),
      v.literal("submit"),
      v.literal("update"),
      v.literal("view"),
      v.literal("export")
    ),

    old_value: v.optional(v.string()),
    new_value: v.optional(v.string()),
    source_page: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    session_id: v.optional(v.string()),
  }).index("by_actor", ["actor_id"])
    .index("by_user", ["user_id"]),
});