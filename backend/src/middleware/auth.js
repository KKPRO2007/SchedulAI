import jwt from 'jsonwebtoken';

// JWT-based authentication and role checks (synopsis §12.3).
// The server rejects unauthorised calls even if the UI hides a button.

const SECRET = process.env.AUTH_SECRET || 'schedulai-dev-secret-change-me';
const TTL = '12h';

export function signToken(user) {
  return jwt.sign({ email: user.email, name: user.name, role: user.role }, SECRET, { expiresIn: TTL });
}

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `This action needs the ${roles.join(' or ')} role` });
    }
    next();
  };
}
