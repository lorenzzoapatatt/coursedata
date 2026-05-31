const express = require("express");
const router = express.Router();
const AuthService = require("./auth.service");
const Enterprise = require("../enterprises/Enterprise");
const Role = require("../models/Role");
const bcrypt = require("bcryptjs");

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
        accountTypeName: selectedRole
          ? selectedRole.name.charAt(0).toUpperCase() +
            selectedRole.name.slice(1)
          : undefined,
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
      accountTypeName: selectedRole
        ? selectedRole.name.charAt(0).toUpperCase() + selectedRole.name.slice(1)
        : undefined,
    });
  }
});

/**
 * GET /login/enterprise
 * Exibir login para empresa
 */
router.get("/login/enterprise", (req, res) => {
  res.render("enterprise-login");
});

/**
 * POST /enterprise/auth
 * Autenticar empresa
 */
router.post("/enterprise/auth", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("enterprise-login", {
        error: "Email e senha são obrigatórios",
      });
    }

    const enterprise = await Enterprise.findOne({ where: { email: email } });

    if (!enterprise) {
      return res.status(401).render("enterprise-login", {
        error: "Empresa não encontrada",
      });
    }

    if (!enterprise.is_active) {
      return res.status(401).render("enterprise-login", {
        error: "Empresa inativa",
      });
    }

    const passwordValid = bcrypt.compareSync(password, enterprise.password);
    if (!passwordValid) {
      return res.status(401).render("enterprise-login", {
        error: "Senha incorreta",
      });
    }

    req.session.user = {
      id: enterprise.id,
      name: enterprise.name,
      email: enterprise.email,
      role: "enterprise",
      type: "enterprise",
    };

    res.redirect("/");
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    res.status(500).render("enterprise-login", {
      error: "Erro ao processar login",
    });
  }
});

/**
 * GET /register/enterprise
 * Exibir registro para empresa
 */
router.get("/register/enterprise", (req, res) => {
  res.render("enterprise-register");
});

/**
 * POST /enterprise/register
 * Registrar nova empresa
 */
router.post("/enterprise/register", async (req, res) => {
  try {
    const { name, cnpj, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("enterprise-register", {
        error: "Nome, email e senha são obrigatórios",
      });
    }

    const existingEnterprise = await Enterprise.findOne({
      where: { email: email },
    });

    if (existingEnterprise) {
      return res.status(400).render("enterprise-register", {
        error: "Email já registrado",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const enterprise = await Enterprise.create({
      name,
      cnpj: cnpj || null,
      email,
      password: hashedPassword,
      phone: phone || null,
      is_active: true,
    });

    req.session.user = {
      id: enterprise.id,
      name: enterprise.name,
      email: enterprise.email,
      role: "enterprise",
      type: "enterprise",
    };

    res.redirect("/");
  } catch (error) {
    console.error("Erro ao registrar:", error.message);
    res.status(500).render("enterprise-register", {
      error: "Erro ao processar registro",
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
