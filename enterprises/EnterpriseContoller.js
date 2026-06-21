const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Enterprise = require("./Enterprise");
const { authorize, PERMISSIONS, ROLES } = require("../middleware/rbac");
const enterprisePanelAuth = authorize(PERMISSIONS.ENTERPRISE_PANEL, {
  loginPath: "/login",
});

router.get("/admin/enterprises/new", enterprisePanelAuth, (req, res) => {
  res.render("admin/enterprises/new");
});

router.get("/admin/enterprises/create", enterprisePanelAuth, (req, res) => {
  res.redirect("/admin/enterprises/new");
});

router.get("/admin/enterprises", enterprisePanelAuth, (req, res) => {
  Enterprise.findAll()
    .then((enterprises) => {
      res.render("admin/enterprises/index", { enterprises: enterprises });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao buscar empresas");
    });
});

router.post("/admin/enterprises/save", enterprisePanelAuth, (req, res) => {
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
});

router.get("/admin/enterprises/edit/:id", enterprisePanelAuth, (req, res) => {
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
});

router.post("/admin/enterprises/update", enterprisePanelAuth, (req, res) => {
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
});

router.post("/admin/enterprises/delete", enterprisePanelAuth, (req, res) => {
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
});

router.get("/enterprise/login", (req, res) => {
  res.redirect("/login");
});

router.post("/enterprise/auth", (req, res) => {
  res.redirect(307, "/auth");
});

router.get("/enterprise/register", (req, res) => {
  res.render("enterprise-register");
});

router.post("/enterprise/register", (req, res) => {
  let name = req.body.name;
  let cnpj = req.body.cnpj;
  let email = req.body.email;
  let password = req.body.password;
  let phone = req.body.phone;

  if (!password) {
    return res.status(400).send("Senha obrigatória");
  }

  Enterprise.findOne({ where: { email: email } }).then((enterprise) => {
    if (enterprise) {
      return res.status(400).send("Email já registrado");
    }

    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);

    Enterprise.create({
      name: name,
      cnpj: cnpj,
      email: email,
      password: hash,
      phone: phone,
      is_active: true,
    })
      .then((enterprise) => {
        req.session.user = {
          id: enterprise.id,
          name: enterprise.name,
          email: enterprise.email,
          profile: ROLES.ENTERPRISE,
          enterprise_id: enterprise.id,
          profile_photo: "/images/user-profile-photo.svg",
        };

        res.redirect("/dashboard");
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send("Erro ao criar empresa");
      });
  });
});

router.get("/enterprise/logout", (req, res) => {
  req.session.user = undefined;
  res.redirect("/");
});

module.exports = router;
