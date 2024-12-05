const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send({ message: 'Trivia Quiz App API is running' });
});

module.exports = router;