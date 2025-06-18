const jwt = require('jsonwebtoken');
const db = require('../config/db');

function adminOnly(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    db.query('SELECT is_admin FROM users WHERE id = ?', [decoded.userId], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      if (!results[0].is_admin) return res.status(403).json({ message: 'Admins only' });
      req.user = decoded;
      next();
    });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function normalUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    db.query('SELECT id FROM users WHERE id = ?', [decoded.userId], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      req.user = decoded;
      next();
    });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { adminOnly, normalUser };