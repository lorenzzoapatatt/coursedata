const AuthService = require("../auth/auth.service");

/**
 * Middleware de Autorização
 * Verifica se o usuário tem a(s) permissão(ões) requerida(s)
 *
 * Uso:
 * router.get("/admin", authorize("admin:panel"), controllerFunc)
 * router.get("/courses", authorize(["course:view", "lesson:view"]), controllerFunc)
 * router.post("/lesson", authorize("lesson:create"), controllerFunc)
 *
 * @param {string|Array} requiredPermissions - Permissão(ões) requerida(s)
 * @param {Object} options - Opções adicionais
 * @param {boolean} options.requireAll - Se true, requer TODAS as permissões. Se false, requer ALGUMA. Default: true
 * @returns {Function} Middleware
 */

function authorize(requiredPermissions, options = {}) {
  const { requireAll = true } = options;

  return (req, res, next) => {
    // Verificar se usuário está autenticado
    if (!req.session.user) {
      return res.status(401).render("error", {
        message: "Você precisa estar autenticado",
      });
    }

    const userPermissions = req.session.user.permissions || [];

    // Verificar permissões
    let hasPermission = false;

    if (Array.isArray(requiredPermissions)) {
      if (requireAll) {
        // Requer TODAS as permissões
        hasPermission = AuthService.hasPermission(
          userPermissions,
          requiredPermissions,
        );
      } else {
        // Requer ALGUMA permissão
        hasPermission = AuthService.hasAnyPermission(
          userPermissions,
          requiredPermissions,
        );
      }
    } else {
      // Uma única permissão
      hasPermission = AuthService.hasPermission(
        userPermissions,
        requiredPermissions,
      );
    }

    if (hasPermission) {
      next();
    } else {
      res.status(403).render("error", {
        message: "Você não tem permissão para acessar este recurso",
      });
    }
  };
}

module.exports = authorize;
