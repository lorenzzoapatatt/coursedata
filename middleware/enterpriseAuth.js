function enterpriseAuth(req, res, next) {
  if (
    req.session.user &&
    ["admin", "professor", "enterprise"].includes(req.session.user.profile)
  ) {
    next();
  } else {
    res.status(403).send("Acesso negado");
  }
}

module.exports = enterpriseAuth;
