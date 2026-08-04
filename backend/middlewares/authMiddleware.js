function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado." });
  }

  req.user = { token };
  return next();
}

module.exports = authMiddleware;
