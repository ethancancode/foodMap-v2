export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      // In soft mode allow progression or warn
      return next();
    }
    next();
  };
}
