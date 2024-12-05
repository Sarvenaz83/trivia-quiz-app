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

router.post('/submit', async (req, res) => {
    const { userId, answers } = req.body;

    if (!userId || !answers) {
        return res.status(400).json({ error: 'userId and answers are required' });
    }

    try {
        console.log('Request received:', { userId, answers });

        // 1. Fetch questions from DynamoDB
        const getQuestionsCommand = `aws dynamodb scan --table-name Questions --output json --region eu-north-1`;
        console.log('Executing command:', getQuestionsCommand);
        const result = await executeCommand(getQuestionsCommand);
        console.log('Questions fetched:', result);

        const questions = JSON.parse(result).Items.map((item) => ({
            id: item.id.S,
            correctAnswer: parseInt(item.correctAnswer.N),
        }));

        // 2. Calculate the score
        let score = 0;
        questions.forEach((q, index) => {
            if (answers[index] !== undefined && answers[index] === q.correctAnswer) {
                score++;
            }
        });
        console.log('Score calculated:', score);

        // 3. Generate timestamp
        const timestamp = new Date().toISOString();
        console.log('Generated timestamp:', timestamp);

        // 4. Format data for DynamoDB
        const dynamoDBItem = {
            userId: { S: userId },
            timestamp: { S: timestamp },
            score: { N: score.toString() },
        };
        console.log('DynamoDB item:', dynamoDBItem);

        const saveResultCommand = `aws dynamodb put-item --table-name Results --region eu-north-1 --item "${JSON.stringify({
            userId: { S: userId },
            timestamp: { S: timestamp },
            score: { N: score.toString() },
        }).replace(/"/g, '\\"')}"`;
        console.log('SaveResultCommand:', saveResultCommand);


        // 5. Save result in Results table
        await executeCommand(saveResultCommand);

        // 6. Return response
        res.json({ userId, score, timestamp });
    } catch (error) {
        console.error('Error during submission:', error);
        res.status(500).json({ error: 'Failed to submit answers', details: error.message || error });
    }
});



module.exports = router;