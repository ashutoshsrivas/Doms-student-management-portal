// Central permission catalog. Edit this list to add or rename
// permissions — the startup seeder will reconcile the DB (upsert by key
// for the permission itself; defaults are only inserted when a row for
// (role, perm) doesn't already exist, so admin edits to defaults are
// never overwritten).
//
// Each entry:
//   key:           the dotted permission key checked in code (immutable)
//   label:         human-friendly label shown in the admin UI
//   area:          grouping label for the UI grid
//   description:   tooltip / help text (optional)
//   defaultRoles:  base roles that get this permission by default —
//                  matches today's behavior so the migration is invisible
//                  on day one.
//
// Adding a permission later: append a row here, redeploy. Seeder will
// create the permission row + grant it to listed default roles for roles
// that didn't previously have any row for that permission.
//
// Renaming a permission key: don't. Add a new one and migrate.

const ALL_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'STUDENT', 'MENTOR'];
const ALL_STAFF = ['ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];

const CATALOG = [
  // ===== Users =====
  { key: 'users.view',         label: 'View users',                   area: 'Users',        defaultRoles: ['ADMIN'] },
  { key: 'users.create',       label: 'Create users',                 area: 'Users',        defaultRoles: ['ADMIN'] },
  { key: 'users.edit',         label: 'Edit users',                   area: 'Users',        defaultRoles: ['ADMIN'] },
  { key: 'users.delete',       label: 'Delete users',                 area: 'Users',        defaultRoles: ['ADMIN'] },
  { key: 'users.approve',      label: 'Approve pending users',        area: 'Users',        defaultRoles: ['ADMIN', 'HOD'] },
  { key: 'users.deactivate',   label: 'Deactivate users',             area: 'Users',        defaultRoles: ['ADMIN'] },

  // ===== Academic sessions =====
  { key: 'sessions.view',             label: 'View sessions',           area: 'Sessions', defaultRoles: ['ADMIN', 'HOD', 'FACULTY', 'PLACEMENT_COORDINATOR', 'COORDINATOR'] },
  { key: 'sessions.create',           label: 'Create session',          area: 'Sessions', defaultRoles: ['ADMIN'] },
  { key: 'sessions.edit',             label: 'Edit session',            area: 'Sessions', defaultRoles: ['ADMIN'] },
  { key: 'sessions.delete',           label: 'Delete session',          area: 'Sessions', defaultRoles: ['ADMIN'] },
  { key: 'sessions.manage_students',  label: 'Add / remove students',   area: 'Sessions', defaultRoles: ['ADMIN'] },

  // ===== Assessments =====
  { key: 'assessments.view_all',        label: 'View all assessments',  area: 'Assessments', defaultRoles: ['ADMIN', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER'] },
  { key: 'assessments.create',          label: 'Create assessment',     area: 'Assessments', defaultRoles: ['ADMIN', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER'] },
  { key: 'assessments.edit',            label: 'Edit assessment',       area: 'Assessments', defaultRoles: ['ADMIN', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER'] },
  { key: 'assessments.delete',          label: 'Delete assessment',     area: 'Assessments', defaultRoles: ['ADMIN'] },
  { key: 'assessments.grade',           label: 'Grade submissions',     area: 'Assessments', defaultRoles: ['ADMIN', 'FACULTY', 'COORDINATOR', 'TRAINER'] },
  { key: 'assessments.manage_rubrics',  label: 'Manage rubrics',        area: 'Assessments', defaultRoles: ['ADMIN', 'FACULTY'] },

  // ===== Mentor teams =====
  { key: 'mentors.view_all',             label: 'View mentor teams',     area: 'Mentors',  defaultRoles: ['ADMIN'] },
  { key: 'mentors.create_team',          label: 'Create mentor team',    area: 'Mentors',  defaultRoles: ['ADMIN'] },
  { key: 'mentors.assign_members',       label: 'Assign mentees',        area: 'Mentors',  defaultRoles: ['ADMIN', 'FACULTY', 'MENTOR'] },
  { key: 'mentors.create_requirements',  label: 'Create requirements',   area: 'Mentors',  defaultRoles: ['FACULTY', 'MENTOR'] },

  // ===== SIP / Internships =====
  { key: 'sip.view_all',          label: 'View all SIPs',           area: 'Internships', defaultRoles: ['ADMIN', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR'] },
  { key: 'sip.create',            label: 'Create SIP',              area: 'Internships', defaultRoles: ['ADMIN'] },
  { key: 'sip.manage_documents',  label: 'Manage SIP documents',    area: 'Internships', defaultRoles: ['ADMIN'] },
  { key: 'sip.create_questions',  label: 'Create SIP questions',    area: 'Internships', defaultRoles: ['ADMIN', 'FACULTY'] },

  // ===== Files =====
  { key: 'files.view',    label: 'View files',    area: 'Files', defaultRoles: ['ADMIN'] },
  { key: 'files.upload',  label: 'Upload files',  area: 'Files', defaultRoles: ['ADMIN'] },
  { key: 'files.delete',  label: 'Delete files',  area: 'Files', defaultRoles: ['ADMIN'] },

  // ===== Reports (existing) =====
  { key: 'reports.view',      label: 'View reports page',  area: 'Reports', defaultRoles: ['ADMIN'] },
  { key: 'reports.download',  label: 'Download reports',   area: 'Reports', defaultRoles: ['ADMIN'] },

  // ===== Faculty Tasks =====
  { key: 'tasks.assign',                       label: 'Assign tasks',                       area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.bulk_assign',                  label: 'Bulk-assign tasks',                  area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.view_all',                     label: 'View all faculty tasks',             area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.edit_any',                     label: 'Edit any task',                      area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.delete_any',                   label: 'Delete any task',                    area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.remark',                       label: 'Add admin remark',                   area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.respond_extension',            label: 'Approve / reject extension',         area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.view_pending_queue',           label: 'View pending queue',                 area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },
  { key: 'tasks.download_performance_report',  label: 'Download performance report PDF',    area: 'Faculty Tasks', defaultRoles: ['ADMIN'] },

  // ===== Faculty Groups =====
  { key: 'groups.view',            label: 'View groups',             area: 'Faculty Groups', defaultRoles: ['ADMIN'] },
  { key: 'groups.create',          label: 'Create group',            area: 'Faculty Groups', defaultRoles: ['ADMIN'] },
  { key: 'groups.edit',            label: 'Edit group',              area: 'Faculty Groups', defaultRoles: ['ADMIN'] },
  { key: 'groups.delete',          label: 'Delete group',            area: 'Faculty Groups', defaultRoles: ['ADMIN'] },
  { key: 'groups.manage_members',  label: 'Manage group members',    area: 'Faculty Groups', defaultRoles: ['ADMIN'] },

  // ===== Announcements =====
  { key: 'announcements.view',    label: 'View announcements',  area: 'Announcements', defaultRoles: ALL_ROLES },
  { key: 'announcements.create',  label: 'Create announcement', area: 'Announcements', defaultRoles: ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'] },
  { key: 'announcements.edit',    label: 'Edit announcement',   area: 'Announcements', defaultRoles: ['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'] },
  { key: 'announcements.delete',  label: 'Delete announcement', area: 'Announcements', defaultRoles: ['ADMIN'] },

  // ===== Events =====
  { key: 'events.view',              label: 'View events',                       area: 'Events', defaultRoles: ALL_ROLES },
  { key: 'events.create',            label: 'Create event',                      area: 'Events', defaultRoles: ALL_STAFF },
  { key: 'events.edit_any',          label: 'Edit any event (not just own)',     area: 'Events', defaultRoles: ['ADMIN'] },
  { key: 'events.delete_any',        label: 'Delete any event (not just own)',   area: 'Events', defaultRoles: ['ADMIN'] },
  { key: 'events.block_dates',       label: 'Block calendar dates',              area: 'Events', defaultRoles: ['ADMIN'] },
  { key: 'events.bulk_block_dates',  label: 'Bulk-block date ranges',            area: 'Events', defaultRoles: ['ADMIN'] },
  { key: 'events.download_report',   label: 'Download events PDF report',        area: 'Events', defaultRoles: ['ADMIN'] },

  // ===== Job matching =====
  { key: 'job_matching.view',  label: 'View job matching',  area: 'Job Matching', defaultRoles: ['ADMIN', 'PLACEMENT_COORDINATOR'] },
  { key: 'job_matching.use',   label: 'Use job matching',   area: 'Job Matching', defaultRoles: ['ADMIN', 'PLACEMENT_COORDINATOR'] },

  // ===== Admin meta =====
  { key: 'admin.manage_roles',    label: 'Manage roles & permissions',  area: 'Admin', defaultRoles: ['ADMIN'] },
  { key: 'admin.manage_settings', label: 'Manage app settings',          area: 'Admin', defaultRoles: ['ADMIN'] },
];

module.exports = { CATALOG, ALL_ROLES, ALL_STAFF };
