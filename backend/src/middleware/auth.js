const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: { message: 'No token provided' } });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }
};

const adminMiddleware = async (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'root') {
        return res.status(403).json({ error: { message: 'Access denied. Admin privileges required.' } });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };
