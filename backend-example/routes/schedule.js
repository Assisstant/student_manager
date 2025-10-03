const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/schedule
 * Get full schedule for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.id, s.day_of_week, s.time_slot, s.student_id,
                    st.name, st.grade, st.plan_type
             FROM schedule s
             JOIN students st ON s.student_id = st.id
             WHERE s.user_id = $1
             ORDER BY s.day_of_week, s.time_slot`,
            [req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

/**
 * POST /api/schedule
 * Add student to schedule slot
 */
router.post('/', async (req, res) => {
    const { student_id, day_of_week, time_slot } = req.body;
    
    // Validation
    if (!student_id || !day_of_week || time_slot === undefined) {
        return res.status(400).json({ 
            error: 'student_id, day_of_week, and time_slot are required' 
        });
    }
    
    try {
        // Check if student belongs to user
        const studentCheck = await db.query(
            'SELECT id FROM students WHERE id = $1 AND user_id = $2',
            [student_id, req.user.userId]
        );
        
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const result = await db.query(
            `INSERT INTO schedule (student_id, day_of_week, time_slot, user_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, student_id, day_of_week, time_slot`,
            [student_id, day_of_week, time_slot, req.user.userId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ 
                error: 'Student already scheduled for this time slot' 
            });
        }
        console.error('Error creating schedule:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});

/**
 * DELETE /api/schedule/:id
 * Remove from schedule
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            'DELETE FROM schedule WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule entry not found' });
        }
        
        res.json({ message: 'Removed from schedule successfully' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

/**
 * DELETE /api/schedule/clear
 * Clear entire schedule
 */
router.delete('/clear/all', async (req, res) => {
    try {
        await db.query(
            'DELETE FROM schedule WHERE user_id = $1',
            [req.user.userId]
        );
        
        res.json({ message: 'Schedule cleared successfully' });
    } catch (error) {
        console.error('Error clearing schedule:', error);
        res.status(500).json({ error: 'Failed to clear schedule' });
    }
});

module.exports = router;
