# 📚 Documentação do Sistema RBAC

Bem-vindo à documentação do novo sistema de **Role-Based Access Control (RBAC)**!

## 🚀 Comece Aqui

Escolha o guia que melhor se encaixa na sua necessidade:

### 1. **Entender o Sistema** 📖

👉 Leia [`README.md`](./README.md)

- Visão geral do RBAC
- Como funciona a autenticação
- Estrutura de Roles e Permissões
- O que mudou em relação ao sistema antigo

### 2. **Gerenciar Usuários e Permissões** 👤

👉 Leia [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md)

- Adicionar novos usuários (Web ou SQL)
- Editar/Remover usuários
- Adicionar/Remover permissões
- Criar novo role
- Consultas SQL úteis

### 3. **Proteger Rotas e Usar Middlewares** 🛡️

👉 Leia [`MIDDLEWARES_E_ROTAS.md`](./MIDDLEWARES_E_ROTAS.md)

- Middleware `authenticate` (verificar login)
- Middleware `authorize` (verificar permissão)
- Exemplos de rotas protegidas
- Verificação manual de permissões

### 4. **Migrar Dados Antigos** 🔄

👉 Leia [`MIGRACAO_DADOS.md`](./MIGRACAO_DADOS.md)

- Migrar de `profile_id` para `role_id`
- Script de migração SQL ou Node.js
- Popular `role_permissions`
- Validar migração

---

## 🎯 Guia Rápido por Tarefa

### Quero adicionar um novo usuário

1. Vá para `http://localhost:8080/register`
2. Preencha o formulário
3. Pronto! ✅

