/**
 * VOA Permission System — RBAC Matrix (Single Source of Truth)
 * Permission strings are plain snake_case.
 */

const ROLES = [
  // System-wide
  'super_admin',
  'voa_admin',
  // Clinical roles
  'hospital_admin',
  'doctor',
  'nurse',
  'pharmacist',
  'lab_scientist',
  'adherence_counselor',
  'case_manager',
  'receptionist',
  'data_officer',
  'medical_records_officer',
  'radiographer',
  'nutritionist',
  'counselor',
  // Org roles (extended)
  'alliance_admin',
  'org_admin',
  'programme_manager',
  'programme_officer',
  'finance_officer',
  'mande_officer',
  'support_group_leader',
  'volunteer',
  // Legacy VOA org roles (backward compatible)
  'chairman',
  'vice_chairman',
  'secretary',
  'treasurer',
  'pro',
  'program_coordinator',
  'membership_coordinator',
  'welfare_officer',
  'member',
];

// All permission constants
const PERMISSIONS = {
  VIEW_DASHBOARD:               'view_dashboard',
  VIEW_ALL_USERS:               'view_all_users',
  MANAGE_USERS:                 'manage_users',
  CHANGE_ROLE_DIRECT:           'change_role_direct',
  INITIATE_ROLE_CHANGE:         'initiate_role_change',
  APPROVE_ROLE_CHANGE:          'approve_role_change',
  SUBMIT_POSITION_APPLICATION:  'submit_position_application',
  REVIEW_POSITION_APPLICATION:  'review_position_application',
  APPROVE_POSITION_APPLICATION: 'approve_position_application',
  MANAGE_PROGRAMS:              'manage_programs',
  VIEW_PROGRAMS:                'view_programs',
  MANAGE_ATTENDANCE:            'manage_attendance',
  VIEW_ATTENDANCE:              'view_attendance',
  MANAGE_FINANCE:               'manage_finance',
  APPROVE_EXPENSE:              'approve_expense',
  VIEW_FINANCE:                 'view_finance',
  CREATE_REPORTS:               'create_reports',
  VIEW_REPORTS:                 'view_reports',
  MANAGE_ANNOUNCEMENTS:         'manage_announcements',
  VIEW_ANNOUNCEMENTS:           'view_announcements',
  // Granular announcement posting permissions
  POST_EXECUTIVE_ANNOUNCEMENT:  'post_executive_announcement',
  POST_FINANCE_ANNOUNCEMENT:    'post_finance_announcement',
  POST_MEMBERSHIP_ANNOUNCEMENT: 'post_membership_announcement',
  POST_PUBLICITY_ANNOUNCEMENT:  'post_publicity_announcement',
  POST_MEETING_ANNOUNCEMENT:    'post_meeting_announcement',
  POST_PROGRAM_ANNOUNCEMENT:    'post_program_announcement',
  POST_WELFARE_ANNOUNCEMENT:    'post_welfare_announcement',
  MANAGE_WELFARE:               'manage_welfare',
  SUBMIT_WELFARE_REQUEST:       'submit_welfare_request',
  VIEW_CONSTITUTION:            'view_constitution',
  MANAGE_CONSTITUTION:          'manage_constitution',
  EDIT_OWN_PROFILE:             'edit_own_profile',
  CHANGE_OWN_PASSWORD:          'change_own_password',
  GENERATE_OWN_ID_CARD:         'generate_own_id_card',
  VIEW_ANALYTICS:               'view_analytics',
  VIEW_SYSTEM_LOGS:             'view_system_logs',
  MANAGE_SETTINGS:              'manage_settings',
  // Contributions
  SUBMIT_CONTRIBUTION:          'submit_contribution',
  MANAGE_CONTRIBUTIONS:         'manage_contributions',
  VIEW_CONTRIBUTIONS:           'view_contributions',
  MANAGE_ACCOUNTS:              'manage_accounts',
  VIEW_ACCOUNTS:                'view_accounts',
  // Content permissions
  MANAGE_BLOGS:                 'manage_blogs',
  VIEW_BLOGS:                   'view_blogs',
  MANAGE_EVENTS:                'manage_events',
  VIEW_EVENTS:                  'view_events',
  MANAGE_PROJECTS:              'manage_projects',
  VIEW_PROJECTS:                'view_projects',
  MANAGE_GALLERY:               'manage_gallery',
  VIEW_GALLERY:                 'view_gallery',
  MANAGE_TEAM:                  'manage_team',
  VIEW_TEAM:                    'view_team',
  MANAGE_CONTACT:               'manage_contact',
  VIEW_CONTACT:                 'view_contact',
  MANAGE_ORGANIZATION:          'manage_organization',
  // ─── Healthcare / Clinical Permissions ────────────────────────────
  // Patient management
  MANAGE_PATIENTS:              'manage_patients',
  VIEW_PATIENT:                 'view_patient',
  EDIT_PATIENT:                 'edit_patient',
  REGISTER_PATIENT:             'register_patient',
  // Triage & Vitals
  TRIAGE_PATIENT:               'triage_patient',
  RECORD_VITALS:                'record_vitals',
  VIEW_VITALS:                  'view_vitals',
  // Consultations
  MANAGE_CONSULTATIONS:         'manage_consultations',
  APPROVE_CONSULTATION:         'approve_consultation',
  CONDUCT_CONSULTATION:         'conduct_consultation',
  VIEW_CONSULTATIONS:           'view_consultations',
  // Prescriptions & Pharmacy
  CREATE_PRESCRIPTION:          'create_prescription',
  REVIEW_PRESCRIPTION:          'review_prescription',
  DISPENSE_MEDICATION:          'dispense_medication',
  VERIFY_PRESCRIPTION:          'verify_prescription',
  VIEW_PRESCRIPTIONS:           'view_prescriptions',
  // Laboratory
  REQUEST_LAB:                  'request_lab',
  PROCESS_SAMPLE:               'process_sample',
  UPLOAD_LAB_RESULTS:           'upload_lab_results',
  VIEW_LAB_RESULTS:             'view_lab_results',
  FLAG_CRITICAL_RESULT:         'flag_critical_result',
  // Adherence & Counseling
  MANAGE_ADHERENCE:             'manage_adherence',
  CONDUCT_COUNSELING:           'conduct_counseling',
  VIEW_ADHERENCE:               'view_adherence',
  // Case Management
  MANAGE_CASE:                  'manage_case',
  MANAGE_REFERRALS:             'manage_referrals',
  CONDUCT_OUTREACH:             'conduct_outreach',
  // Appointments & Scheduling
  MANAGE_APPOINTMENTS:          'manage_appointments',
  MANAGE_SCHEDULE:              'manage_schedule',
  // Hospital Administration
  MANAGE_HOSPITAL:              'manage_hospital',
  MANAGE_STAFF:                 'manage_staff',
  MANAGE_DEPARTMENTS:           'manage_departments',
  // AI & System
  MANAGE_AI:                    'manage_ai',
  MANAGE_PROMPTS:               'manage_prompts',
  MANAGE_KNOWLEDGE:             'manage_knowledge',
  VIEW_AI_ANALYTICS:            'view_ai_analytics',
  // Role-specific dashboards
  VIEW_CLINICAL_DASHBOARD:      'view_clinical_dashboard',
  VIEW_NURSE_DASHBOARD:         'view_nurse_dashboard',
  VIEW_PHARMACY_DASHBOARD:      'view_pharmacy_dashboard',
  VIEW_LAB_DASHBOARD:           'view_lab_dashboard',
  VIEW_COUNSELOR_DASHBOARD:     'view_counselor_dashboard',
  VIEW_CASE_DASHBOARD:          'view_case_dashboard',
  VIEW_HOSPITAL_ADMIN_DASHBOARD:'view_hospital_admin_dashboard',
  // Patient Timeline
  VIEW_PATIENT_TIMELINE:        'view_patient_timeline',
  VIEW_CARE_TEAM:               'view_care_team',
  // Clinical documents
  UPLOAD_DOCUMENT:              'upload_document',
  VIEW_DOCUMENT:                'view_document',
  // Medication administration
  MANAGE_MEDICATION_ADMIN:      'manage_medication_administration',
  // Stock / Inventory
  VIEW_STOCK:                   'view_stock',
  MANAGE_STOCK:                 'manage_stock',
};

