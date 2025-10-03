const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/students
 * Get all students for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, grade, plan_type, notes, created_at, updated_at 
             FROM students 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

/**
 * GET /api/students/:id
 * Get a specific student
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            `SELECT id, name, grade, plan_type, notes, created_at, updated_at 
             FROM students 
             WHERE id = $1 AND user_id = $2`,
            [id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

/**
 * POST /api/students
 * Create a new student
 */
router.post('/', async (req, res) => {
    const { name, grade, plan_type, notes } = req.body;
    
    // Validation
    if (!name || !grade || !plan_type) {
        return res.status(400).json({ 
            error: 'Name, grade, and plan_type are required' 
        });
    }
    
    if (plan_type < 1 || plan_type > 6) {
        return res.status(400).json({ 
            error: 'plan_type must be between 1 and 6' 
        });
    }
    
    try {
        const result = await db.query(
            `INSERT INTO students (name, grade, plan_type, notes, user_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, grade, plan_type, notes, created_at, updated_at`,
            [name, grade, plan_type, notes || null, req.user.userId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Failed to create student' });
    }
});

/**
 * PUT /api/students/:id
 * Update a student
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, grade, plan_type, notes } = req.body;
    
    // Validation
    if (!name || !grade || !plan_type) {
        return res.status(400).json({ 
            error: 'Name, grade, and plan_type are required' 
        });
    }
    
    if (plan_type < 1 || plan_type > 6) {
        return res.status(400).json({ 
            error: 'plan_type must be between 1 and 6' 
        });
    }
    
    try {
        const result = await db.query(
            `UPDATE students 
             SET name = $1, grade = $2, plan_type = $3, notes = $4, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $5 AND user_id = $6 
             RETURNING id, name, grade, plan_type, notes, created_at, updated_at`,
            [name, grade, plan_type, notes || null, id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

/**
 * DELETE /api/students/:id
 * Delete a student (and all associated data)
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            'DELETE FROM students WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json({ 
            message: 'Student deleted successfully',
            id: result.rows[0].id 
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

/**
 * GET /api/students/:id/schedule
 * Get schedule for a specific student
 */
router.get('/:id/schedule', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            `SELECT s.id, s.day_of_week, s.time_slot 
             FROM schedule s
             JOIN students st ON s.student_id = st.id
             WHERE s.student_id = $1 AND st.user_id = $2
             ORDER BY s.day_of_week, s.time_slot`,
            [id, req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching student schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

/**
 * GET /api/students/:id/progress
 * Get progress for a specific student
 */
router.get('/:id/progress', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            `SELECT p.id, p.activity_index, p.completed, p.completion_date, 
                    p.completion_time, p.notes, p.updated_at
             FROM student_progress p
             JOIN students s ON p.student_id = s.id
             WHERE p.student_id = $1 AND s.user_id = $2
             ORDER BY p.activity_index`,
            [id, req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

module.exports = router;
