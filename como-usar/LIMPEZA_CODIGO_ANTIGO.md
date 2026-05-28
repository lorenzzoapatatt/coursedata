# 🧹 Limpeza e Remoção de Código Antigo

## ⚠️ ANTES DE REMOVER QUALQUER COISA

1. **Faça um backup do seu banco de dados e código!**

   ```bash
   mysqldump -u root -p coursedata > backup_before_cleanup.sql
   git commit -m "Backup antes da limpeza"
   ```

2. **Teste tudo** - Certifique-se de que o novo sistema está funcionando
3. **Migre os dados** - Se tiver usuários antigos, use [`MIGRACAO_DADOS.md`](./MIGRACAO_DADOS.md)

---

## 🗑️ Arquivos a Remover

### 1. Pasta `profiles/` (Descontinuada)

A pasta `profiles/` continha o sistema antigo baseado em perfis.

```bash
# Remover a pasta inteira
rm -rf profiles/

# Ou no Windows:
rmdir /s /q profiles
```

### 2. Arquivo `models/Profile.js` (Descontinuado)

```bash
rm models/Profile.js

# Windows:
del models\Profile.js
```

### 3. Arquivo `users/UserController.js` (Antigo)

O antigo `UserController.js` tinha rotas de admin. As novas rotas estão em `auth/auth.controller.js`.

```bash
rm users/UserController.js

# Windows:
del users\UserController.js
```

> ℹ️ Se você customizou o UserController com funcionalidades próprias, copie-as para um novo arquivo antes de deletar!

### 4. Middlewares Antigos

Remova os middlewares antigos que não são mais usados:

```bash
# Remover middlewares antigos
rm middleware/adminAuth.js
rm middleware/adminOnly.js
rm middleware/courseAuth.js
rm middleware/enterpriseAuth.js

# Windows:
del middleware\adminAuth.js
del middleware\adminOnly.js
del middleware\courseAuth.js
del middleware\enterpriseAuth.js
```

### 5. Views Antigas

Os arquivos de admin foram consolidados:

```bash
# Remover pasta de admin views
rm -rf views/admin/users/

# Windows:
rmdir /s /q views\admin\users

# Se a pasta admin ficar vazia, pode remover:
rmdir views/admin/

# Windows:
rmdir views\admin
```

> ℹ️ Se você tinha outras views em `/admin`, mantenha-as!

### 6. Views de Login/Register Antigas (Consolidadas)

Se existiam:

- `views/admin/users/login.ejs` ❌ Removido (agora é `/views/login.ejs`)
- `views/enterprise-login.ejs` ❌ Removido (agora é `/views/login.ejs`)
- `views/enterprise-register.ejs` ❌ Removido (agora é `/views/register.ejs`)

---

## 📝 Atualizar Arquivos Existentes

### 1. Remover Referências em `index.js`

O arquivo `index.js` já foi atualizado, mas verifique se não há referências antigas:

```javascript
// ❌ REMOVER ESSAS LINHAS:
const userController = require("./users/UserController");
const Profile = require("./profiles/Profile");

app.use("/", userController);

// Linhas de criação de Profile:
Profile.findOrCreate({ where: { name: "admin" }, ... });
Profile.findOrCreate({ where: { name: "professor" }, ... });
// etc.

// ✅ JÁ DEVE ESTAR ASSIM:
const authController = require("./auth/auth.controller");
const authenticate = require("./middlewares/authenticate");

app.use("/", authController);
app.use("/", authenticate, courseController);
```

### 2. Atualizar `package.json` (Se Necessário)

Se estava usando algo apenas para o sistema antigo, remova:

```json
{
  "dependencies": {
    // ✅ Manter esses:
    "express": "^5.2.1",
    "sequelize": "^6.37.8",
    "bcryptjs": "^3.0.3",
    "express-session": "^1.19.0"

    // ❌ Remover se não usar mais:
    // "passport": "...",  // Se usava
    // "some-old-lib": "..."  // Se era só para auth antigo
  }
}
```

