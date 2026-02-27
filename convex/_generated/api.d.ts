/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appointments from "../appointments.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as doctorUnavailable from "../doctorUnavailable.js";
import type * as doctors from "../doctors.js";
import type * as healthMetrics from "../healthMetrics.js";
import type * as medicationSchedules from "../medicationSchedules.js";
import type * as medications from "../medications.js";
import type * as notifications from "../notifications.js";
import type * as patientLabs from "../patientLabs.js";
import type * as patientSpecialists from "../patientSpecialists.js";
import type * as patients from "../patients.js";
import type * as secretaries from "../secretaries.js";
import type * as secretaryDoctorLinks from "../secretaryDoctorLinks.js";
import type * as seedFunctions from "../seedFunctions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appointments: typeof appointments;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  doctorUnavailable: typeof doctorUnavailable;
  doctors: typeof doctors;
  healthMetrics: typeof healthMetrics;
  medicationSchedules: typeof medicationSchedules;
  medications: typeof medications;
  notifications: typeof notifications;
  patientLabs: typeof patientLabs;
  patientSpecialists: typeof patientSpecialists;
  patients: typeof patients;
  secretaries: typeof secretaries;
  secretaryDoctorLinks: typeof secretaryDoctorLinks;
  seedFunctions: typeof seedFunctions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
