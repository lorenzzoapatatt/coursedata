# Migração de Dados (Profile para Role)

## 📌 Situação Atual

Se você tinha usuários com `profile_id`, precisa migrar para `role_id`. Este guia ajuda com isso.

### Antes (Descontinuado ❌):

```
users.profile_id → profiles.id → professor, aluno, etc
```

### Depois (Novo ✅):

```
users.role_id → roles.id → professor, aluno, etc
```

---

## 🔄 Script de Migração

### Opção 1: Migração Manual via SQL

```sql
-- 1. Primeiro, FAÇA UM BACKUP!
-- (seu banco de dados é importante)

-- 2. Ver perfis antigos
SELECT id, name FROM profiles;

-- 3. Ver roles novos
SELECT id, name FROM roles;

-- 4. Mapeamento (exemplo)
-- profiles: 1=admin, 2=professor, 3=enterprise, 4=user
-- roles: 1=admin, 2=professor, 3=aluno, 4=enterprise

-- 5. Atualizar usuários
UPDATE users u
SET role_id = (
  CASE
    WHEN u.profile_id = 1 THEN (SELECT id FROM roles WHERE name = 'admin')
    WHEN u.profile_id = 2 THEN (SELECT id FROM roles WHERE name = 'professor')
    WHEN u.profile_id = 3 THEN (SELECT id FROM roles WHERE name = 'enterprise')
    WHEN u.profile_id = 4 THEN (SELECT id FROM roles WHERE name = 'aluno')
  END
);

-- 6. Verificar migração
SELECT u.id, u.name, u.profile_id, u.role_id, r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;
```

### Opção 2: Script Node.js

Crie `scripts/migrate-profiles-to-roles.js`:

```javascript
const User = require("../users/User");
const Role = require("../models/Role");
const Profile = require("../profiles/Profile");
const connection = require("../database/database");

async function migrateProfilesToRoles() {
  try {
    await connection.authenticate();
    console.log("📌 Iniciando migração...");

    // 1. Buscar todos os perfis
    const profiles = await Profile.findAll();
    console.log(`Found ${profiles.length} profiles`);

    // 2. Para cada perfil, buscar o role correspondente
    const roleMap = {};
    for (let profile of profiles) {
      // Mapear nome do perfil para role
      let roleName = profile.name;
      if (profile.name === "user") roleName = "aluno";

      const role = await Role.findOne({ where: { name: roleName } });
      if (role) {
        roleMap[profile.id] = role.id;
        console.log(
          `✅ Mapeado: profile ${profile.name} (${profile.id}) → role ${role.name} (${role.id})`,
        );
      } else {
        console.log(`⚠️ Role não encontrado para perfil: ${profile.name}`);
      }
    }

    // 3. Buscar todos os usuários
    const users = await User.findAll();
    console.log(`Found ${users.length} users`);

    // 4. Atualizar cada usuário
    for (let user of users) {
      if (roleMap[user.profile_id]) {
        user.role_id = roleMap[user.profile_id];
        await user.save();
        console.log(
          `✅ Usuário ${user.name} atualizado: profile_id ${user.profile_id} → role_id ${user.role_id}`,
        );
      } else {
        console.log(
          `⚠️ Usuário ${user.name} não migrado (profile_id inválido)`,
        );
      }
    }

    console.log("\n✅ Migração concluída!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    process.exit(1);
  }
}

migrateProfilesToRoles();
```

Execute com:

```bash
node scripts/migrate-profiles-to-roles.js
```

---

## 🔐 Mapeamento de Permissões

Agora que os usuários estão em roles, você precisa atribuir permissões aos roles.

### Permissões Padrão por Role

```javascript
// config/permissions.js - Já vem configurado assim

const ROLE_PERMISSIONS = {
  admin: [
    // Admin tem TODAS as permissões
    Object.values(PERMISSIONS),
  ],

  professor: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.LESSON_CREATE,
    PERMISSIONS.LESSON_EDIT,
    PERMISSIONS.LESSON_DELETE,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.ENROLLMENT_VIEW,
  ],

  aluno: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_VIEW,
  ],

  enterprise: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_EDIT,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_DELETE,
    PERMISSIONS.TEACHER_VIEW,
    PERMISSIONS.TEACHER_CREATE,
    PERMISSIONS.TEACHER_EDIT,
    PERMISSIONS.TEACHER_DELETE,
    PERMISSIONS.ENROLLMENT_VIEW,
  ],
};
```

### Popular role_permissions

```sql
-- Depois de criar roles e permissions, associe-os:

-- Admin tem tudo
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE name = 'admin'),
  id,
  NOW(),
  NOW()
FROM permissions;

-- Professor
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE name = 'professor'),
  id,
  NOW(),
  NOW()
FROM permissions
WHERE name IN ('course:view', 'lesson:create', 'lesson:edit', 'lesson:delete', 'student:view', 'enrollment:view');

-- Aluno
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE name = 'aluno'),
  id,
  NOW(),
  NOW()
FROM permissions
WHERE name IN ('course:view', 'lesson:view', 'enrollment:create', 'enrollment:view');

-- Enterprise
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT
  (SELECT id FROM roles WHERE name = 'enterprise'),
  id,
  NOW(),
  NOW()
FROM permissions
WHERE name IN (
  'course:view', 'course:create', 'course:edit', 'course:delete',
  'lesson:view',
  'student:view', 'student:create', 'student:edit', 'student:delete',
  'teacher:view', 'teacher:create', 'teacher:edit', 'teacher:delete',
  'enrollment:view'
);
```

