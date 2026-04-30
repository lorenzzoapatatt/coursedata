const express = require("express");
const router = express.Router();
const Course = require("./Course");
const slugify = require("slugify");

router.get("/admin/courses/new", (req, res) => {
  res.render("admin/courses/new");
});

router.post("/courses/save", (req, res) => {
  let name = req.body.name;
  let workload = req.body.workload;
  let description = req.body.description;
  let price = req.body.price;
  let status = req.body.status === "on" ? true : false;

  if (name != undefined && workload != undefined) {
    Course.create({
      name: name,
      workload: workload,
      description: description,
      price: price,
      status: status,
      slug: slugify(name),
    })
      .then(() => {
        res.redirect("/admin/courses");
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/admin/courses/new");
      });
  } else {
    res.redirect("/admin/courses/new");
  }
});

router.get("/admin/courses", (req, res) => {
  Course.findAll()
    .then((courses) => {
      res.render("admin/courses/index", { courses: courses });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Erro ao buscar cursos");
    });
});

router.post("/courses/delete", (req, res) => {
  var id = req.body.id;
  if (id != undefined) {
    if (!isNaN(id)) {
      Course.destroy({
        where: {
          id: id,
        },
      }).then(() => {
        res.redirect("/admin/courses");
      });
    } else {
      // not a number
      res.redirect("/admin/courses");
    }
  } else {
    //NULL
    res.redirect("/admin/courses");
  }
});

router.get("/admin/courses/edit/:id", (req, res) => {
  var id = req.params.id;

  //checks if it's a number
  if (isNaN(id)) {
    return res.redirect("/admin/courses");
  }

  Course.findByPk(id)
    .then((course) => {
      if (course != undefined) {
        res.render("admin/courses/edit", { course: course });
      } else {
        res.redirect("/admin/courses");
      }
    })
    .catch((error) => {
      console.error(error);
      res.redirect("/admin/courses");
    });
});

router.post("/courses/update", (req, res) => {
  var id = req.body.id;
  var name = req.body.name;
  var workload = req.body.workload;
  var description = req.body.description;
  var price = req.body.price;
  var status = req.body.status === "on" ? true : false;

  if (id != undefined && name != undefined && workload != undefined) {
    Course.update(
      {
        name: name,
        workload: workload,
        description: description,
        price: price,
        status: status,
        slug: slugify(name),
      },
      {
        where: { id: id },
      }
    )
      .then(() => {
        res.redirect("/admin/courses");
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/admin/courses/edit/" + id);
      });
  } else {
    res.redirect("/admin/courses/edit/" + id);
  }
});

module.exports = router;
