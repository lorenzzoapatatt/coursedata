const express = require("express");
const router = express.Router();
const Enterprise = require("./Enterprise");
const enterpriseAuth = require("../middleware/enterpriseAuth");

router.get("/admin/enterprises/new", enterpriseAuth, (req, res) => {
  res.render("admin/enterprises/new");
});

router.get("/admin/enterprises/create", enterpriseAuth, (req, res) => {
  res.redirect("/admin/enterprises/new");
});

router.get("/admin/enterprises", enterpriseAuth, (req, res) => {
  Enterprise.findAll()
    .then((enterprises) => {
      res.render("admin/enterprises/index", { enterprises: enterprises });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Erro ao buscar empresas");
    });
});

router.post("/admin/enterprises/save", enterpriseAuth, (req, res) => {
  let name = req.body.name;
  let cnpj = req.body.cnpj;
  let email = req.body.email;
  let phone = req.body.phone;
  let is_active = req.body.is_active === "on" ? true : false;

  Enterprise.findOne({ where: { email: email } })
    .then((enterprise) => {
      if (enterprise == undefined) {
        Enterprise.create({
          name: name,
          cnpj: cnpj,
          email: email,
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

router.get("/admin/enterprises/edit/:id", enterpriseAuth, (req, res) => {
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

router.post("/admin/enterprises/update", enterpriseAuth, (req, res) => {
  let id = req.body.id;
  let name = req.body.name;
  let cnpj = req.body.cnpj;
  let email = req.body.email;
  let phone = req.body.phone;
  let is_active = req.body.is_active === "on" ? true : false;

  if (id != undefined && !isNaN(id)) {
    Enterprise.update(
      {
        name: name,
        cnpj: cnpj,
        email: email,
        phone: phone,
        is_active: is_active,
      },
      {
        where: { id: id },
      },
    )
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

router.post("/admin/enterprises/delete", (req, res) => {
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

module.exports = router;
