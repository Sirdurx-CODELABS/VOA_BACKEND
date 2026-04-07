/**
 * Duty-based announcement category map.
 * Each role can only create announcements in their allowed categories.
 * super_admin bypasses all restrictions.
 */

const ROLE_CATEGORIES = {
  super_admin: null, // null = all categories allowed

  chairman: [
    'executive', 'emergency', 'official', 'policy', 'leadership',
    'meeting', 'program', 'membership', 'general',
  ],

  vice_chairman: [
    'executive', 'meeting', 'general', 'leadership', 'program',
  ],

  pro: [
    'publicity', 'meeting', 'event', 'awareness', 'media', 'program', 'general',
  ],

  treasurer: [
    'finance', 'contribution', 'payment_reminder', 'transparency', 'account_update',
  ],

  secretary: [
    'meeting', 'report', 'documentation', 'attendance_reminder', 'general',
  ],

  program_coordinator: [
    'program', 'volunteer', 'activity', 'participation_reminder', 'event',
  ],

  membership_coordinator: [
    'membership', 'reminder', 'onboarding', 'engagement', 'inactivity', 'role_application',
  ],

  welfare_officer: [
    'welfare', 'support', 'care_notice', 'reminder',
  ],

  member: [], // members cannot post announcements by default
};

/**
 * Get allowed categories for a role.
 * Returns null for super_admin (all allowed).
 * Returns [] for member (none allowed).
 */
const getAllowedCategories = (role) => {
  if (role === 'super_admin') return null;
  return ROLE_CATEGORIES[role] || [];
};

/**
 * Check if a role can post in a given category.
 */
const canPostCategory = (role, category) => {
  if (role === 'super_admin') return true;
  const allowed = ROLE_CATEGORIES[role] || [];
  return allowed.includes(category);
};

/**
 * Category display metadata for UI.
 */
const CATEGORY_META = {
  executive:            { label: 'Executive',           color: '#1E3A8A', icon: '🏛️' },
  emergency:            { label: 'Emergency',           color: '#EF4444', icon: '🚨' },
  official:             { label: 'Official',            color: '#1E3A8A', icon: '📋' },
  policy:               { label: 'Policy',              color: '#1E3A8A', icon: '📜' },
  leadership:           { label: 'Leadership',          color: '#1E3A8A', icon: '👑' },
  finance:              { label: 'Finance',             color: '#22C55E', icon: '💰' },
  contribution:         { label: 'Contribution',        color: '#22C55E', icon: '💳' },
  payment_reminder:     { label: 'Payment Reminder',    color: '#F97316', icon: '⏰' },
  transparency:         { label: 'Transparency',        color: '#22C55E', icon: '📊' },
  account_update:       { label: 'Account Update',      color: '#22C55E', icon: '🏦' },
  meeting:              { label: 'Meeting',             color: '#3B82F6', icon: '📅' },
  report:               { label: 'Report',              color: '#3B82F6', icon: '📄' },
  documentation:        { label: 'Documentation',       color: '#3B82F6', icon: '📁' },
  attendance_reminder:  { label: 'Attendance',          color: '#F97316', icon: '✅' },
  membership:           { label: 'Membership',          color: '#F97316', icon: '👥' },
  reminder:             { label: 'Reminder',            color: '#F97316', icon: '🔔' },
  onboarding:           { label: 'Onboarding',          color: '#F97316', icon: '🎉' },
  engagement:           { label: 'Engagement',          color: '#F97316', icon: '⭐' },
  inactivity:           { label: 'Inactivity',          color: '#EF4444', icon: '⚠️' },
  role_application:     { label: 'Role Application',    color: '#F97316', icon: '📝' },
  publicity:            { label: 'Publicity',           color: '#1E3A8A', icon: '📢' },
  event:                { label: 'Event',               color: '#1E3A8A', icon: '🎪' },
  awareness:            { label: 'Awareness',           color: '#1E3A8A', icon: '💡' },
  media:                { label: 'Media',               color: '#1E3A8A', icon: '📸' },
  program:              { label: 'Program',             color: '#F97316', icon: '📌' },
  volunteer:            { label: 'Volunteer',           color: '#F97316', icon: '🤝' },
  activity:             { label: 'Activity',            color: '#F97316', icon: '🏃' },
  participation_reminder: { label: 'Participation',     color: '#F97316', icon: '🙋' },
  welfare:              { label: 'Welfare',             color: '#22C55E', icon: '❤️' },
  support:              { label: 'Support',             color: '#22C55E', icon: '🤗' },
  care_notice:          { label: 'Care Notice',         color: '#22C55E', icon: '💚' },
  general:              { label: 'General',             color: '#64748B', icon: '📣' },
};

module.exports = { ROLE_CATEGORIES, getAllowedCategories, canPostCategory, CATEGORY_META };
