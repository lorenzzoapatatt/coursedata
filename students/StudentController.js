const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");
const User = require("../users/User");
const Student = require("./Student");
const { ROLES } = require("../middleware/rbac");

const hashPassword = (password) =>
  bcrypt.hashSync(password, bcrypt.genSaltSync(10));

const getStudentProfile = () =>
  Profile.findOne({ where: { name: { [Op.in]: [ROLES.STUDENT, "user"] } } });

router.get("/student/login", (req, res) => {
  res.redirect("/login");
});

router.post("/student/auth", (req, res) => {
  res.redirect(307, "/auth");
});

router.get("/student/register", (req, res) => {
  Enterprise.findAll()
    .then((enterprises) => {
      res.render("student-register", { enterprises });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao carregar cadastro de aluno");
    });
});

router.post("/student/register", (req, res) => {
  const { name, email, password, phone, enterprise_id } = req.body;

  Promise.all([getStudentProfile(), User.findOne({ where: { email } })])
    .then(([profile, existingUser]) => {
      const registerActions = {
        missingProfile: () => res.status(500).send("Perfil de aluno nao encontrado"),
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
            Student.create({
              user_id: user.id,
            }),
          ).then(() => res.redirect("/login")),
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
      res.status(500).send("Erro ao criar aluno");
    });
});

module.exports = router;
