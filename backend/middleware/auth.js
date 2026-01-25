const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = (roles = []) => {
    return async (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            console.log('Auth Middleware: No token provided');
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) return res.status(401).json({ message: 'User not found' });
            if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked' });

            req.user = decoded;
            req.user.role = user.role; // Use current role from DB
            // console.log('Auth Middleware: Token verified for role:', req.user.role);

            if (roles.length && !roles.includes(req.user.role)) {
                console.log(`Auth Middleware: Role mismatch. Required: ${roles}, Found: ${req.user.role}`);
                return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
            }
            next();
        } catch (err) {
            console.error('Auth Middleware: Token verification failed:', err.message);
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

module.exports = auth;