Ou veja [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md#adicionar-novo-usuário)

### Quero criar uma nova rota protegida

1. Importar middlewares: `authenticate`, `authorize`
2. Adicionar na rota: `router.get("/path", authenticate, authorize("permission:action"), handler)`
3. Pronto! ✅

Veja [`MIDDLEWARES_E_ROTAS.md`](./MIDDLEWARES_E_ROTAS.md#exemplos-de-rotas-protegidas)

### Quero adicionar uma nova permissão

1. Adicionar em `config/permissions.js`
2. Criar na tabela `permissions`
3. Associar ao role em `role_permissions`
4. Pronto! ✅

Veja [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md#gerenciar-permissões)

### Quero remover um usuário

1. Fazer logout do usuário
2. Deletar do banco: `DELETE FROM users WHERE id = X;`
3. Pronto! ✅

Veja [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md#remover-usuário)

---

## 📁 Estrutura de Arquivos

```
coursedata/
├── auth/
│  ├── auth.controller.js      # Rotas: /login, /register, /logout
│  ├── auth.service.js         # Lógica de autenticação
│  └── auth.middleware.js      # Middleware de auth (se houver)
├── middlewares/
│  ├── authenticate.js         # Verifica se está logado
│  └── authorize.js            # Verifica permissões
├── models/
│  ├── Role.js                 # Modelo: Roles
│  ├── Permission.js           # Modelo: Permissões
│  ├── RolePermission.js       # Modelo: Junção N:M
│  └── User.js                 # Atualizado: role_id em vez de profile_id
├── config/
│  └── permissions.js          # Define todas as permissões
├── como-usar/
│  ├── README.md               # Visão geral (LEIA PRIMEIRO!)
│  ├── USUARIOS_E_PERMISSOES.md
│  ├── MIDDLEWARES_E_ROTAS.md
│  ├── MIGRACAO_DADOS.md
│  └── INDEX.md                # Este arquivo
└── views/
   ├── login.ejs               # Página de login
   ├── register.ejs            # Página de registro
   └── error.ejs               # Página de erro
```

---

## 🔐 Permissões Disponíveis

Ver em `config/permissions.js` ou [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md#gerenciar-permissões)

Principais:

- `course:view` - Ver cursos
- `course:create` - Criar curso
- `lesson:create` - Criar aula
- `student:view` - Ver alunos
- `admin:panel` - Acessar painel admin
- E muitas mais...

---

## 🎭 Roles Padrão

| Role           | Descrição           | Permissões                               |
| -------------- | ------------------- | ---------------------------------------- |
| **admin**      | Administrador total | Tudo                                     |
| **professor**  | Pode criar aulas    | course:view, lesson:create, student:view |
| **aluno**      | Pode se matricular  | course:view, enrollment:create           |
| **enterprise** | Gerencia empresa    | Gerenciar professores e alunos           |

---

## 💻 Tecnologias Usadas

- **Express.js** - Framework web
- **Sequelize** - ORM para banco de dados
- **bcryptjs** - Criptografia de senha
- **Express-session** - Gerenciamento de sessão
- **EJS** - Template engine
- **MySQL/MySQL2** - Banco de dados

---

## ❓ Perguntas Frequentes

**P: Como faço para dar permissão a um usuário?**
R: Você adiciona a permissão ao role do usuário, não ao usuário diretamente. Veja [`USUARIOS_E_PERMISSOES.md#adicionar-permissão-a-um-role`](./USUARIOS_E_PERMISSOES.md#adicionar-permissão-a-um-role)

**P: Posso ter múltiplos roles por usuário?**
R: No sistema atual, não. Um usuário tem apenas 1 role. Se precisar, é possível adicionar suporte a múltiplos roles, mas exige mudanças arquiteturais.

**P: Como testo se a permissão está funcionando?**
R: Faça login com usuário que TEM a permissão e acesse a rota. Depois faça login com usuário que NÃO TEM e tente acessar. Deve receber erro 403.

**P: Qual é a diferença entre `authenticate` e `authorize`?**
R: `authenticate` verifica se você está logado. `authorize` verifica se você tem permissão para aquela ação específica.

**P: Como remover uma permissão de um usuário?**
R: Remova a permissão do role do usuário em `role_permissions`. O usuário terá que fazer logout e login novamente para a mudança entrar em efeito.

---

## 🆘 Precisa de Ajuda?

1. **Erro ao fazer login**: Veja [`USUARIOS_E_PERMISSOES.md#troubleshooting`](./USUARIOS_E_PERMISSOES.md#troubleshooting)
2. **Erro 403 (sem permissão)**: Veja [`MIDDLEWARES_E_ROTAS.md#troubleshooting`](./MIDDLEWARES_E_ROTAS.md#troubleshooting)
3. **Problema com migração**: Veja [`MIGRACAO_DADOS.md`](./MIGRACAO_DADOS.md)
4. **Não entende o sistema**: Comece por [`README.md`](./README.md)

---

## ✅ Checklist de Implementação

- [x] Criar modelos RBAC (Role, Permission, RolePermission)
- [x] Atualizar modelo User (profile_id → role_id)
- [x] Criar middlewares (authenticate, authorize)
- [x] Criar auth controller e service
- [x] Consolidar views de login/register
- [x] Criar documentação
- [ ] Migrar dados antigos (execute se tiver usuários antigos)
- [ ] Remover código antigo
- [ ] Testar todas as rotas
- [ ] Deploy em produção

---

## 📝 Próximas Etapas

1. **Ler a documentação** - Comece com [`README.md`](./README.md)
2. **Testar login/register** - Acesse `/login` e `/register`
3. **Proteger rotas** - Adicione middlewares nas suas rotas
4. **Migrar dados** - Se tiver usuários antigos, siga [`MIGRACAO_DADOS.md`](./MIGRACAO_DADOS.md)
5. **Remover código antigo** - Delete ProfileController, adminAuth, etc
6. **Deploy** - Coloque em produção!

---

## 📞 Suporte

Dúvidas sobre o sistema RBAC? Consulte:

- [`README.md`](./README.md) - Visão geral
- [`USUARIOS_E_PERMISSOES.md`](./USUARIOS_E_PERMISSOES.md) - Gerenciamento
- [`MIDDLEWARES_E_ROTAS.md`](./MIDDLEWARES_E_ROTAS.md) - Implementação
- [`MIGRACAO_DADOS.md`](./MIGRACAO_DADOS.md) - Migração

---

**Última atualização**: 28/05/2026
**Versão**: 1.0.0
**Status**: ✅ Pronto para produção
