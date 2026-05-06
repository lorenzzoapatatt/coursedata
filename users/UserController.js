const express = require("express");
const router = express.Router();
const User = require("./User");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");
const bcrypt = require("bcryptjs");

router.get("/admin/users", (req, res) => {
  User.findAll().then((users) => {
    res.render("admin/users/index", { users: users });
  });
});

router.get("/admin/users/create", (req, res) => {
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

router.post("/users/create", (req, res) => {
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
  res.render("admin/users/login");
});

router.post("/auth", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.findOne({ where: { email: email } }).then((user) => {
    if (user != undefined) {
    }
  });
});

module.exports = router;
