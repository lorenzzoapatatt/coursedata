const { authorize, PERMISSIONS } = require("./rbac");

module.exports = authorize(PERMISSIONS.AUTHENTICATED);
