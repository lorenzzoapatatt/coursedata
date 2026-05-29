const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Enterprise = require("./Enterprise");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

router.get(
  "/admin/enterprises/new",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    res.render("admin/enterprises/new");
  },
);

router.get(
  "/admin/enterprises/create",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    res.redirect("/admin/enterprises/new");
  },
);

router.get(
  "/admin/enterprises",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    Enterprise.findAll()
      .then((enterprises) => {
        res.render("admin/enterprises/index", { enterprises: enterprises });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send("Erro ao buscar empresas");
      });
  },
);

router.post(
  "/admin/enterprises/save",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    let name = req.body.name;
    let cnpj = req.body.cnpj;
    let email = req.body.email;
    let password = req.body.password;
    let phone = req.body.phone;
    let is_active = req.body.is_active === "on" ? true : false;

    if (!password) {
      return res.status(400).send("Senha obrigatória");
    }

    Enterprise.findOne({ where: { email: email } })
      .then((enterprise) => {
        if (enterprise == undefined) {
          let salt = bcrypt.genSaltSync(10);
          let hash = bcrypt.hashSync(password, salt);

          Enterprise.create({
            name: name,
            cnpj: cnpj,
            email: email,
            password: hash,
            phone: phone,
            is_active: is_active,
          })
            .then(() => {
              res.redirect("/admin/enterprises");
            })
            .catch((error) => {
              console.log(error);
              res.status(500).send("Erro ao criar empresa");
            });
        } else {
          res.status(400).send("Email já registrado");
        }
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send("Erro ao processar solicitação");
      });
  },
);

router.get(
  "/admin/enterprises/edit/:id",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    let id = req.params.id;

    if (isNaN(id)) {
      return res.redirect("/admin/enterprises");
    }

    Enterprise.findByPk(id)
      .then((enterprise) => {
        if (enterprise != undefined) {
          res.render("admin/enterprises/edit", { enterprise: enterprise });
        } else {
          res.redirect("/admin/enterprises");
        }
      })
      .catch((error) => {
        console.log(error);
        res.redirect("/admin/enterprises");
      });
  },
);

router.post(
  "/admin/enterprises/update",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    let id = req.body.id;
    let name = req.body.name;
    let cnpj = req.body.cnpj;
    let email = req.body.email;
    let password = req.body.password;
    let phone = req.body.phone;
    let is_active = req.body.is_active === "on" ? true : false;

    if (id != undefined && !isNaN(id)) {
      const updatedData = {
        name: name,
        cnpj: cnpj,
        email: email,
        phone: phone,
        is_active: is_active,
      };

      if (password) {
        let salt = bcrypt.genSaltSync(10);
        updatedData.password = bcrypt.hashSync(password, salt);
      }

      Enterprise.update(updatedData, {
        where: { id: id },
      })
        .then(() => {
          res.redirect("/admin/enterprises");
        })
        .catch((error) => {
          console.log(error);
          res.redirect("/admin/enterprises/edit/" + id);
        });
    } else {
      res.redirect("/admin/enterprises");
    }
  },
);

router.post(
  "/admin/enterprises/delete",
  authenticate,
  authorize("admin:panel"),
  (req, res) => {
    let id = req.body.id;

    if (id != undefined && !isNaN(id)) {
      Enterprise.destroy({
        where: { id: id },
      })
        .then(() => {
          res.redirect("/admin/enterprises");
        })
        .catch((error) => {
          console.log(error);
          res.redirect("/admin/enterprises");
        });
    } else {
      res.redirect("/admin/enterprises");
    }
  },
);

module.exports = router;
