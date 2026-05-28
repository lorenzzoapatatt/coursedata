# Como Usar Middlewares e Proteger Rotas

## 📚 Índice

1. [Middleware authenticate](#middleware-authenticate)
2. [Middleware authorize](#middleware-authorize)
3. [Exemplos de Rotas Protegidas](#exemplos-de-rotas-protegidas)
4. [Verificação Manual de Permissões](#verificação-manual-de-permissões)

---

## 🔐 Middleware authenticate

Verifica se o usuário está **autenticado** (fez login).

### Importar o Middleware

```javascript
const authenticate = require("../middlewares/authenticate");
```

### Usar em Uma Rota

```javascript
const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");

// ✅ Apenas usuários autenticados
router.get("/dashboard", authenticate, (req, res) => {
  const user = req.session.user;
  res.render("dashboard", { user });
});

module.exports = router;
```

### Usar em Múltiplas Rotas

```javascript
const courseController = require("./courses/CourseController");
const authenticate = require("./middlewares/authenticate");

// ✅ Todas as rotas de cursos requerem autenticação
app.use("/courses", authenticate, courseController);
```

### O que Acontece se Não Estiver Autenticado?

O usuário é **redirecionado para `/login`**:

```javascript
// Código do middleware:
function authenticate(req, res, next) {
  if (req.session.user !== undefined) {
    next(); // ✅ Prossegue
  } else {
    res.redirect("/login"); // ❌ Redireciona para login
  }
}
```

---

## 🛡️ Middleware authorize

Verifica se o usuário tem **permissão específica**.

> ⚠️ O middleware `authorize` assume que o usuário já está autenticado. Use sempre com `authenticate`.

### Importar o Middleware

```javascript
const authorize = require("../middlewares/authorize");
```

### Sintaxe Básica

```javascript
// Permissão única
authorize("permissão:ação");

// Múltiplas permissões (requer TODAS)
authorize(["permissão:ação1", "permissão:ação2"]);

// Com opções
authorize("permissão:ação", { requireAll: true / false });
```

### Exemplos

#### 1️⃣ Uma Permissão

```javascript
const authorize = require("../middlewares/authorize");

// ✅ Apenas quem pode criar cursos
router.post("/course/create", authorize("course:create"), (req, res) => {
  // Criar novo curso
});
```

**Quem acessa?**

- ✅ Admin
- ✅ Enterprise
- ✅ Qualquer usuário com permissão `course:create`

**Quem não acessa?**

- ❌ Aluno
- ❌ Sem a permissão específica → Erro 403

---

#### 2️⃣ Múltiplas Permissões (requer TODAS)

```javascript
// ✅ Requer AMBAS as permissões
router.delete(
  "/lesson/:id",
  authorize(["lesson:delete", "course:edit"]),
  (req, res) => {
    // Deletar aula
  },
);
```

**Quem acessa?**

- ✅ Apenas quem tem `lesson:delete` E `course:edit`

---

#### 3️⃣ Múltiplas Permissões (requer ALGUMA)

```javascript
// ✅ Requer ALGUMA das permissões
router.post(
  "/comment",
  authorize(["comment:create", "admin:panel"], { requireAll: false }),
  (req, res) => {
    // Criar comentário
  },
);
```

**Quem acessa?**

- ✅ Quem tem `comment:create` OU `admin:panel`

---

### O que Acontece se Não Tiver Permissão?

O usuário recebe erro **403 Forbidden**:

```javascript
// Código do middleware:
res.status(403).render("error", {
  message: "Você não tem permissão para acessar este recurso",
});
```

---

## 💡 Exemplos de Rotas Protegidas

### Exemplo 1: CourseController

```javascript
const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const Course = require("./Course");

// ✅ Ver cursos (requer estar autenticado)
router.get("/courses", authenticate, (req, res) => {
  Course.findAll().then((courses) => {
    res.render("courses/index", { courses });
  });
});

// ✅ Criar curso (requer permissão específica)
router.post("/course", authenticate, authorize("course:create"), (req, res) => {
  const { name, description } = req.body;
  Course.create({ name, description }).then(() => {
    res.redirect("/courses");
  });
});

// ✅ Editar curso
router.put(
  "/course/:id",
  authenticate,
  authorize("course:edit"),
  (req, res) => {
    // ... atualizar curso
  },
);

// ✅ Deletar curso
router.delete(
  "/course/:id",
  authenticate,
  authorize(["course:delete", "admin:panel"], { requireAll: false }),
  (req, res) => {
    // ... deletar curso
  },
);

module.exports = router;
```

### Exemplo 2: Painel Admin

```javascript
const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

// ✅ Painel admin (requer admin:panel)
router.get("/admin", authenticate, authorize("admin:panel"), (req, res) => {
  res.render("admin/dashboard");
});

// ✅ Gerenciar usuários (requer user:manage)
router.get(
  "/admin/users",
  authenticate,
  authorize("user:manage"),
  (req, res) => {
    // ... listar usuários
  },
);

// ✅ Gerenciar roles (requer role:manage)
router.post(
  "/admin/role/:id/permissions",
  authenticate,
  authorize("role:manage"),
  (req, res) => {
    // ... atualizar permissões
  },
);

module.exports = router;
```

### Exemplo 3: Aulas (Lessons)

```javascript
const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const Lesson = require("./Lesson");

// ✅ Ver aulas (qualquer autenticado)
router.get("/lessons", authenticate, (req, res) => {
  Lesson.findAll().then((lessons) => {
    res.render("lessons/index", { lessons });
  });
});

// ✅ Professor pode criar aula
router.post(
  "/lesson/create",
  authenticate,
  authorize("lesson:create"),
  (req, res) => {
    // ... criar aula
  },
);

// ✅ Editar aula (professor ou admin)
router.put(
  "/lesson/:id",
  authenticate,
  authorize(["lesson:edit", "admin:panel"], { requireAll: false }),
  (req, res) => {
    // ... editar aula
  },
);

// ✅ Deletar aula (requer ambas)
router.delete(
  "/lesson/:id",
  authenticate,
  authorize(["lesson:delete", "course:edit"]),
  (req, res) => {
    // ... deletar aula
  },
);

module.exports = router;
```

---

## 🔍 Verificação Manual de Permissões

Às vezes você precisa verificar permissão **dentro do controller**, não apenas na rota.

### AuthService - Métodos Disponíveis

```javascript
const AuthService = require("../auth/auth.service");

// Verificar uma permissão
AuthService.hasPermission(userPermissions, "course:create");
// → true / false

// Verificar múltiplas (todas)
AuthService.hasPermission(userPermissions, ["course:create", "lesson:edit"]);
// → true / false

// Verificar múltiplas (alguma)
AuthService.hasAnyPermission(userPermissions, [
  "comment:delete",
  "admin:panel",
]);
// → true / false
```

### Exemplo de Uso

```javascript
const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const AuthService = require("../auth/auth.service");
const Course = require("./Course");

router.get("/dashboard", authenticate, (req, res) => {
  const user = req.session.user;
  const userPerms = user.permissions;

  // Verificar diferentes permissões
  const canCreateCourse = AuthService.hasPermission(userPerms, "course:create");
  const canManageUsers = AuthService.hasPermission(userPerms, "user:manage");
  const isAdmin = AuthService.hasPermission(userPerms, "admin:panel");

  // Ou verificar ALGUMA de múltiplas
  const canModerate = AuthService.hasAnyPermission(userPerms, [
    "comment:delete",
    "admin:panel",
  ]);

  res.render("dashboard", {
    user,
    canCreateCourse,
    canManageUsers,
    isAdmin,
    canModerate,
  });
});

module.exports = router;
```

### Exemplo na View (EJS)

```ejs
<div class="dashboard">
  <% if (canCreateCourse) { %>
    <a href="/course/new" class="btn btn-primary">
      ➕ Criar Novo Curso
    </a>
  <% } %>

  <% if (canManageUsers) { %>
    <a href="/admin/users" class="btn btn-secondary">
      👥 Gerenciar Usuários
    </a>
  <% } %>

  <% if (isAdmin) { %>
    <a href="/admin/panel" class="btn btn-danger">
      ⚙️ Painel Admin
    </a>
  <% } %>

  <% if (canModerate) { %>
    <section class="moderation">
      <!-- Seção de moderação -->
    </section>
  <% } %>
</div>
```

---

## 📋 Checklist para Proteger Rota

1. **Importar middlewares:**

   ```javascript
   const authenticate = require("../middlewares/authenticate");
   const authorize = require("../middlewares/authorize");
   ```

2. **Definir permissão necessária** (em `config/permissions.js`):

   ```javascript
   COURSE_DELETE: "course:delete",
   ```

3. **Adicionar a rota:**

   ```javascript
   router.delete(
     "/course/:id",
     authenticate,
     authorize("course:delete"),
     (req, res) => {
       /* ... */
     },
   );
   ```

4. **Atribuir permissão ao role:**

   ```sql
   INSERT INTO role_permissions (role_id, permission_id, ...)
   VALUES (2, 5, ...);
   ```

5. **Testar:**
   - ✅ Fazer login com usuário que tem permissão
   - ❌ Fazer login com usuário que NÃO tem permissão
   - Verificar que recebe erro 403

---

## 🆘 Troubleshooting

| Erro                         | Causa           | Solução                                 |
| ---------------------------- | --------------- | --------------------------------------- |
| Redirecionado para `/login`  | Não autenticado | Fazer login via `/login`                |
| Erro 403                     | Sem permissão   | Pedir ao admin para adicionar permissão |
| Permissão não atualiza       | Sessão em cache | Fazer logout e login novamente          |
| `req.session.user` undefined | Não autenticado | Adicionar `authenticate` middleware     |
