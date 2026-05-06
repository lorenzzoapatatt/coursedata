const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const session = require("express-session");
const connection = require("./database/database");

const courseController = require("./courses/CourseController");
const userController = require("./users/UserController");
const enterpriseController = require("./enterprises/EnterpriseContoller");

const Course = require("./courses/Course");
const User = require("./users/User");
const Enterprise = require("./enterprises/Enterprise");

//view engine
app.set("view engine", "ejs");

//Sessions
app.use(
  session({
    secret: "Naometoque1371626",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30000000 },
  }),
);

//Redis

//static files
app.use(express.static("public"));

//body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Make session available in views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

//User.sync({ force: true });
//Course.sync({ force: true });

//Database

connection
  .authenticate()
  .then(() => {
    console.log("success");
    return connection.sync({ force: true });
  })
  .then(() => {
    console.log("Database synced");
    const Profile = require("./profiles/Profile");
    Profile.findOrCreate({
      where: { name: "admin" },
      defaults: { description: "Administrador" },
    });
    Profile.findOrCreate({
      where: { name: "professor" },
      defaults: { description: "Professor" },
    });
    Profile.findOrCreate({
      where: { name: "enterprise" },
      defaults: { description: "Empresa" },
    });
    Profile.findOrCreate({
      where: { name: "user" },
      defaults: { description: "Usuário" },
    });
  })
  .catch((error) => {
    console.log(error);
  });

app.get("/", (req, res) => {
  res.render("index");
});

app.use("/", courseController);
app.use("/", userController);
app.use("/", enterpriseController);

app.listen(8080, (req, res) => {
  console.log("running");
});
