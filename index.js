const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const connection = require("./database/database");

const courseController = require("./courses/CourseController");
const userController = require("./users/UserController");

const Course = require("./courses/Course");
const User = require("./users/User");

//view engine
app.set("view engine", "ejs");

//static files
app.use(express.static("public"));

//body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//User.sync({ alter: true });
//Course.sync({ alter: true });

//Database

connection
  .authenticate()
  .then(() => {
    console.log("success");
  })
  .catch((error) => {
    console.log(error);
  });

app.get("/", (req, res) => {
  res.render("index");
});

app.use("/", courseController);
app.use("/", userController);

app.listen(8080, (req, res) => {
  console.log("running");
});
