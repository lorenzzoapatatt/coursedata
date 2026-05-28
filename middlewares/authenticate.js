/**
 * Middleware de Autenticação
 * Verifica se o usuário está autenticado
 * Se não estiver, redireciona para o login
 */

function authenticate(req, res, next) {
  if (req.session.user !== undefined) {
    next();
  } else {
    res.redirect("/login");
  }
}

module.exports = authenticate;
