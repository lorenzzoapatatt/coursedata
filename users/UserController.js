const express = require("express");
const router = express.Router();
const User = require("./User");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");
const bcrypt = require("bcryptjs");
const { authorize, PERMISSIONS, normalizeRole, ROLES } = require("../middleware/rbac");

const LOGIN_PATH = "/login";

const getProfileName = (user) => user?.profile?.name || user?.Profile?.name;

const createUserSession = (req, user) => {
  const profile = normalizeRole(getProfileName(user));

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile,
    enterprise_id: user.enterprise_id,
  };
};

const createEnterpriseSession = (req, enterprise) => {
  req.session.user = {
    id: enterprise.id,
    name: enterprise.name,
    email: enterprise.email,
    profile: ROLES.ENTERPRISE,
    enterprise_id: enterprise.id,
  };
};

const hasPassword = (account, password) =>
  Boolean(account?.password) && bcrypt.compareSync(password, account.password);

const authenticate = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect(LOGIN_PATH);
  }

  Promise.all([
    User.findOne({ where: { email }, include: [Profile] }),
    Enterprise.findOne({ where: { email } }),
  ])
    .then(([user, enterprise]) => {
      const userRole = normalizeRole(getProfileName(user));
      const userIsValid = Boolean(userRole) && hasPassword(user, password);
      const enterpriseIsValid =
        Boolean(enterprise?.is_active) && hasPassword(enterprise, password);

      if (userIsValid) {
        createUserSession(req, user);
        return res.redirect("/");
      }

      if (enterpriseIsValid) {
        createEnterpriseSession(req, enterprise);
        return res.redirect("/");
      }

      return res.redirect(LOGIN_PATH);
    })
    .catch((error) => {
      console.log(error);
      res.redirect(LOGIN_PATH);
    });
};

router.get("/admin/users", authorize(PERMISSIONS.USER_PANEL, { loginPath: LOGIN_PATH }), (req, res) => {
  User.findAll().then((users) => {
    res.render("admin/users/index", { users: users });
  });
});

const manageUsersAuth = authorize(PERMISSIONS.MANAGE_USERS, {
  loginPath: LOGIN_PATH,
});

router.get("/admin/users/create", manageUsersAuth, (req, res) => {
  Promise.all([Enterprise.findAll(), Profile.findAll()])
    .then(([enterprises, profiles]) => {
      res.render("admin/users/create", {
        enterprises: enterprises,
        profiles: profiles,
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao carregar formulário");
    });
});

router.post("/users/create", manageUsersAuth, (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let phone = req.body.phone;
  let enterprise_id = req.body.enterprise_id;
  let profile_id = req.body.profile_id;

  User.findOne({ where: { email: email } })
    .then((user) => {
      if (user == undefined) {
        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(password, salt);

        User.create({
          name: name,
          email: email,
          password: hash,
          phone: phone,
          enterprise_id: enterprise_id,
          profile_id: profile_id,
        })
          .then(() => {
            res.redirect("/admin/users");
          })
          .catch((error) => {
            console.log(error);
            res.status(500).send("Erro ao criar usuário");
          });
      } else {
        res.status(400).send("Email já registrado");
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao processar solicitação");
    });
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/auth", authenticate);

router.get("/admin/login", (req, res) => {
  res.redirect(LOGIN_PATH);
});

router.post("/admin/auth", authenticate);

router.get("/logout", (req, res) => {
  req.session.user = undefined;
  res.redirect("/");
});

router.get("/register", (req, res) => {
  res.render("register");
});

module.exports = router;