// Role → permissions map
const ROLE_PERMISSIONS = {
  super_admin: ['*'],

  chairman: [
    'view_dashboard', 'view_all_users', 'manage_users', 'approve_role_change',
    'review_position_application', 'approve_position_application',
    'view_programs', 'manage_programs', 'view_attendance', 'view_finance', 'approve_expense',
    'view_reports', 'manage_announcements', 'manage_welfare', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'view_analytics', 'manage_settings',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'post_executive_announcement', 'post_meeting_announcement', 'post_program_announcement',
    'manage_organization',
  ],

  vice_chairman: [
    'view_dashboard', 'view_all_users', 'view_attendance', 'view_programs',
    'view_reports', 'view_announcements', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card', 'view_analytics',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'manage_organization',
  ],

  secretary: [
    'view_dashboard', 'manage_attendance', 'create_reports', 'view_reports',
    'view_constitution', 'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'view_announcements', 'manage_announcements', 'post_meeting_announcement',
  ],

  treasurer: [
    'view_dashboard', 'manage_finance', 'view_finance', 'create_reports', 'view_reports',
    'view_constitution', 'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'submit_contribution', 'manage_contributions', 'view_contributions', 'manage_accounts', 'view_accounts',
    'view_announcements', 'manage_announcements', 'post_finance_announcement',
  ],

  pro: [
    'view_dashboard', 'manage_announcements', 'view_programs', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'post_publicity_announcement', 'post_meeting_announcement', 'post_program_announcement',
  ],

  program_coordinator: [
    'view_dashboard', 'manage_programs', 'view_programs', 'manage_attendance',
    'create_reports', 'view_reports', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'view_announcements', 'manage_announcements', 'post_program_announcement',
  ],

  membership_coordinator: [
    'view_dashboard', 'view_all_users', 'manage_users',
    'initiate_role_change', 'review_position_application', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card', 'view_analytics',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'view_announcements', 'manage_announcements', 'post_membership_announcement',
  ],

  welfare_officer: [
    'view_dashboard', 'manage_welfare', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'view_announcements', 'manage_announcements', 'post_welfare_announcement',
  ],

  member: [
    'view_dashboard', 'view_programs', 'view_attendance', 'view_announcements',
    'submit_position_application', 'submit_welfare_request', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card',
    'submit_contribution', 'view_contributions', 'view_accounts',
  ],

  // ─── Healthcare / Clinical Roles ───────────────────────────────────
  voa_admin: ['*'],

  hospital_admin: [
    'view_clinical_dashboard', 'view_hospital_admin_dashboard',
    'view_dashboard', 'view_all_users', 'manage_users',
    'manage_staff', 'manage_departments', 'manage_hospital',
    'view_patient', 'register_patient',
    'view_patient_timeline', 'view_care_team',
    'view_reports', 'create_reports', 'manage_settings',
    'manage_ai', 'manage_prompts', 'manage_knowledge', 'view_ai_analytics',
    'view_analytics', 'view_system_logs',
    'edit_own_profile', 'change_own_password',
    'manage_announcements', 'view_announcements',
    'manage_organization',
  ],

  doctor: [
    'view_clinical_dashboard', 'view_dashboard',
    'manage_patients', 'view_patient', 'edit_patient', 'register_patient',
    'manage_consultations', 'conduct_consultation', 'view_consultations', 'approve_consultation',
    'create_prescription', 'view_prescriptions',
    'request_lab', 'view_lab_results',
    'manage_referrals',
    'triage_patient', 'view_vitals',
    'view_patient_timeline', 'view_care_team',
    'manage_appointments', 'manage_schedule',
    'manage_adherence', 'view_adherence',
    'manage_case', 'manage_referrals',
    'view_ai_analytics',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements', 'view_analytics',
  ],

  nurse: [
    'view_nurse_dashboard', 'view_dashboard',
    'view_patient', 'edit_patient', 'register_patient',
    'triage_patient', 'record_vitals', 'view_vitals',
    'manage_appointments',
    'manage_medication_administration',
    'view_prescriptions',
    'view_lab_results',
    'view_patient_timeline',
    'manage_adherence',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  pharmacist: [
    'view_pharmacy_dashboard', 'view_dashboard',
    'view_patient', 'view_prescriptions',
    'review_prescription', 'verify_prescription',
    'dispense_medication',
    'manage_adherence',
    'view_lab_results',
    'view_stock', 'manage_stock',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  lab_scientist: [
    'view_lab_dashboard', 'view_dashboard',
    'view_patient',
    'process_sample', 'upload_lab_results', 'view_lab_results',
    'flag_critical_result',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  adherence_counselor: [
    'view_counselor_dashboard', 'view_dashboard',
    'view_patient', 'edit_patient',
    'manage_adherence', 'conduct_counseling', 'view_adherence',
    'manage_appointments',
    'view_lab_results',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  case_manager: [
    'view_case_dashboard', 'view_dashboard',
    'view_patient', 'edit_patient',
    'manage_case', 'manage_referrals', 'conduct_outreach',
    'manage_appointments',
    'view_adherence',
    'view_lab_results',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  receptionist: [
    'view_dashboard',
    'view_patient', 'register_patient', 'edit_patient',
    'manage_appointments',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  data_officer: [
    'view_dashboard',
    'view_patient', 'edit_patient', 'register_patient',
    'view_lab_results', 'upload_lab_results',
    'view_adherence',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  medical_records_officer: [
    'view_dashboard',
    'view_patient', 'edit_patient', 'register_patient',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  radiographer: [
    'view_lab_dashboard', 'view_dashboard',
    'view_patient',
    'process_sample', 'upload_lab_results', 'view_lab_results',
    'flag_critical_result',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  nutritionist: [
    'view_counselor_dashboard', 'view_dashboard',
    'view_patient', 'edit_patient',
    'manage_adherence', 'conduct_counseling', 'view_adherence',
    'view_lab_results',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  counselor: [
    'view_counselor_dashboard', 'view_dashboard',
    'view_patient', 'edit_patient',
    'manage_adherence', 'conduct_counseling', 'view_adherence',
    'view_lab_results',
    'view_patient_timeline',
    'view_document', 'upload_document',
    'edit_own_profile', 'change_own_password',
    'view_announcements',
  ],

  // ─── Extended Org Roles ────────────────────────────────────────────
  alliance_admin: [
    'view_dashboard', 'view_all_users', 'manage_users',
    'manage_organization', 'manage_settings',
    'view_programs', 'manage_programs',
    'view_reports', 'create_reports', 'view_analytics',
    'manage_announcements', 'view_announcements',
    'edit_own_profile', 'change_own_password',
    'view_constitution',
  ],

  org_admin: [
    'view_dashboard', 'view_all_users', 'manage_users',
    'manage_organization', 'manage_settings',
    'view_programs', 'view_reports', 'view_analytics',
    'manage_announcements', 'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],

  programme_manager: [
    'view_dashboard',
    'manage_programs', 'view_programs',
    'manage_attendance', 'view_attendance',
    'create_reports', 'view_reports',
    'view_analytics',
    'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],

  programme_officer: [
    'view_dashboard',
    'manage_programs', 'view_programs',
    'manage_attendance', 'view_attendance',
    'view_reports',
    'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],

  finance_officer: [
    'view_dashboard',
    'view_finance', 'view_accounts',
    'view_contributions', 'view_reports',
    'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],

  mande_officer: [
    'view_dashboard',
    'view_reports', 'create_reports', 'view_analytics',
    'view_programs', 'view_attendance',
    'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],

  support_group_leader: [
    'view_dashboard',
    'view_programs', 'manage_attendance', 'view_attendance',
    'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],

  volunteer: [
    'view_dashboard',
    'view_programs', 'view_attendance',
    'view_announcements',
    'edit_own_profile', 'change_own_password',
  ],
};

/**
 * Get permissions for a role.
 * Vice roles strip: approve_*, manage_*, change_role_direct
 * but keep: view_*, submit_*, edit_own_profile, change_own_password, generate_own_id_card
 */
const getPermissions = (role, isVice = false) => {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['member'];
  if (perms.includes('*')) return perms; // super_admin
  if (!isVice) return perms;
  return perms.filter(p => {
    if (p === 'change_role_direct') return false;
    if (p.startsWith('approve_')) return false;
    // Vice roles keep explicitly listed manage_* permissions
    if (p === 'manage_organization') return true;
    if (p.startsWith('manage_')) return false;
    return true;
  });
};

/**
 * Check if a role can assign another role.
 * super_admin → any
 * chairman → all except super_admin
 * membership_coordinator → member-level only
 */
const CLINICAL_ROLES = [
  'doctor', 'nurse', 'pharmacist', 'lab_scientist',
  'adherence_counselor', 'case_manager', 'receptionist', 'data_officer',
];

// ─── Portal Role Definitions ─────────────────────────────────────────
const HMS_ROLES = [
  'hospital_admin', 'doctor', 'nurse', 'pharmacist', 'lab_scientist',
  'adherence_counselor', 'case_manager', 'receptionist', 'data_officer',
  'medical_records_officer', 'radiographer', 'nutritionist', 'counselor',
];

const ORG_ROLES = [
  'super_admin', 'voa_admin',
  'chairman', 'vice_chairman', 'secretary', 'treasurer', 'pro',
  'program_coordinator', 'membership_coordinator', 'welfare_officer', 'member',
  'alliance_admin', 'org_admin', 'programme_manager', 'programme_officer',
  'finance_officer', 'data_officer', 'mande_officer',
  'support_group_leader', 'volunteer',
];

const ALL_ROLES = [...ROLES];

const isClinicalRole = (role) => CLINICAL_ROLES.includes(role);

const isHmsRole = (role) => HMS_ROLES.includes(role);

const isOrgRole = (role) => ORG_ROLES.includes(role);

const getPortalForRole = (role) => {
  if (isHmsRole(role)) return 'hms';
  if (isOrgRole(role)) return 'org';
  return null;
};

const canAssignRole = (assignerRole, targetRole) => {
  // System-wide admins can assign any role
  if (assignerRole === 'super_admin') return true;
  if (assignerRole === 'voa_admin') return true;
  // Hospital admin can assign any clinical role + hospital_admin
  if (assignerRole === 'hospital_admin') {
    return targetRole === 'hospital_admin' || CLINICAL_ROLES.includes(targetRole) || ['medical_records_officer', 'radiographer', 'nutritionist', 'counselor'].includes(targetRole);
  }
  // Alliance admin can assign org roles
  if (assignerRole === 'alliance_admin') {
    return ORG_ROLES.includes(targetRole) && targetRole !== 'super_admin' && targetRole !== 'voa_admin';
  }
  // Org admin can assign programme-level roles
  if (assignerRole === 'org_admin') {
    return ['programme_manager', 'programme_officer', 'finance_officer', 'mande_officer', 'support_group_leader', 'volunteer', 'member'].includes(targetRole);
  }
  // Legacy VOA role assignment
  if (assignerRole === 'chairman') return targetRole !== 'super_admin' && !isClinicalRole(targetRole);
  if (assignerRole === 'membership_coordinator') {
    return ['member', 'welfare_officer', 'pro', 'program_coordinator', 'secretary', 'treasurer'].includes(targetRole);
  }
  return false;
};

/**
 * Check if a user object has a given permission.
 * super_admin or wildcard '*' always passes.
 */
const can = (user, permission) => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const perms = getPermissions(user.role, user.isVice);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
};

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, getPermissions, canAssignRole, can, isClinicalRole, CLINICAL_ROLES, ALL_ROLES, HMS_ROLES, ORG_ROLES, isHmsRole, isOrgRole, getPortalForRole };