### 3. Remover Imports Antigos de Controllers

Se seus controllers ainda importam coisas antigas:

```javascript
// ❌ REMOVER:
const Profile = require("../profiles/Profile");
const adminAuth = require("../middleware/adminAuth");

// ✅ USAR:
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
```

---

## 🔄 Migrate o Banco de Dados

Após remover o código, você pode remover a coluna `profile_id` do banco (CUIDADO!):

```sql
-- ⚠️ Certifique-se de que NINGUÉM mais usa profile_id!

-- 1. Remover a chave estrangeira (ajuste o nome conforme seu banco)
ALTER TABLE users DROP FOREIGN KEY fk_users_profile_id;

-- 2. Remover a coluna
ALTER TABLE users DROP COLUMN profile_id;

-- 3. Verificar que funcionou
DESCRIBE users;
-- Não deve ter mais coluna 'profile_id'

-- 4. (Opcional) Remover a tabela profiles
DROP TABLE profiles;
```

---

## 📋 Checklist de Limpeza

- [ ] **Backup feito** - Banco de dados e código em git
- [ ] **Testes passando** - Novo sistema funcionando
- [ ] **Dados migrados** - Se tinha usuários antigos
- [ ] **Pasta `profiles/` removida**
- [ ] **Arquivo `models/Profile.js` removido**
- [ ] **Arquivo `users/UserController.js` removido**
- [ ] **Middlewares antigos removidos** (`adminAuth.js`, etc)
- [ ] **Views antigas removidas** ou consolidadas
- [ ] **index.js atualizado** - Sem referências antigas
- [ ] **Banco de dados limpo** - Coluna `profile_id` removida (opcional)
- [ ] **Testes novamente** - Tudo ainda funcionando?
- [ ] **Commit no git** - `git commit -m "Remove codigo antigo"`

---

## 🧪 Testes Após Limpeza

Depois de remover o código antigo, teste:

```bash
# 1. Iniciar servidor
npm start
# ou
node index.js

# 2. Testar login
# - Ir para http://localhost:8080/login
# - Tentar fazer login com um usuário válido
# - Deve funcionar ✅

# 3. Testar register
# - Ir para http://localhost:8080/register
# - Criar novo usuário
# - Deve funcionar ✅

# 4. Testar rotas protegidas
# - Tentar acessar rota que requer autenticação SEM estar logado
# - Deve redirecionar para /login ✅

# 5. Testar autorização
# - Fazer login com usuário "aluno"
# - Tentar acessar rota que requer "admin:panel"
# - Deve retornar erro 403 ✅
```

---

## ⚠️ Possíveis Problemas

### Erro: "Cannot find module 'profiles/Profile'"

Se algum arquivo ainda está importando Profile:

```bash
# Encontrar todas as referências
grep -r "profiles/Profile" .
grep -r "Profile =" .

# Remover a importação dos arquivos que aparecerem
```

### Erro: "adminAuth is not defined"

Se alguma rota ainda está usando middlewares antigos:

```bash
# Encontrar referências
grep -r "adminAuth" .
grep -r "adminOnly" .

# Remover ou atualizar as rotas para usar authorize()
```

### Erro: "Coluna 'profile_id' não existe"

Depois de remover a coluna do banco, se o código tentar acessá-la:

```bash
# Encontrar referências
grep -r "profile_id" .

# Remover ou atualizar para "role_id"
```

---

## 🎉 Pronto!

Após completar a limpeza:

1. **Código está mais limpo** - Sem código morto
2. **Sistema é mais seguro** - RBAC profissional
3. **Mais fácil manter** - Estrutura organizada
4. **Pronto para escalar** - Adicionar novos roles/permissões é simples

Parabéns! 🚀

---

## 📚 Referências

- [`MIGRACAO_DADOS.md`](./MIGRACAO_DADOS.md) - Como migrar dados antigos
- [`README.md`](./README.md) - Visão geral do novo sistema
- [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md) - Gerenciamento
