const express = require("express");
const router = express.Router();
const AuthService = require("./auth.service");
const User = require("../users/User");
const Enterprise = require("../enterprises/Enterprise");
const Role = require("../models/Role");

/**
 * GET /login
 * Exibir página de login
 */
router.get("/login", (req, res) => {
  res.render("login");
});

/**
 * POST /auth/login
 * Autenticar usuário
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Email e senha são obrigatórios",
      });
    }

    // Fazer login
    const user = await AuthService.login(email, password);

    // Salvar na sessão
    req.session.user = user;

    res.redirect("/");
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    res.status(401).render("login", {
      error: error.message,
    });
  }
});

/**
 * GET /register
 * Exibir página de registro
 */
router.get("/register", async (req, res) => {
  try {
    const enterprises = await Enterprise.findAll();
    const roles = await Role.findAll({
      where: { name: ["aluno", "professor", "enterprise"] },
    });

    res.render("register", { enterprises, roles });
  } catch (error) {
    console.error("Erro ao carregar página de registro:", error);
    res.status(500).send("Erro ao carregar página de registro");
  }
});

/**
 * POST /auth/register
 * Registrar novo usuário
 */
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone, enterprise_id, role_id } = req.body;

    // Validar entrada
    if (!name || !email || !password || !enterprise_id || !role_id) {
      const enterprises = await Enterprise.findAll();
      const roles = await Role.findAll();
      return res.status(400).render("register", {
        error: "Todos os campos obrigatórios devem ser preenchidos",
        enterprises,
        roles,
      });
    }

    // Registrar usuário
    await AuthService.register({
      name,
      email,
      password,
      phone,
      enterprise_id,
      role_id,
    });

    // Fazer login automático
    const user = await AuthService.login(email, password);
    req.session.user = user;

    res.redirect("/");
  } catch (error) {
    console.error("Erro ao registrar:", error.message);
    const enterprises = await Enterprise.findAll();
    const roles = await Role.findAll();
    res.status(400).render("register", {
      error: error.message,
      enterprises,
      roles,
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
