const bcrypt = require("bcryptjs");
const User = require("../users/User");
const Role = require("../models/Role");
const RolePermission = require("../models/RolePermission");
const Permission = require("../models/Permission");

/**
 * Service de Autenticação
 * Responsável pela lógica de login, registro e gerenciamento de sessão
 */

class AuthService {
  /**
   * Fazer login do usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<Object>} Dados do usuário autenticado com permissões
   */
  static async login(email, password) {
    try {
      // Buscar usuário com role e permissões
      const user = await User.findOne({
        where: { email: email },
        include: [
          {
            model: Role,
            include: [
              {
                model: RolePermission,
                include: [Permission],
              },
            ],
          },
        ],
      });

      // Usuário não existe
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Usuário inativo
      if (!user.is_active) {
        throw new Error("Usuário inativo");
      }

      // Validar senha
      const passwordValid = bcrypt.compareSync(password, user.password);
      if (!passwordValid) {
        throw new Error("Senha incorreta");
      }

      // Extrair permissões do role
      const permissions = user.role.role_permissions.map(
        (rp) => rp.permission.name,
      );

      // Retornar dados do usuário sem a senha
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        role_id: user.role.id,
        enterprise_id: user.enterprise_id,
        permissions: permissions,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Registrar novo usuário
   * @param {Object} userData - Dados do usuário
   * @returns {Promise<Object>} Dados do usuário criado
   */
  static async register(userData) {
    try {
      const { name, email, password, phone, enterprise_id, role_id } = userData;

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ where: { email: email } });
      if (existingUser) {
        throw new Error("Email já registrado");
      }

      // Criptografar senha
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Criar usuário
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        enterprise_id,
        role_id,
        is_active: true,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Obter permissões de um role
   * @param {number} roleId - ID do role
   * @returns {Promise<Array>} Array de nomes de permissões
   */
  static async getPermissionsByRole(roleId) {
    try {
      const rolePermissions = await RolePermission.findAll({
        where: { role_id: roleId },
        include: [Permission],
      });

      return rolePermissions.map((rp) => rp.permission.name);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Verificar se usuário tem uma permissão específica
   * @param {Array} userPermissions - Array de permissões do usuário
   * @param {string|Array} requiredPermission - Permissão(ões) requerida(s)
   * @returns {boolean} True se usuário tem a permissão
   */
  static hasPermission(userPermissions, requiredPermission) {
    if (Array.isArray(requiredPermission)) {
      // Se requer múltiplas permissões, verifica se tem todas
      return requiredPermission.every((perm) => userPermissions.includes(perm));
    }
    // Se requer uma permissão, verifica se tem
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Verificar se usuário tem ALGUMA permissão de um conjunto
   * @param {Array} userPermissions - Array de permissões do usuário
   * @param {Array} permissionsArray - Array de permissões para verificar
   * @returns {boolean} True se usuário tem alguma das permissões
   */
  static hasAnyPermission(userPermissions, permissionsArray) {
    return permissionsArray.some((perm) => userPermissions.includes(perm));
  }
}

module.exports = AuthService;
