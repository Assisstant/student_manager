const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    const { username, email, password, full_name } = req.body;
    
    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({ 
            error: 'Username, email, and password are required' 
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ 
            error: 'Password must be at least 6 characters long' 
        });
    }
    
    try {
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Username or email already exists' 
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        // Create user
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, full_name) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username, email, full_name, created_at`,
            [username, email, password_hash, full_name || null]
        );
        
        const user = result.rows[0];
        
        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
        return res.status(400).json({ 
            error: 'Username and password are required' 
        });
    }
    
    try {
        // Find user
        const result = await db.query(
            `SELECT id, username, email, password_hash, full_name, is_active 
             FROM users 
             WHERE username = $1 OR email = $1`,
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }
        
        const user = result.rows[0];
        
        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({ 
                error: 'Account is deactivated. Please contact administrator.' 
            });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }
        
        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, full_name, role, created_at, last_login 
             FROM users 
             WHERE id = $1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authenticateToken, async (req, res) => {
    const { current_password, new_password } = req.body;
    
    // Validation
    if (!current_password || !new_password) {
        return res.status(400).json({ 
            error: 'Current password and new password are required' 
        });
    }
    
    if (new_password.length < 6) {
        return res.status(400).json({ 
            error: 'New password must be at least 6 characters long' 
        });
    }
    
    try {
        // Get current password hash
        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const validPassword = await bcrypt.compare(
            current_password, 
            result.rows[0].password_hash
        );
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const new_password_hash = await bcrypt.hash(new_password, salt);
        
        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [new_password_hash, req.user.userId]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete token)
 */
router.post('/logout', authenticateToken, (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // by deleting the token. This endpoint is just for consistency.
    res.json({ message: 'Logout successful' });
});

module.exports = router;
