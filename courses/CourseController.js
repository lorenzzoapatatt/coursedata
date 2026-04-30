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
    }).then(() => {
      res.redirect("/admin/courses");
    });
  } else {
    res.redirect("/admin/courses/new");
  }
});

router.get("/admin/courses", (req, res) => {
  Course.findAll().then((courses) => {
    res.render("admin/courses/index", { courses: courses });
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
    res.redirect("/admin/courses");
  }

  Course.findByPk(id)
    .then((courses) => {
      if (courses != undefined) {
        res.render("admin/courses/edit", { courses: courses });
      } else {
        res.redirect("/admin/courses");
      }
    })
    .catch((error) => {
      res.redirect("/admin/courses");
    });
});

module.exports = router;
