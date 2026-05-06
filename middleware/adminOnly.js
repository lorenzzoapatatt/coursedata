function adminOnly(req, res, next) {
  if (req.session.user && req.session.user.profile === "admin") {
    next();
  } else {
    res.status(403).send("Acesso negado");
  }
}

module.exports = adminOnly;
