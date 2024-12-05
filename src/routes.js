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

        const getQuestionsCommand = `aws dynamodb scan --table-name Questions --output json --region eu-north-1`;
        console.log('Executing command:', getQuestionsCommand);
        const result = await executeCommand(getQuestionsCommand);
        console.log('Questions fetched:', result);

        const questions = JSON.parse(result).Items.map((item) => ({
            id: item.id.S,
            correctAnswer: parseInt(item.correctAnswer.N),
        }));

        let score = 0;
        questions.forEach((q, index) => {
            if (answers[index] !== undefined && answers[index] === q.correctAnswer) {
                score++;
            }
        });
        console.log('Score calculated:', score);

        const timestamp = new Date().toISOString();
        console.log('Generated timestamp:', timestamp);

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


        await executeCommand(saveResultCommand);

        res.json({ userId, score, timestamp });
    } catch (error) {
        console.error('Error during submission:', error);
        res.status(500).json({ error: 'Failed to submit answers', details: error.message || error });
    }
});

router.get('/results', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        // Dynamically construct JSON for --expression-attribute-values
        const expressionAttributeValues = JSON.stringify({
            ":userId": { "S": userId }
        }).replace(/"/g, '\\"'); // Escape double quotes for AWS CLI

        // Construct the query command with properly escaped JSON
        const queryCommand = `aws dynamodb query --table-name Results --region eu-north-1 --key-condition-expression "userId = :userId" --expression-attribute-values "{\\":userId\\":{\\"S\\":\\"${userId}\\"}}" --output json`;

        console.log('Executing queryCommand:', queryCommand);

        const result = await executeCommand(queryCommand);

        // Parse and format the results
        const items = JSON.parse(result).Items.map((item) => ({
            userId: item.userId.S,
            timestamp: item.timestamp.S,
            score: parseInt(item.score.N),
        }));

        res.json(items);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results', details: error.message || error });
    }
});

router.get('/results/all', async (req, res) => {
    try {
        // Construct the scan command to fetch all items
        const scanCommand = `aws dynamodb scan --table-name Results --region eu-north-1 --output json`;

        console.log('Executing scanCommand:', scanCommand);

        const result = await executeCommand(scanCommand);

        // Parse and format the results
        const items = JSON.parse(result).Items.map((item) => ({
            userId: item.userId.S,
            timestamp: item.timestamp.S,
            score: parseInt(item.score.N),
        }));

        res.json(items);
    } catch (error) {
        console.error('Error fetching all results:', error);
        res.status(500).json({ error: 'Failed to fetch all results', details: error.message || error });
    }
});



module.exports = router;