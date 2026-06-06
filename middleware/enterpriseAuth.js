const { authorize, PERMISSIONS } = require("./rbac");

module.exports = authorize(PERMISSIONS.ENTERPRISE_PANEL);