---

## ✅ Verificar Migração

```sql
-- Verificar se todos os usuários foram migrados
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN role_id IS NULL THEN 1 ELSE 0 END) as sem_role,
  SUM(CASE WHEN role_id IS NOT NULL THEN 1 ELSE 0 END) as com_role
FROM users;

-- Listar usuários que ainda têm profile_id nulo
SELECT id, name, email, profile_id, role_id
FROM users
WHERE role_id IS NULL;

-- Ver distribuição de roles
SELECT
  r.name,
  COUNT(u.id) as total_usuarios
FROM users u
RIGHT JOIN roles r ON u.role_id = r.id
GROUP BY r.name;

-- Ver um usuário com todas suas permissões
SELECT
  u.id,
  u.name,
  u.email,
  r.name as role,
  p.name as permission
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'joao@example.com'
ORDER BY p.name;
```

---

## 🗑️ Limpeza Após Migração

Após confirmar que a migração funcionou:

### 1. Remover coluna profile_id (CUIDADO!)

```sql
-- ⚠️ Certifique-se de que ninguém mais usa profile_id!

-- 1. Remover a chave estrangeira
ALTER TABLE users DROP CONSTRAINT fk_users_profile_id;

-- 2. Remover a coluna
ALTER TABLE users DROP COLUMN profile_id;

-- 3. Verificar
DESCRIBE users;
```

### 2. Remover models/controllers antigos (opcional)

```bash
# Remover pasta profiles (descontinuada)
rm -r profiles/

# Remover arquivo Profile.js
rm models/Profile.js

# Remover UserController.js antigo (se não for usar mais)
rm users/UserController.js
```

### 3. Remover middlewares antigos

```bash
# Remover middlewares antigos
rm middleware/adminAuth.js
rm middleware/adminOnly.js
rm middleware/courseAuth.js
rm middleware/enterpriseAuth.js
```

### 4. Limpar index.js

Se ainda tiver referências:

```javascript
// ❌ REMOVER essas linhas:
const Profile = require("./profiles/Profile");
const userController = require("./users/UserController");
Profile.findOrCreate(...);
app.use("/", userController);

// ✅ MANTER essas:
const authController = require("./auth/auth.controller");
app.use("/", authController);
```

---

## 📊 Script de Validação Pós-Migração

```javascript
// scripts/validate-migration.js
const User = require("../users/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const connection = require("../database/database");

async function validateMigration() {
  try {
    await connection.authenticate();

    console.log("\n🔍 Validando migração...\n");

    // 1. Verificar usuários sem role
    const usersWithoutRole = await User.findAll({
      where: { role_id: null },
    });

    if (usersWithoutRole.length > 0) {
      console.log(`⚠️ ${usersWithoutRole.length} usuários sem role:`);
      usersWithoutRole.forEach((u) =>
        console.log(`   - ${u.name} (${u.email})`),
      );
    } else {
      console.log("✅ Todos os usuários têm role");
    }

    // 2. Verificar roles sem permissões
    const rolesWithoutPerms = await Role.findAll({
      include: [
        {
          model: RolePermission,
          required: false,
        },
      ],
      raw: false,
    });

    rolesWithoutPerms.forEach((role) => {
      const permCount = role.role_permissions?.length || 0;
      if (permCount === 0) {
        console.log(`⚠️ Role '${role.name}' sem permissões`);
      } else {
        console.log(`✅ Role '${role.name}' tem ${permCount} permissões`);
      }
    });

    // 3. Estatísticas
    const totalUsers = await User.count();
    const totalRoles = await Role.count();
    const totalPerms = await Permission.count();

    console.log("\n📊 Estatísticas:");
    console.log(`   - Total de usuários: ${totalUsers}`);
    console.log(`   - Total de roles: ${totalRoles}`);
    console.log(`   - Total de permissões: ${totalPerms}`);

    console.log("\n✅ Validação concluída!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na validação:", error);
    process.exit(1);
  }
}

validateMigration();
```

Execute com:

```bash
node scripts/validate-migration.js
```

---

## 🆘 Problemas Comuns

| Problema                            | Causa                           | Solução                                                       |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| Usuário não consegue fazer login    | `role_id` inválido              | Verificar se role existe: `SELECT * FROM roles;`              |
| Erro "Foreign key constraint fails" | Role não existe                 | Criar role faltante                                           |
| Permissões não aplicadas            | `role_permissions` vazio        | Popular role_permissions com INSERT                           |
| Página 403 após migração            | Permissão não atribuída ao role | Verificar `SELECT * FROM role_permissions WHERE role_id = X;` |
