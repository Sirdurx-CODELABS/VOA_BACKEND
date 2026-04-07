/**
 * VOA Permission System — RBAC Matrix (Single Source of Truth)
 * Permission strings are plain snake_case.
 */

const ROLES = [
  'super_admin',
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
  ],

  vice_chairman: [
    'view_dashboard', 'view_all_users', 'manage_users', 'view_programs', 'view_attendance',
    'view_reports', 'view_announcements', 'manage_welfare', 'view_constitution',
    'edit_own_profile', 'change_own_password', 'generate_own_id_card', 'view_analytics',
    'submit_contribution', 'view_contributions', 'view_accounts',
    'manage_announcements', 'post_executive_announcement', 'post_meeting_announcement',
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
    // Vice roles keep manage_users (can approve accounts) but strip other manage_* write actions
    if (p === 'manage_users') return true;
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
const canAssignRole = (assignerRole, targetRole) => {
  if (assignerRole === 'super_admin') return true;
  if (assignerRole === 'chairman') return targetRole !== 'super_admin';
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

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, getPermissions, canAssignRole, can };
