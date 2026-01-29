const express = require('express');
const CircleController = require('../controllers/circleController.js');

const router = express.Router();
const controller = new CircleController();

router.post('/color', (req, res) => {
    const { color } = req.body;
    if (color) {
        const updatedColor = controller.changeColor(color);
        res.json({ color: updatedColor });
    } else {
        res.status(400).json({ error: 'Color required' });
    }
});

router.post('/radius', (req, res) => {
    const { radius } = req.body;
    if (radius && typeof radius === 'number') {
        const updatedRadius = controller.changeRadius(radius);
        res.json({ radius: updatedRadius });
    } else {
        res.status(400).json({ error: 'Valid radius required' });
    }
});

router.post('/reset', (req, res) => {
    const resetData = controller.reset();
    res.json(resetData);
});

router.get('/state', (req, res) => {
    const state = controller.getCircleProperties();
    res.json(state);
});

module.exports = router;