const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 * Adds user info to req.user
 */
const authenticateToken = (req, res, next) => {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.' 
        });
    }

    try {
        // Verify token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Add user info to request
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired. Please login again.' 
            });
        }
        return res.status(403).json({ 
            error: 'Invalid token.' 
        });
    }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.user = verified;
        } catch (error) {
            // Continue without authentication
        }
    }
    next();
};

module.exports = {
    authenticateToken,
    optionalAuth
};
