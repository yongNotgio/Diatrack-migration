// Convex mutation function reference, set from React component via setAuditMutation()
let _auditMutate = null;

/**
 * Must be called from a React component that has access to useMutation(api.auditLogs.create).
 * e.g. in App.jsx:  setAuditMutation(useMutation(api.auditLogs.create));
 */
export const setAuditMutation = (mutateFn) => {
  _auditMutate = mutateFn;
};

/**
 * Utility function to log audit events via Convex
 */
export const logAuditEvent = async (logData) => {
  try {
    if (!_auditMutate) {
      console.warn('Audit mutation not set yet – skipping log');
      return;
    }

    await _auditMutate({
      actor_type: logData.actorType,
      actor_id: String(logData.actorId ?? ''),
      actor_name: logData.actorName,
      user_id: logData.userId ? String(logData.userId) : undefined,
      module: logData.module,
      action_type: logData.actionType,
      old_value: logData.oldValue || undefined,
      new_value: logData.newValue || undefined,
      source_page: logData.sourcePage || undefined,
      ip_address: logData.ipAddress || undefined,
      user_agent: logData.userAgent || navigator.userAgent,
      session_id: logData.sessionId || undefined,
    });
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
};

/**
 * Helper function to log user authentication events
 */
export const logAuthEvent = async (actorType, actorId, actorName, actionType, sourcePage = 'Login Page') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    module: 'credentials',
    actionType, // 'login' or 'logout'
    sourcePage,
  });
};

/**
 * Helper function to log patient data changes
 */
export const logPatientDataChange = async (actorType, actorId, actorName, patientId, module, actionType, oldValue, newValue, sourcePage) => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    userId: patientId,
    module,
    actionType,
    oldValue,
    newValue,
    sourcePage,
  });
};

/**
 * Helper function to log system/admin actions
 */
export const logSystemAction = async (actorType, actorId, actorName, module, actionType, description, sourcePage) => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    module,
    actionType,
    newValue: description,
    sourcePage,
  });
};

/**
 * Helper function to log medication changes
 */
export const logMedicationChange = async (actorType, actorId, actorName, patientId, actionType, oldMedication, newMedication, sourcePage = 'Care Plan Tab') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    userId: patientId,
    module: 'medications',
    actionType,
    oldValue: oldMedication,
    newValue: newMedication,
    sourcePage,
  });
};

/**
 * Helper function to log health metrics submissions
 */
export const logMetricsSubmission = async (actorType, actorId, actorName, patientId, actionType, metricsData, sourcePage = 'Checkup Notes') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    userId: patientId,
    module: 'metrics',
    actionType,
    newValue: JSON.stringify(metricsData),
    sourcePage,
  });
};

/**
 * Helper function to log appointment events
 */
export const logAppointmentEvent = async (actorType, actorId, actorName, patientId, actionType, appointmentDetails, sourcePage = 'Appointment Manager') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    userId: patientId,
    module: 'appointments',
    actionType,
    newValue: appointmentDetails,
    sourcePage,
  });
};

/**
 * Helper function to log lab result events
 */
export const logLabResultEvent = async (actorType, actorId, actorName, patientId, actionType, labData, sourcePage = 'Lab Results Portal') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    userId: patientId,
    module: 'lab_results',
    actionType,
    newValue: JSON.stringify(labData),
    sourcePage,
  });
};

/**
 * Helper function to log ML settings changes
 */
export const logMLSettingsChange = async (actorType, actorId, actorName, actionType, oldSettings, newSettings, sourcePage = 'ML Model Config') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    module: 'ml_settings',
    actionType,
    oldValue: oldSettings,
    newValue: newSettings,
    sourcePage,
  });
};

/**
 * Helper function to log credential events (password resets, etc.)
 */
export const logCredentialEvent = async (actorType, actorId, actorName, userId, actionType, description, sourcePage = 'Credential Manager') => {
  await logAuditEvent({
    actorType,
    actorId,
    actorName,
    userId,
    module: 'credentials',
    actionType,
    newValue: description,
    sourcePage,
  });
};

export default {
  logAuditEvent,
  logAuthEvent,
  logPatientDataChange,
  logSystemAction,
  logMedicationChange,
  logMetricsSubmission,
  logAppointmentEvent,
  logLabResultEvent,
  logMLSettingsChange,
  logCredentialEvent,
};
