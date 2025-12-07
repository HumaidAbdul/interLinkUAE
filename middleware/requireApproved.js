// backend/middleware/requireApproved.js
module.exports = (req, res, next) => {
  // let CORS preflight pass
  if (req.method === 'OPTIONS') return next();

  // must be authenticated first
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const u = req.user;
  if (u.role === 'admin') return next(); // admins bypass

  const status = String(u.status || '').trim().toLowerCase();
  if (status === 'approved') return next();

  const support = process.env.SUPPORT_EMAIL || 'support@internlink.ae';

  let msg;
  if (status === 'rejected') {
    // if you don't want to expose the reason publicly, remove the reason part
    msg = `Access denied. Your account was rejected${
      u.rejection_reason ? `: ${u.rejection_reason}` : ''
    }. If you believe this is a mistake, contact ${support}.`;
  } else {
    // default to pending
    msg = `Your account is pending approval. You’ll get access once an admin approves it. Email: ${support}`;
  }

  return res.status(403).json({ message: msg, status });
};
