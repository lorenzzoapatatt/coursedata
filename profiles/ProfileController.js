const express = require("express");
const router = express.Router();
const Profile = require("./Profile");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
