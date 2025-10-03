const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/progress/student/:studentId
 * Get progress for a specific student
 */
router.get('/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
    
    try {
        // Verify student belongs to user
        const studentCheck = await db.query(
            'SELECT id FROM students WHERE id = $1 AND user_id = $2',
            [studentId, req.user.userId]
        );
        
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const result = await db.query(
            `SELECT id, activity_index, completed, completion_date, 
                    completion_time, notes, updated_at
             FROM student_progress 
             WHERE student_id = $1 
             ORDER BY activity_index`,
            [studentId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

/**
 * POST /api/progress
 * Create or update progress entry
 */
router.post('/', async (req, res) => {
    const { student_id, activity_index, completed, completion_date, completion_time, notes } = req.body;
    
    // Validation
    if (!student_id || activity_index === undefined) {
        return res.status(400).json({ 
            error: 'student_id and activity_index are required' 
        });
    }
    
    try {
        // Verify student belongs to user
        const studentCheck = await db.query(
            'SELECT id FROM students WHERE id = $1 AND user_id = $2',
            [student_id, req.user.userId]
        );
        
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Upsert (insert or update)
        const result = await db.query(
            `INSERT INTO student_progress 
                (student_id, activity_index, completed, completion_date, completion_time, notes, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (student_id, activity_index) 
             DO UPDATE SET 
                completed = EXCLUDED.completed,
                completion_date = EXCLUDED.completion_date,
                completion_time = EXCLUDED.completion_time,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
             RETURNING id, student_id, activity_index, completed, 
                       completion_date, completion_time, notes, updated_at`,
            [student_id, activity_index, completed || false, 
             completion_date || null, completion_time || null, 
             notes || null, req.user.userId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

/**
 * PUT /api/progress/:id
 * Update progress entry
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { completed, completion_date, completion_time, notes } = req.body;
    
    try {
        const result = await db.query(
            `UPDATE student_progress 
             SET completed = COALESCE($1, completed),
                 completion_date = COALESCE($2, completion_date),
                 completion_time = COALESCE($3, completion_time),
                 notes = COALESCE($4, notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6
             RETURNING id, student_id, activity_index, completed, 
                       completion_date, completion_time, notes, updated_at`,
            [completed, completion_date, completion_time, notes, id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Progress entry not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

/**
 * DELETE /api/progress/:id
 * Delete progress entry
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            'DELETE FROM student_progress WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Progress entry not found' });
        }
        
        res.json({ message: 'Progress entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting progress:', error);
        res.status(500).json({ error: 'Failed to delete progress' });
    }
});

/**
 * GET /api/progress/monthly/:year/:month
 * Get monthly progress summary for all students
 */
router.get('/monthly/:year/:month', async (req, res) => {
    const { year, month } = req.params;
    
    try {
        const result = await db.query(
            `SELECT sp.*, s.name, s.grade, s.plan_type
             FROM student_progress sp
             JOIN students s ON sp.student_id = s.id
             WHERE sp.user_id = $1 
             AND sp.completed = true
             AND sp.completion_date LIKE $2
             ORDER BY s.name, sp.activity_index`,
            [req.user.userId, `%.${month}.${year}`]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly progress:', error);
        res.status(500).json({ error: 'Failed to fetch monthly progress' });
    }
});

/**
 * GET /api/progress/stats/:studentId
 * Get progress statistics for a student
 */
router.get('/stats/:studentId', async (req, res) => {
    const { studentId } = req.params;
    
    try {
        // Verify student belongs to user
        const studentCheck = await db.query(
            'SELECT id, plan_type FROM students WHERE id = $1 AND user_id = $2',
            [studentId, req.user.userId]
        );
        
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const planType = studentCheck.rows[0].plan_type;
        
        // Get total activities in plan
        const totalActivities = await db.query(
            'SELECT COUNT(*) as total FROM plan_templates WHERE plan_type = $1 AND user_id = $2',
            [planType, req.user.userId]
        );
        
        // Get completed activities
        const completedActivities = await db.query(
            'SELECT COUNT(*) as completed FROM student_progress WHERE student_id = $1 AND completed = true',
            [studentId]
        );
        
        const total = parseInt(totalActivities.rows[0].total);
        const completed = parseInt(completedActivities.rows[0].completed);
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        res.json({
            student_id: studentId,
            total_activities: total,
            completed_activities: completed,
            percentage: percentage,
            remaining: total - completed
        });
    } catch (error) {
        console.error('Error fetching progress stats:', error);
        res.status(500).json({ error: 'Failed to fetch progress stats' });
    }
});

module.exports = router;
