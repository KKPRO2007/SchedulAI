// TEMPORARY STUBS - your teammate will replace this file with real JWT checks.
// Keep these two function names so routes don't need to change.
export function requireAuth(req, res, next) {
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => next();
}