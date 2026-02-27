-- Update the audit_logs table to support additional modules
-- Run this SQL to update the CHECK constraint for the module column

ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_module_check;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_module_check 
CHECK (module IN (
  'metrics', 
  'profile', 
  'credentials', 
  'medications', 
  'appointments', 
  'ml_settings', 
  'lab_results', 
  'user_management',
  'authentication'
));

-- Also update the action_type constraint to include new actions
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_action_type_check 
CHECK (action_type IN (
  'create', 
  'edit', 
  'delete', 
  'reset', 
  'login', 
  'logout',
  'schedule',
  'cancel',
  'reschedule',
  'upload',
  'submit',
  'update',
  'view',
  'export'
));
