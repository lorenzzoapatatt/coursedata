const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");
const User = require("../users/User");
const Professor = require("./Professor");
const { ROLES } = require("../middleware/rbac");

const hashPassword = (password) =>
  bcrypt.hashSync(password, bcrypt.genSaltSync(10));

const getProfessorProfile = () =>
  Profile.findOne({ where: { name: ROLES.PROFESSOR } });

router.get("/professor/login", (req, res) => {
  res.redirect("/login");
});

router.post("/professor/auth", (req, res) => {
  res.redirect(307, "/auth");
});

router.get("/professor/register", (req, res) => {
  Enterprise.findAll()
    .then((enterprises) => {
      res.render("professor-register", { enterprises });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao carregar cadastro de professor");
    });
});

router.post("/professor/register", (req, res) => {
  const { name, email, password, phone, enterprise_id, bio } = req.body;

  Promise.all([getProfessorProfile(), User.findOne({ where: { email } })])
    .then(([profile, existingUser]) => {
      const registerActions = {
        missingProfile: () =>
          res.status(500).send("Perfil de professor nao encontrado"),
        duplicatedEmail: () => res.status(400).send("Email ja registrado"),
        create: () =>
          User.create({
            name,
            email,
            password: hashPassword(password),
            phone,
            enterprise_id,
            profile_id: profile.id,
          }).then((user) =>
            Professor.create({
              user_id: user.id,
              bio,
            }).then(() => {
              req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                profile: ROLES.PROFESSOR,
                enterprise_id: user.enterprise_id,
                profile_photo: "/images/user-profile-photo.svg",
              };

              return res.redirect("/dashboard");
            }),
          ),
      };

      const actionKey =
        [
          { key: "missingProfile", when: !profile },
          { key: "duplicatedEmail", when: Boolean(existingUser) },
        ].find(({ when }) => when)?.key || "create";

      return registerActions[actionKey]();
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao criar professor");
    });
});

module.exports = router;
