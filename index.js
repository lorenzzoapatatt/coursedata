require("dotenv").config({ quiet: true });

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { DataTypes } = require("sequelize");
const path = require("path");
const app = express();
const connection = require("./database/database");
const { canAccess, getAllowedPanelLinks, PERMISSIONS } = require("./middleware/rbac");
const ensureCourseSchema = require("./database/ensureCourseSchema");
const ensureChapterSchema = require("./database/ensureChapterSchema");

const courseController = require("./courses/CourseController");
const userController = require("./users/UserController");
const enterpriseController = require("./enterprises/EnterpriseContoller");
const studentController = require("./students/StudentController");
const professorController = require("./professors/ProfessorController");

require("./courses/Course");
require("./chapters/Chapter");
require("./users/User");
require("./enterprises/Enterprise");
require("./students/Student");
require("./professors/Professor");

app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-env",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30000000 },
  }),
);

app.use(express.static("public"));
app.use(
  "/vendor/mux-uploader",
  express.static(path.join(__dirname, "node_modules/@mux/mux-uploader/dist")),
);
app.use(
  "/vendor/mux-player",
  express.static(path.join(__dirname, "node_modules/@mux/mux-player/dist")),
);

app.use(bodyParser.urlencoded({ extended: false, limit: "20mb" }));
app.use(bodyParser.json({ limit: "20mb" }));

app.use((req, res, next) => {
  const user = req.session.user;

  res.locals.user = user;
  res.locals.navLinks = getAllowedPanelLinks(user);
  res.locals.PERMISSIONS = PERMISSIONS;
  res.locals.canAccess = (permission) => canAccess(user, permission);

  next();
});

connection
  .authenticate()
  .then(() => {
    console.log("Database connected");
    return connection.sync();
  })
  .then(async () => {
    const queryInterface = connection.getQueryInterface();
    const userTable = await queryInterface.describeTable("users");

    if (!userTable.profile_photo) {
      await queryInterface.addColumn("users", "profile_photo", {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      });
    }

    await ensureCourseSchema();
    await ensureChapterSchema();
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
      where: { name: "student" },
      defaults: { description: "Aluno" },
    });
  })
  .catch((error) => {
    console.log(error);
  });

app.get("/", (req, res) => {
  if (req.session?.user) {
    return res.redirect("/dashboard");
  }

  res.render("index");
});

app.use("/", courseController);
app.use("/", userController);
app.use("/", enterpriseController);
app.use("/", studentController);
app.use("/", professorController);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
