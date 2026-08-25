// Route guards backed by express-session. `session.userId` and `session.role`
// are set at login/registration (see src/routes/auth.js) and persisted server
// side via connect-pg-simple, so they survive process restarts.

export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = 'Please sign in to continue.';
    return res.redirect('/login');
  }
  return next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) {
      req.session.flash = 'Please sign in to continue.';
      return res.redirect('/login');
    }
    if (req.session.role !== role) {
      return res.status(403).render('error', {
        title: 'Not allowed',
        message: `Only ${role.toLowerCase()} accounts can do that.`,
      });
    }
    return next();
  };
}

/** Makes the current user (or null) available to every view without a per-route fetch. */
export function attachCurrentUser(req, res, next) {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, role: req.session.role, orgName: req.session.orgName }
    : null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}
