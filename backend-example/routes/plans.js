const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/plans/:planType
 * Get all activities for a specific plan type
 */
router.get('/:planType', async (req, res) => {
    const { planType } = req.params;
    
    if (planType < 1 || planType > 6) {
        return res.status(400).json({ error: 'Plan type must be between 1 and 6' });
    }
    
    try {
        const result = await db.query(
            `SELECT id, plan_type, activity_text, order_index, created_at 
             FROM plan_templates 
             WHERE plan_type = $1 AND user_id = $2 
             ORDER BY order_index`,
            [planType, req.user.userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching plan:', error);
        res.status(500).json({ error: 'Failed to fetch plan' });
    }
});

/**
 * GET /api/plans
 * Get all plans
 */
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, plan_type, activity_text, order_index, created_at 
             FROM plan_templates 
             WHERE user_id = $1 
             ORDER BY plan_type, order_index`,
            [req.user.userId]
        );
        
        // Group by plan_type
        const plans = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        result.rows.forEach(row => {
            plans[row.plan_type].push(row);
        });
        
        res.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

/**
 * POST /api/plans/:planType
 * Add activity to plan
 */
router.post('/:planType', async (req, res) => {
    const { planType } = req.params;
    const { activity_text } = req.body;
    
    if (!activity_text) {
        return res.status(400).json({ error: 'activity_text is required' });
    }
    
    if (planType < 1 || planType > 6) {
        return res.status(400).json({ error: 'Plan type must be between 1 and 6' });
    }
    
    try {
        // Get max order_index
        const maxOrder = await db.query(
            'SELECT COALESCE(MAX(order_index), -1) as max_order FROM plan_templates WHERE plan_type = $1 AND user_id = $2',
            [planType, req.user.userId]
        );
        
        const nextOrder = maxOrder.rows[0].max_order + 1;
        
        const result = await db.query(
            `INSERT INTO plan_templates (plan_type, activity_text, order_index, user_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, plan_type, activity_text, order_index, created_at`,
            [planType, activity_text, nextOrder, req.user.userId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(500).json({ error: 'Failed to add activity' });
    }
});

/**
 * PUT /api/plans/:id
 * Update activity
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { activity_text } = req.body;
    
    if (!activity_text) {
        return res.status(400).json({ error: 'activity_text is required' });
    }
    
    try {
        const result = await db.query(
            `UPDATE plan_templates 
             SET activity_text = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND user_id = $3 
             RETURNING id, plan_type, activity_text, order_index, updated_at`,
            [activity_text, id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ error: 'Failed to update activity' });
    }
});

/**
 * DELETE /api/plans/:id
 * Delete activity
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(
            'DELETE FROM plan_templates WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});

/**
 * DELETE /api/plans/:planType/clear
 * Clear entire plan
 */
router.delete('/:planType/clear', async (req, res) => {
    const { planType } = req.params;
    
    if (planType < 1 || planType > 6) {
        return res.status(400).json({ error: 'Plan type must be between 1 and 6' });
    }
    
    try {
        await db.query(
            'DELETE FROM plan_templates WHERE plan_type = $1 AND user_id = $2',
            [planType, req.user.userId]
        );
        
        res.json({ message: `Plan ${planType} cleared successfully` });
    } catch (error) {
        console.error('Error clearing plan:', error);
        res.status(500).json({ error: 'Failed to clear plan' });
    }
});

/**
 * POST /api/plans/:planType/bulk
 * Add multiple activities at once
 */
router.post('/:planType/bulk', async (req, res) => {
    const { planType } = req.params;
    const { activities } = req.body; // Array of strings
    
    if (!Array.isArray(activities) || activities.length === 0) {
        return res.status(400).json({ error: 'activities array is required' });
    }
    
    if (planType < 1 || planType > 6) {
        return res.status(400).json({ error: 'Plan type must be between 1 and 6' });
    }
    
    try {
        // Use transaction for bulk insert
        const result = await db.transaction(async (client) => {
            const inserted = [];
            
            for (let i = 0; i < activities.length; i++) {
                const res = await client.query(
                    `INSERT INTO plan_templates (plan_type, activity_text, order_index, user_id) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id, plan_type, activity_text, order_index`,
                    [planType, activities[i], i, req.user.userId]
                );
                inserted.push(res.rows[0]);
            }
            
            return inserted;
        });
        
        res.status(201).json({
            message: `${result.length} activities added successfully`,
            activities: result
        });
    } catch (error) {
        console.error('Error bulk adding activities:', error);
        res.status(500).json({ error: 'Failed to add activities' });
    }
});

module.exports = router;
