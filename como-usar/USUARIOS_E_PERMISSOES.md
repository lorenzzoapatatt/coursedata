# Gerenciar Usuários e Permissões

## 📌 Adicionar Novo Usuário

### Método 1: Via Interface Web ✅ Recomendado

1. Acesse: `http://localhost:8080/register`
2. Preencha o formulário:
   - **Nome Completo**: João Silva
   - **Email**: joao@example.com (deve ser único)
   - **Senha**: Use uma senha forte
   - **Telefone**: (opcional)
   - **Empresa**: Selecione a empresa
   - **Tipo de Usuário**:
     - `aluno` - Pode ver cursos e fazer matrícula
     - `professor` - Pode criar aulas
     - `enterprise` - Pode gerenciar tudo da empresa

3. Clique em "Criar Conta"
4. Será feito login automático

### Método 2: Via Banco de Dados

```bash
# 1. Conecte ao MySQL
mysql -u root -p sua_senha

# 2. Use o banco de dados
USE coursedata;

# 3. Primeiro, veja os dados disponíveis
SELECT id, name FROM enterprises;
SELECT id, name FROM roles;

# 4. Crie a senha criptografada (com bcryptjs)
# Use Node.js para isso:
# const bcrypt = require('bcryptjs');
# const salt = bcrypt.genSaltSync(10);
# const hash = bcrypt.hashSync('senha123', salt);
# Copie o hash gerado

# 5. Insira o usuário
INSERT INTO users (name, email, password, phone, enterprise_id, role_id, is_active, created_at, updated_at)
VALUES (
  'João Silva',
  'joao@example.com',
  '$2a$10$...[cole o hash aqui]...',
  '11988888888',
  1,
  3,
  true,
  NOW(),
  NOW()
);
```

---

## 🔐 Verificar Usuários Existentes

```sql
-- Ver todos os usuários com seus roles
SELECT
  u.id,
  u.name,
  u.email,
  u.phone,
  r.name as role,
  u.is_active,
  u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- Ver usuários de um role específico
SELECT * FROM users
WHERE role_id = (SELECT id FROM roles WHERE name = 'professor');

-- Ver usuários de uma empresa
SELECT u.*, r.name as role
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE enterprise_id = 1;
```

---

## ✏️ Editar Usuário

### Atualizar Role

```sql
-- Mudar o role de um usuário
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'professor')
WHERE email = 'joao@example.com';
```

### Atualizar Status (ativo/inativo)

```sql
-- Desativar um usuário (ele não consegue fazer login)
UPDATE users
SET is_active = false
WHERE email = 'joao@example.com';

-- Ativar um usuário
UPDATE users
SET is_active = true
WHERE email = 'joao@example.com';
```

### Atualizar Empresa

```sql
UPDATE users
SET enterprise_id = 2
WHERE id = 1;
```

---

## ❌ Remover Usuário

```sql
-- Deletar um usuário (cuidado, é permanente!)
DELETE FROM users
WHERE email = 'joao@example.com';
```

---

## 🎯 Gerenciar Permissões

### Ver Todas as Permissões

```sql
SELECT id, name, description FROM permissions;
```

### Ver Permissões de um Role

```sql
SELECT
  r.name as role,
  p.name as permission,
  p.description
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'professor'
ORDER BY p.name;
```

### Adicionar Permissão a um Role

```sql
-- 1. Ver o ID do role e da permissão
SELECT id FROM roles WHERE name = 'professor';
SELECT id FROM permissions WHERE name = 'lesson:delete';

-- 2. Adicionar a permissão ao role
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
VALUES (2, 5, NOW(), NOW());
```

### Remover Permissão de um Role

```sql
-- Remover permissão de um role
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'professor')
AND permission_id = (SELECT id FROM permissions WHERE name = 'lesson:delete');
```

---

## 📝 Criar Novo Role

### Via Banco de Dados

```sql
-- 1. Criar o novo role
INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('revisor', 'Pode revisar conteúdo dos cursos', NOW(), NOW());

-- 2. Buscar o ID
SELECT id FROM roles WHERE name = 'revisor';

-- 3. Adicionar permissões ao novo role
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT 5, id, NOW(), NOW() -- 5 é o ID do novo role
FROM permissions
WHERE name IN ('course:view', 'lesson:view', 'comment:delete');
```

### Via Node.js (Script)

Crie um arquivo `scripts/create-role.js`:

```javascript
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const RolePermission = require("../models/RolePermission");
const connection = require("../database/database");

async function createRole() {
  try {
    await connection.authenticate();

    // 1. Criar role
    const revisor = await Role.create({
      name: "revisor",
      description: "Pode revisar conteúdo dos cursos",
    });

    // 2. Buscar permissões
    const permissions = await Permission.findAll({
      where: { name: ["course:view", "lesson:view", "comment:delete"] },
    });

    // 3. Associar permissões
    for (let perm of permissions) {
      await RolePermission.create({
        role_id: revisor.id,
        permission_id: perm.id,
      });
    }

    console.log("✅ Role 'revisor' criado com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

createRole();
```

Execute com:

```bash
node scripts/create-role.js
```

---

## 📊 Consultas Úteis

### Contar usuários por role

```sql
SELECT
  r.name,
  COUNT(u.id) as total
FROM users u
RIGHT JOIN roles r ON u.role_id = r.id
GROUP BY r.name;
```

### Usuários sem permissão específica

```sql
SELECT u.id, u.name, u.email
FROM users u
WHERE u.role_id NOT IN (
  SELECT DISTINCT role_id
  FROM role_permissions
  WHERE permission_id = (SELECT id FROM permissions WHERE name = 'course:view')
);
```

### Roles sem permissão específica

```sql
SELECT r.id, r.name
FROM roles r
WHERE r.id NOT IN (
  SELECT role_id
  FROM role_permissions
  WHERE permission_id = (SELECT id FROM permissions WHERE name = 'course:view')
);
```

---

## 🚨 Troubleshooting

### Usuário não consegue fazer login

- ✅ Verifique se `is_active = true`
- ✅ Verifique se o `role_id` existe
- ✅ Verifique se a senha está correta

### Usuário não tem acesso à rota protegida

- ✅ Verifique a permissão do seu role:
  ```sql
  SELECT p.name FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  WHERE rp.role_id = (SELECT role_id FROM users WHERE id = 1);
  ```

### Adicionar permissão, mas usuário não vê mudança

- ✅ O usuário precisa fazer logout e login novamente para atualizar a sessão

### Erro: "Violação de restrição de chave estrangeira"

- ✅ Verifique se o `role_id` e `enterprise_id` existem
- ✅ Verifique se o `permission_id` e `role_id` existem na tabela de role_permissions
