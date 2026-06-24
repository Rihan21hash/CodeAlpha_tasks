const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
};

module.exports = adminOnly;
