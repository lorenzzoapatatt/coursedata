# Como Usar o Sistema RBAC (Role-Based Access Control)

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo de Autenticação](#fluxo-de-autenticação)
3. [Estrutura de Roles e Permissões](#estrutura-de-roles-e-permissões)
4. [Como Adicionar Usuários](#como-adicionar-usuários)
5. [Como Gerenciar Permissões](#como-gerenciar-permissões)
6. [Como Usar Middlewares](#como-usar-middlewares)
7. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

O sistema foi refatorado para usar **RBAC (Role-Based Access Control)**, uma abordagem profissional e segura de gerenciar permissões.

### Antes (❌ INCORRETO):

```javascript
if (user.role === "admin") {
  // faz algo
}

if (user.role === "professor" || user.role === "admin") {
  // faz outra coisa
}
```

### Agora (✅ CORRETO):

```javascript
Usuário → Role → Permissões
João → aluno → [course:view, enrollment:create]
Maria → professor → [course:view, lesson:create, student:view]
```

---

## 🔐 Fluxo de Autenticação

```
1. Usuário acessa /login
2. Entra com email e senha
3. AuthService verifica credenciais
4. Se correto, busca Role e suas Permissões
5. Salva na sessão:
   - Dados do usuário
   - Role
   - Array de permissões
6. Middleware valida permissões nas rotas
```

### Estrutura de Sessão:

```javascript
req.session.user = {
  id: 1,
  name: "João Silva",
  email: "joao@example.com",
  phone: "11999999999",
  role: "professor",
  role_id: 2,
  enterprise_id: 1,
  permissions: ["course:view", "lesson:create", "lesson:edit", "student:view"],
};
```

---

## 🎭 Estrutura de Roles e Permissões

### Modelo de Dados:

```
┌─────────────────────────────────────┐
│ roles                               │
├─────────────────────────────────────┤
│ id: INT (PRIMARY KEY)               │
│ name: STRING (UNIQUE)               │
│ description: TEXT                   │
│ created_at: TIMESTAMP               │
│ updated_at: TIMESTAMP               │
└─────────────────────────────────────┘
         ↓ (N:M)
┌─────────────────────────────────────┐
│ role_permissions                    │
├─────────────────────────────────────┤
│ id: INT (PRIMARY KEY)               │
│ role_id: INT (FK)                   │
│ permission_id: INT (FK)             │
└─────────────────────────────────────┘
         ↓ (N:M)
┌─────────────────────────────────────┐
│ permissions                         │
├─────────────────────────────────────┤
│ id: INT (PRIMARY KEY)               │
│ name: STRING (UNIQUE)               │
│ description: TEXT                   │
│ created_at: TIMESTAMP               │
│ updated_at: TIMESTAMP               │
└─────────────────────────────────────┘
```

### Roles Padrão:

- **admin**: Acesso total ao sistema
- **professor**: Pode criar aulas e gerenciar alunos
- **aluno**: Pode visualizar cursos e fazer matrícula
- **enterprise**: Pode gerenciar professores e alunos

---

## 👤 Como Adicionar Usuários

### Via Interface Web:

1. Acesse `/register`
2. Preencha o formulário com:
   - Nome
   - Email
   - Senha
   - Telefone (opcional)
   - Empresa (obrigatório)
   - Tipo de Usuário (aluno, professor, enterprise)
3. Clique em "Criar Conta"

### Via Banco de Dados (SQL):

```sql
-- 1. Buscar IDs necessários
SELECT id FROM enterprises WHERE name = 'Empresa X';
SELECT id FROM roles WHERE name = 'professor';

-- 2. Inserir novo usuário (com senha criptografada)
INSERT INTO users (name, email, password, phone, enterprise_id, role_id, is_active, created_at, updated_at)
VALUES (
  'Maria Silva',
  'maria@example.com',
  '$2a$10$...[hash bcryptjs]...', -- Usar bcrypt!
  '11988888888',
  1,
  2,
  true,
  NOW(),
  NOW()
);
```

### ⚠️ IMPORTANTE: Sempre use bcryptjs!

```javascript
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync("senha123", salt);
```

---

## 🔑 Como Gerenciar Permissões

### Ver Permissões Disponíveis:

```
📁 config/
  └─ permissions.js
```

Arquivo que define todas as permissões:

```javascript
const PERMISSIONS = {
  COURSE_VIEW: "course:view",
  COURSE_CREATE: "course:create",
  LESSON_CREATE: "lesson:create",
  // ... mais permissões
};
```

### Adicionar Nova Permissão:

**1. No banco de dados:**

```sql
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES ('comment:delete', 'Deletar comentários', NOW(), NOW());
```

**2. No arquivo de config (config/permissions.js):**

```javascript
const PERMISSIONS = {
  // ... existentes
  COMMENT_DELETE: "comment:delete",
};

const ROLE_PERMISSIONS = {
  admin: [Object.values(PERMISSIONS)], // Admin tem tudo
  professor: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.LESSON_CREATE,
    PERMISSIONS.COMMENT_DELETE, // ← NOVO
  ],
  // ... resto dos roles
};
```

### Adicionar Permissão a um Role:

**Via SQL:**

```sql
-- 1. Buscar IDs
SELECT id FROM roles WHERE name = 'professor';
SELECT id FROM permissions WHERE name = 'comment:delete';

-- 2. Inserir relação
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
VALUES (2, 4, NOW(), NOW());
```

### Remover Permissão de um Role:

**Via SQL:**

```sql
DELETE FROM role_permissions
WHERE role_id = 2 AND permission_id = 4;
```

---

## 🛡️ Como Usar Middlewares

### Middleware de Autenticação (authenticate.js)

Verifica se o usuário está logado:

```javascript
// ✅ Rotas protegidas
router.get("/dashboard", authenticate, (req, res) => {
  // Apenas usuários autenticados acessam
  res.render("dashboard", { user: req.session.user });
});

// No index.js
app.use("/", authenticate, courseController);
```

### Middleware de Autorização (authorize.js)

Verifica se o usuário tem a(s) permissão(ões):

```javascript
// ✅ Uma permissão obrigatória
router.post("/course/create", authorize("course:create"), (req, res) => {
  // Apenas usuários com permissão "course:create"
});

// ✅ Múltiplas permissões (requer TODAS)
router.delete(
  "/lesson/:id",
  authorize(["lesson:delete", "course:edit"]),
  (req, res) => {
    // Requer AMBAS as permissões
  },
);

// ✅ ALGUMA de múltiplas permissões
router.post(
  "/comment",
  authorize(["comment:create", "admin:panel"], { requireAll: false }),
  (req, res) => {
    // Requer PELO MENOS UMA das permissões
  },
);
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Proteger Rota de Criação de Curso

```javascript
// courses/CourseController.js
const express = require("express");
const router = express.Router();
const authorize = require("../middlewares/authorize");

// GET /courses - Ver cursos (qualquer um autenticado)
router.get("/courses", (req, res) => {
  // ... buscar cursos
});

// POST /course - Criar curso (requer permissão)
router.post("/course", authorize("course:create"), (req, res) => {
  // ... criar curso
});

// DELETE /course/:id - Deletar curso (requer múltiplas)
router.delete(
  "/course/:id",
  authorize(["course:delete", "admin:panel"], { requireAll: false }),
  (req, res) => {
    // ... deletar curso
  },
);

module.exports = router;
```

### Exemplo 2: Verificar Permissão Manualmente

```javascript
// Dentro de um controller
const AuthService = require("../auth/auth.service");

router.get("/dashboard", (req, res) => {
  const user = req.session.user;

  // Verificar uma permissão
  if (AuthService.hasPermission(user.permissions, "admin:panel")) {
    // Mostrar painel admin
  }

  // Verificar múltiplas
  if (
    AuthService.hasPermission(user.permissions, [
      "course:create",
      "lesson:create",
    ])
  ) {
    // Mostrar opção de criar conteúdo
  }

  // Verificar ALGUMA
  if (
    AuthService.hasAnyPermission(user.permissions, [
      "teacher:manage",
      "admin:panel",
    ])
  ) {
    // Mostrar opção de gerenciar professores
  }
});
```

### Exemplo 3: Criar um Novo Role com Permissões

```javascript
// Script para popular banco de dados
const Role = require("./models/Role");
const Permission = require("./models/Permission");
const RolePermission = require("./models/RolePermission");

async function createNewRole() {
  // 1. Criar role
  const moderator = await Role.create({
    name: "moderador",
    description: "Pode moderar comentários e conteúdo",
  });

  // 2. Buscar permissões
  const permissions = await Permission.findAll({
    where: { name: ["comment:delete", "user:ban"] },
  });

  // 3. Associar permissões ao role
  for (let perm of permissions) {
    await RolePermission.create({
      role_id: moderator.id,
      permission_id: perm.id,
    });
  }
}
```

---

## 📝 Arquivos Principais

```
├─ auth/
│  ├─ auth.controller.js      # Rotas de login/register/logout
│  └─ auth.service.js         # Lógica de autenticação
├─ middlewares/
│  ├─ authenticate.js         # Verifica se está logado
│  └─ authorize.js            # Verifica permissões
├─ models/
│  ├─ Role.js                 # Modelo de Role
│  ├─ Permission.js           # Modelo de Permission
│  ├─ RolePermission.js       # Junção N:M
│  └─ ...
├─ config/
│  └─ permissions.js          # Define todas as permissões
└─ views/
   ├─ login.ejs               # Página de login
   ├─ register.ejs            # Página de registro
   └─ error.ejs               # Página de erro (403, 401)
```

---

## 🎓 Resumo das Mudanças

| Aspecto            | Antes                         | Depois                           |
| ------------------ | ----------------------------- | -------------------------------- |
| **Modelo de User** | `profile_id`                  | `role_id`                        |
| **Permissões**     | Hardcoded em middleware       | `permissions` tabela             |
| **Verificação**    | `if (user.role === "X")`      | `authorize("permission:action")` |
| **Login**          | `/auth`                       | `/auth/login` e `/auth/register` |
| **Views**          | Múltiplas (admin, enterprise) | Consolidadas                     |

---

## ✅ Próximos Passos

1. Migrar dados dos usuários existentes
2. Remover pasta `/profiles` (descontinuada)
3. Remover middlewares antigos (`adminAuth.js`, `adminOnly.js`)
4. Testar todas as rotas com os novos middlewares
5. Documentar permissões específicas de cada rota
