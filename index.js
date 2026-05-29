const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const session = require("express-session");
const connection = require("./database/database");

// Controllers
const authController = require("./auth/auth.controller");
const courseController = require("./courses/CourseController");
const enterpriseController = require("./enterprises/EnterpriseContoller");

// Middlewares
const authenticate = require("./middlewares/authenticate");
const authorize = require("./middlewares/authorize");

// Models
const Course = require("./courses/Course");
const User = require("./users/User");
const Enterprise = require("./enterprises/Enterprise");
const Role = require("./models/Role");
const Permission = require("./models/Permission");
const RolePermission = require("./models/RolePermission");

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
    console.log("Conectado ao banco de dados");
    return connection.sync({ force: false });
  })
  .then(async () => {
    console.log("Banco de dados sincronizado");

    // Criar roles
    const roles = await Role.findOrCreate({
      where: { name: "admin" },
      defaults: { description: "Administrador - acesso total" },
    });

    await Role.findOrCreate({
      where: { name: "professor" },
      defaults: { description: "Professor - pode criar aulas" },
    });

    await Role.findOrCreate({
      where: { name: "aluno" },
      defaults: { description: "Aluno - pode visualizar cursos" },
    });

    await Role.findOrCreate({
      where: { name: "enterprise" },
      defaults: { description: "Empresa - gerencia professores e alunos" },
    });

    console.log("Roles criados com sucesso");
  })
  .catch((error) => {
    console.error("Erro ao conectar/sincronizar banco de dados:", error);
  });

app.get("/", (req, res) => {
  res.render("index");
});

// Routes de Autenticação
app.use("/", authController);

// Routes de Cursos
app.use("/", courseController);

// Routes de Empresas
app.use("/", enterpriseController);

app.listen(8080, (req, res) => {
  console.log("running");
});
