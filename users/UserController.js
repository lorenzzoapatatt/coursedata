const express = require("express");
const router = express.Router();
const User = require("./User");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");
const bcrypt = require("bcryptjs");
const { authorize, PERMISSIONS, normalizeRole, ROLES } = require("../middleware/rbac");

const LOGIN_PATH = "/login";
const DEFAULT_PROFILE_PHOTO = "/images/user-profile-photo.svg";
const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i;

const getProfileName = (user) => user?.profile?.name || user?.Profile?.name;
const getProfilePhoto = (account) => account?.profile_photo || DEFAULT_PROFILE_PHOTO;

const normalizeProfilePhotoInput = (value) => {
  const photo = value?.trim();

  if (!photo) {
    return undefined;
  }

  return IMAGE_DATA_URL_PATTERN.test(photo) ? photo : null;
};

const createUserSession = (req, user) => {
  const profile = normalizeRole(getProfileName(user));

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile,
    enterprise_id: user.enterprise_id,
    profile_photo: getProfilePhoto(user),
  };
};

const createEnterpriseSession = (req, enterprise) => {
  req.session.user = {
    id: enterprise.id,
    name: enterprise.name,
    email: enterprise.email,
    profile: ROLES.ENTERPRISE,
    enterprise_id: enterprise.id,
    profile_photo: DEFAULT_PROFILE_PHOTO,
  };
};

const getSessionAccount = (sessionUser) => {
  if (!sessionUser) {
    return Promise.resolve(null);
  }

  if (sessionUser.profile === ROLES.ENTERPRISE) {
    return Enterprise.findByPk(sessionUser.id).then((account) =>
      account ? { account, accountType: ROLES.ENTERPRISE } : null,
    );
  }

  return User.findByPk(sessionUser.id, { include: [Profile] }).then((account) =>
    account ? { account, accountType: "user" } : null,
  );
};

const buildProfileLocals = ({ account, accountType }) => ({
  account,
  accountType,
  profileName:
    accountType === ROLES.ENTERPRISE
      ? ROLES.ENTERPRISE
      : normalizeRole(getProfileName(account)),
  profilePhoto:
    accountType === ROLES.ENTERPRISE
      ? DEFAULT_PROFILE_PHOTO
      : getProfilePhoto(account),
  canEditPhoto: accountType !== ROLES.ENTERPRISE,
});

const refreshSessionAccount = (req, { account, accountType }) => {
  if (accountType === ROLES.ENTERPRISE) {
    createEnterpriseSession(req, account);
    return;
  }

  createUserSession(req, account);
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
const authenticatedAuth = authorize(PERMISSIONS.AUTHENTICATED, {
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

router.get("/profile", authenticatedAuth, (req, res) => {
  res.redirect("/profile/info");
});

router.get("/profile/info", authenticatedAuth, (req, res) => {
  getSessionAccount(req.session.user)
    .then((context) => {
      if (!context) {
        req.session.user = undefined;
        return res.redirect(LOGIN_PATH);
      }

      return res.render("profile-info", buildProfileLocals(context));
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao carregar perfil");
    });
});

router.get("/profile/edit", authenticatedAuth, (req, res) => {
  getSessionAccount(req.session.user)
    .then((context) => {
      if (!context) {
        req.session.user = undefined;
        return res.redirect(LOGIN_PATH);
      }

      return res.render("profile-edit", {
        ...buildProfileLocals(context),
        error: undefined,
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao carregar edicao de perfil");
    });
});

router.post("/profile/edit", authenticatedAuth, (req, res) => {
  const { name, email, phone, profile_photo, remove_photo } = req.body;
  const nextProfilePhoto = normalizeProfilePhotoInput(profile_photo);

  if (nextProfilePhoto === null) {
    return res.status(400).send("Imagem de perfil invalida");
  }

  getSessionAccount(req.session.user)
    .then((context) => {
      if (!context) {
        req.session.user = undefined;
        return res.redirect(LOGIN_PATH);
      }

      const { account, accountType } = context;
      const AccountModel = accountType === ROLES.ENTERPRISE ? Enterprise : User;

      return AccountModel.findOne({ where: { email } }).then((existingAccount) => {
        if (existingAccount && existingAccount.id !== account.id) {
          return res.render("profile-edit", {
            ...buildProfileLocals(context),
            error: "Email ja registrado",
          });
        }

        const updatedData = { name, email, phone };

        if (accountType !== ROLES.ENTERPRISE) {
          if (remove_photo === "on") {
            updatedData.profile_photo = null;
          } else if (nextProfilePhoto) {
            updatedData.profile_photo = nextProfilePhoto;
          }
        }

        const reloadOptions =
          accountType === ROLES.ENTERPRISE ? undefined : { include: [Profile] };

        return AccountModel.update(updatedData, { where: { id: account.id } }).then(() =>
          AccountModel.findByPk(account.id, reloadOptions),
        ).then((updatedAccount) => {
          refreshSessionAccount(req, { account: updatedAccount, accountType });
          res.redirect("/profile/info");
        });
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao atualizar perfil");
    });
});

router.get("/logout", (req, res) => {
  req.session.user = undefined;
  res.redirect("/");
});

router.get("/register", (req, res) => {
  res.render("register");
});

module.exports = router;
