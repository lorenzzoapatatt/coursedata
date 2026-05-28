# 📖 Exemplo Prático: Atualizar CourseController

Este arquivo mostra exatamente como atualizar seu `CourseController` para usar o novo sistema RBAC.

## ❌ Código Antigo

```javascript
const express = require("express");
const router = express.Router();
const Course = require("./Course");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

// Ver cursos (precisa estar autenticado)
router.get("/courses", auth, (req, res) => {
  Course.findAll().then((courses) => {
    res.render("courses/index", { courses });
  });
});

// Criar curso (apenas admin)
router.post("/courses/create", adminOnly, (req, res) => {
  // ... criar curso
});

// Editar curso (admin ou professor)
router.put("/course/:id", auth, (req, res) => {
  if (
    req.session.user.profile === "admin" ||
    req.session.user.profile === "professor"
  ) {
    // ... atualizar
  } else {
    res.status(403).send("Sem permissão");
  }
});
```

---

## ✅ Código Novo

```javascript
const express = require("express");
const router = express.Router();
const Course = require("./Course");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

// Ver cursos (requer estar autenticado)
router.get("/courses", authenticate, (req, res) => {
  Course.findAll().then((courses) => {
    res.render("courses/index", { courses });
  });
});

// Criar curso (requer permissão course:create)
router.post(
  "/course/create",
  authenticate,
  authorize("course:create"),
  (req, res) => {
    const { name, description } = req.body;

    Course.create({
      name: name,
      description: description,
    })
      .then(() => {
        res.redirect("/courses");
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Erro ao criar curso");
      });
  },
);

// Editar curso (requer permissão course:edit)
router.put(
  "/course/:id",
  authenticate,
  authorize("course:edit"),
  (req, res) => {
    const id = req.params.id;
    const { name, description } = req.body;

    Course.update({ name, description }, { where: { id } })
      .then(() => {
        res.redirect("/courses");
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Erro ao atualizar curso");
      });
  },
);

// Deletar curso (requer permissão course:delete)
router.delete(
  "/course/:id",
  authenticate,
  authorize("course:delete"),
  (req, res) => {
    const id = req.params.id;

    Course.destroy({ where: { id } })
      .then(() => {
        res.redirect("/courses");
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Erro ao deletar curso");
      });
  },
);

module.exports = router;
```

---

## 📝 Mudanças Principais

### 1. Imports Atualizados

**Antes:**

```javascript
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
```

**Depois:**

```javascript
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
```

### 2. Middlewares na Rota

**Antes:**

```javascript
router.post("/courses/create", adminOnly, handler);
```

**Depois:**

```javascript
router.post(
  "/course/create",
  authenticate,
  authorize("course:create"),
  handler,
);
```

### 3. Sem if/else de Role

**Antes:**

```javascript
if (
  req.session.user.profile === "admin" ||
  req.session.user.profile === "professor"
) {
  // ... faz algo
} else {
  res.status(403).send("Sem permissão");
}
```

**Depois:**

```javascript
// O middleware authorize já faz isso automaticamente!
// Se não tiver permissão, retorna 403
```

---

## 🎯 Padrão para Proteger Rotas

### GET - Listar/Ver

```javascript
router.get(
  "/courses",
  authenticate, // ← Precisa estar logado
  (req, res) => {
    // ... mostrar lista
  },
);
```

### POST - Criar

```javascript
router.post(
  "/course/create",
  authenticate, // ← Precisa estar logado
  authorize("course:create"), // ← Precisa de permissão
  (req, res) => {
    // ... criar
  },
);
```

### PUT - Atualizar

```javascript
router.put(
  "/course/:id",
  authenticate, // ← Precisa estar logado
  authorize("course:edit"), // ← Precisa de permissão
  (req, res) => {
    // ... atualizar
  },
);
```

### DELETE - Remover

```javascript
router.delete(
  "/course/:id",
  authenticate, // ← Precisa estar logado
  authorize("course:delete"), // ← Precisa de permissão
  (req, res) => {
    // ... deletar
  },
);
```

---

## 💡 Exemplos com Múltiplas Permissões

### Requer TODAS as Permissões

```javascript
// Requer AMBAS: course:delete E admin:panel
router.delete(
  "/course/:id",
  authenticate,
  authorize(["course:delete", "admin:panel"]),
  handler,
);
```

### Requer ALGUMA das Permissões

