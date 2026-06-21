const ROLES = Object.freeze({
  ADMIN: "admin",
  PROFESSOR: "professor",
  ENTERPRISE: "enterprise",
  STUDENT: "student",
});

const ANY_AUTHENTICATED_ROLE = "*";

const ROLE_ALIASES = Object.freeze({
  user: ROLES.STUDENT,
});

const PERMISSIONS = Object.freeze({
  AUTHENTICATED: "authenticated",
  USER_PANEL: "user_panel",
  COURSE_PANEL: "course_panel",
  ENTERPRISE_PANEL: "enterprise_panel",
  MANAGE_USERS: "manage_users",
});

const ACCESS_RULES = Object.freeze({
  [PERMISSIONS.AUTHENTICATED]: [ANY_AUTHENTICATED_ROLE],
  [PERMISSIONS.USER_PANEL]: [ROLES.ADMIN, ROLES.STUDENT],
  [PERMISSIONS.COURSE_PANEL]: [ROLES.ADMIN, ROLES.PROFESSOR],
  [PERMISSIONS.ENTERPRISE_PANEL]: [ROLES.ADMIN, ROLES.ENTERPRISE],
  [PERMISSIONS.MANAGE_USERS]: [ROLES.ADMIN],
});

const PANEL_LINKS = Object.freeze([
  {
    href: "/dashboard",
    label: "Dashboard",
    permission: PERMISSIONS.AUTHENTICATED,
  },
  { href: "/admin/users", label: "Users", permission: PERMISSIONS.USER_PANEL },
  {
    href: "/teacher/courses",
    label: "Courses",
    permission: PERMISSIONS.COURSE_PANEL,
  },
  {
    href: "/admin/enterprises",
    label: "Enterprises",
    permission: PERMISSIONS.ENTERPRISE_PANEL,
  },
]);

const accessHandlers = Object.freeze({
  guest: ({ res, loginPath }) => res.redirect(loginPath),
  forbidden: ({ res }) => res.status(403).send("Acesso negado"),
  allowed: ({ next }) => next(),
});

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const getAllowedRoles = (permission) =>
  (ACCESS_RULES[permission] || []).map(normalizeRole);

const canAccess = (user, permission) => {
  const allowedRoles = getAllowedRoles(permission);
  const userRole = normalizeRole(user?.profile);
  return (
    Boolean(user) &&
    (allowedRoles.includes(ANY_AUTHENTICATED_ROLE) ||
      allowedRoles.includes(userRole))
  );
};

const getAccessState = (isLoggedIn, hasPermission) =>
  [
    { state: "guest", when: !isLoggedIn },
    { state: "allowed", when: hasPermission },
  ].find(({ when }) => when)?.state || "forbidden";

const authorize = (permission, options = {}) => {
  const loginPath = options.loginPath || "/login";

  return (req, res, next) => {
    const user = req.session?.user;
    const isLoggedIn = Boolean(user);
    const hasPermission = canAccess(user, permission);
    const state = getAccessState(isLoggedIn, hasPermission);

    return accessHandlers[state]({ res, next, loginPath });
  };
};

const getAllowedPanelLinks = (user) =>
  PANEL_LINKS.filter((link) => canAccess(user, link.permission));

module.exports = {
  ROLES,
  PERMISSIONS,
  authorize,
  canAccess,
  getAllowedPanelLinks,
  normalizeRole,
};
