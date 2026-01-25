const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');

// Get all settings (Admin only)
router.get('/', auth(['admin']), async (req, res) => {
    try {
        const settings = await Setting.find();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update or Create a setting (Admin only)
router.put('/', auth(['admin']), async (req, res) => {
    try {
        const { key, value, description } = req.body;
        const setting = await Setting.findOneAndUpdate(
            { key },
            { value, description },
            { new: true, upsert: true } // Create if doesn't exist
        );
        res.json(setting);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get a specific setting (Public/Authenticated)
router.get('/:key', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        if (!setting) return res.status(404).json({ message: 'Setting not found' });
        res.json(setting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