```javascript
// Requer: course:create OU admin:panel
router.post(
  "/course",
  authenticate,
  authorize(["course:create", "admin:panel"], { requireAll: false }),
  handler,
);
```

---

## 🔍 Exemplo Completo: CourseController Atualizado

```javascript
const express = require("express");
const router = express.Router();
const Course = require("./Course");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

/**
 * GET /courses
 * Listar todos os cursos (requer autenticação)
 */
router.get("/courses", authenticate, (req, res) => {
  try {
    Course.findAll().then((courses) => {
      res.render("courses/index", {
        courses: courses,
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Erro ao buscar cursos:", error);
    res.status(500).send("Erro ao buscar cursos");
  }
});

/**
 * GET /course/new
 * Formulário para criar novo curso
 */
router.get(
  "/course/new",
  authenticate,
  authorize("course:create"),
  (req, res) => {
    res.render("courses/new");
  },
);

/**
 * POST /course
 * Criar novo curso
 */
router.post("/course", authenticate, authorize("course:create"), (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).render("courses/new", {
        error: "Nome e descrição são obrigatórios",
      });
    }

    Course.create({
      name: name,
      description: description,
    })
      .then(() => {
        res.redirect("/courses");
      })
      .catch((error) => {
        console.error("Erro ao criar curso:", error);
        res.status(500).render("courses/new", {
          error: "Erro ao criar curso",
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao processar requisição");
  }
});

/**
 * GET /course/:id/edit
 * Formulário para editar curso
 */
router.get(
  "/course/:id/edit",
  authenticate,
  authorize("course:edit"),
  (req, res) => {
    Course.findByPk(req.params.id).then((course) => {
      if (!course) {
        return res.status(404).send("Curso não encontrado");
      }
      res.render("courses/edit", { course });
    });
  },
);

/**
 * PUT /course/:id
 * Atualizar curso
 */
router.put(
  "/course/:id",
  authenticate,
  authorize("course:edit"),
  (req, res) => {
    try {
      const id = req.params.id;
      const { name, description } = req.body;

      if (!name || !description) {
        return res.status(400).send("Nome e descrição são obrigatórios");
      }

      Course.update({ name, description }, { where: { id } })
        .then(() => {
          res.redirect("/courses");
        })
        .catch((error) => {
          console.error("Erro ao atualizar curso:", error);
          res.status(500).send("Erro ao atualizar curso");
        });
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao processar requisição");
    }
  },
);

/**
 * DELETE /course/:id
 * Deletar curso
 */
router.delete(
  "/course/:id",
  authenticate,
  authorize("course:delete"),
  (req, res) => {
    try {
      const id = req.params.id;

      Course.destroy({ where: { id } })
        .then(() => {
          res.redirect("/courses");
        })
        .catch((error) => {
          console.error("Erro ao deletar curso:", error);
          res.status(500).send("Erro ao deletar curso");
        });
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao processar requisição");
    }
  },
);

module.exports = router;
```

---

## 📋 Checklist para Atualizar Controller

- [ ] Remover imports dos middlewares antigos (`adminAuth`, `adminOnly`)
- [ ] Adicionar imports dos novos (`authenticate`, `authorize`)
- [ ] Adicionar `authenticate` em todas as rotas que precisam de login
- [ ] Adicionar `authorize("permissão")` em todas as rotas que precisam de permissão
- [ ] Remover todos os `if (user.role === "X")` e substituir por `authorize()`
- [ ] Testar cada rota (com usuario que tem permissão e sem)
- [ ] Testar 403 (erro de permissão)
- [ ] Testar 401 (não autenticado)

---

## 🧪 Como Testar

### Teste 1: Sem Autenticação

```bash
# Tentar acessar rota protegida sem estar logado
# Resultado esperado: Redirecionado para /login ✅
```

### Teste 2: Com Autenticação, Sem Permissão

```bash
# 1. Fazer login com "aluno"
# 2. Tentar acessar rota que requer "course:create"
# Resultado esperado: Erro 403 ✅
```

### Teste 3: Com Autenticação e Permissão

```bash
# 1. Fazer login com "professor"
# 2. Tentar acessar rota que requer "course:create"
# Resultado esperado: Sucesso 200 ✅
```

---

## 🔄 Padrão Reusável

Agora que você entendeu o padrão, aplique-o em todos os seus controllers:

```
Para CADA rota:
1. Adicionar authenticate
2. Adicionar authorize com a permissão apropriada
3. Remover if/else de role
4. Testar!
```

Simples assim! 🎉
