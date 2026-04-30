const express = require("express");
const router = express.Router();
const User = require("./User");
const bcryptjs = require("bcryptjs");

// Registro
router.get("/auth/register", (req, res) => {
  res.render("auth/register");
});

router.post("/auth/register", async (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;

  if (email && password && name) {
    const userExists = await User.findOne({ where: { email: email } });

    if (userExists) {
      res.send("Email já registrado!");
      return;
    }

    const hash = await bcryptjs.hash(password, 10);

    User.create({
      name: name,
      email: email,
      password: hash,
    })
      .then(() => {
        res.redirect("/");
      })
      .catch((error) => {
        console.error(error);
        res.send("Erro ao registrar usuário");
      });
  } else {
    res.send("Preencha todos os campos!");
  }
});

// Login
router.get("/auth/login", (req, res) => {
  res.render("auth/login");
});

router.post("/auth/login", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  if (email && password) {
    const user = await User.findOne({ where: { email: email } });

    if (user) {
      const passwordMatch = await bcryptjs.compare(password, user.password);

      if (passwordMatch) {
        // Usuário autenticado com sucesso
        req.session.userId = user.id;
        res.redirect("/");
      } else {
        res.send("Senha incorreta!");
      }
    } else {
      res.send("Usuário não encontrado!");
    }
  } else {
    res.send("Preencha todos os campos!");
  }
});

// Logout
router.get("/auth/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;
