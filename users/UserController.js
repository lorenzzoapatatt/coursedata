const express = require("express");
const router = express.Router();
const User = require("./User");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");
const bcrypt = require("bcryptjs");
const adminAuth = require("../middleware/adminAuth");
const adminOnly = require("../middleware/adminOnly");

router.get("/admin/users", adminOnly, (req, res) => {
  User.findAll().then((users) => {
    res.render("admin/users/index", { users: users });
  });
});

router.get("/admin/users/create", adminOnly, (req, res) => {
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

router.post("/users/create", adminOnly, (req, res) => {
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

  User.findOne({ where: { email: email }, include: [Profile] }).then((user) => {
    if (user != undefined) {
      // Validar senha
      let correct = bcrypt.compareSync(password, user.password);

      if (correct) {
        req.session.user = {
          id: user.id,
          email: user.email,
          profile: user.Profile.name,
        };
        res.redirect("/");
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.user = undefined;
  res.redirect("/");
});

router.get("/register", (req, res) => {
  Enterprise.findAll()
    .then((enterprises) => {
      res.render("register", { enterprises });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro");
    });
});

router.post("/register", (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let phone = req.body.phone;
  let enterprise_id = req.body.enterprise_id;

  Profile.findOne({ where: { name: "user" } })
    .then((profile) => {
      if (!profile) {
        res.status(500).send("Perfil padrão não encontrado");
        return;
      }
      let profile_id = profile.id;

      User.findOne({ where: { email: email } }).then((user) => {
        if (user) {
          res.status(400).send("Email já registrado");
          return;
        }

        let salt = bcrypt.genSaltSync(10);
        let hash = bcrypt.hashSync(password, salt);

        User.create({
          name,
          email,
          password: hash,
          phone,
          enterprise_id,
          profile_id,
        })
          .then(() => {
            res.redirect("/login");
          })
          .catch((error) => {
            console.log(error);
            res.status(500).send("Erro ao criar usuário");
          });
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro");
    });
});

module.exports = router;
