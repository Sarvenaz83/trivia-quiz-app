const express = require('express');
const router = express.Router();
const { executeCommand } = require('./db-config');

router.get('/questions', async (req, res) => {
    try {
        const command = `aws dynamodb scan --table-name Questions --output json --region eu-north-1`;
        const result = await executeCommand(command);

        const questions = JSON.parse(result).Items.map((item) => ({
            id: item.id.S,
            question: item.question.S,
            answers: item.answers.L.map((ans) => ans.S),
            correctAnswer: parseInt(item.correctAnswer.N),
        }));
        

        res.json(questions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions', details: error });
    }
});

module.exports = router;