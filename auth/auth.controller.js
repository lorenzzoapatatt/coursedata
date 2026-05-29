const express = require("express");
const router = express.Router();
const AuthService = require("./auth.service");
const Enterprise = require("../enterprises/Enterprise");
const Role = require("../models/Role");

/**
 * GET /login
 * Exibir página de seleção do tipo de conta para login
 */
router.get("/login", (req, res) => {
  res.render("login-selection");
});

/**
 * GET /login/user
 * Exibir login para usuário/aluno
 */
router.get("/login/user", (req, res) => {
  res.render("login", {
    accountTypeName: "Usuário",
    accountTypeValue: "aluno",
    returnPath: "/login",
  });
});

/**
 * GET /login/professor
 * Exibir login para professor
 */
router.get("/login/professor", (req, res) => {
  res.render("login", {
    accountTypeName: "Professor",
    accountTypeValue: "professor",
    returnPath: "/login",
  });
});

/**
 * GET /login/enterprise
 * Redirecionar para o login de empresa existente
 */
router.get("/login/enterprise", (req, res) => {
  res.redirect("/enterprise/login");
});

/**
 * POST /auth/login
 * Autenticar usuário
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, accountType } = req.body;

    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Email e senha são obrigatórios",
        accountTypeName:
          accountType === "professor"
            ? "Professor"
            : accountType === "aluno"
              ? "Usuário"
              : undefined,
        accountTypeValue: accountType,
        returnPath: "/login",
      });
    }

    const user = await AuthService.login(email, password, accountType);

    req.session.user = user;

    res.redirect("/");
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    res.status(401).render("login", {
      error: error.message,
      accountTypeName:
        req.body.accountType === "professor"
          ? "Professor"
          : req.body.accountType === "aluno"
            ? "Usuário"
            : undefined,
      accountTypeValue: req.body.accountType,
      returnPath: "/login",
    });
  }
});

/**
 * GET /register
 * Exibir página de seleção do tipo de conta para registro
 */
router.get("/register", (req, res) => {
  res.render("register-selection");
});

async function renderRegistrationForm(req, res, roleName, accountTypeName) {
  try {
    const enterprises = await Enterprise.findAll();
    const selectedRole = await Role.findOne({ where: { name: roleName } });

    if (!selectedRole) {
      return res.status(500).send("Tipo de conta não encontrado");
    }

    res.render("register", {
      enterprises,
      selectedRole,
      accountTypeName,
    });
  } catch (error) {
    console.error("Erro ao carregar página de registro:", error);
    res.status(500).send("Erro ao carregar página de registro");
  }
}

router.get("/register/user", (req, res) =>
  renderRegistrationForm(req, res, "aluno", "Usuário"),
);
router.get("/register/professor", (req, res) =>
  renderRegistrationForm(req, res, "professor", "Professor"),
);

/**
 * POST /auth/register
 * Registrar novo usuário
 */
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone, enterprise_id, role_id } = req.body;

    if (!name || !email || !password || !enterprise_id || !role_id) {
      const enterprises = await Enterprise.findAll();
      const selectedRole = await Role.findOne({ where: { id: role_id } });
      return res.status(400).render("register", {
        error: "Todos os campos obrigatórios devem ser preenchidos",
        enterprises,
        selectedRole,
      });
    }

    await AuthService.register({
      name,
      email,
      password,
      phone,
      enterprise_id,
      role_id,
    });

    const user = await AuthService.login(email, password);
    req.session.user = user;

    res.redirect("/");
  } catch (error) {
    console.error("Erro ao registrar:", error.message);
    const enterprises = await Enterprise.findAll();
    const selectedRole = await Role.findOne({
      where: { id: req.body.role_id },
    });
    res.status(400).render("register", {
      error: error.message,
      enterprises,
      selectedRole,
    });
  }
});

/**
 * GET /logout
 * Fazer logout do usuário
 */
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao fazer logout:", err);
    }
    res.redirect("/login");
  });
});

module.exports = router;
