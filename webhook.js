const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const git = simpleGit();

const app = express();
const port = 5000;  // The port where the webhook will be received

app.use(bodyParser.json());

// Handle the webhook request
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  
  // Pull latest changes from the repository
  git.pull('origin', 'main', (err, update) => {
    if (err) {
      console.error('Error pulling the repository:', err);
      res.status(500).send('Error pulling repository');
      return;
    }
    console.log('Pull result:', update);
    res.status(200).send('Successfully updated from GitHub');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Listening for GitHub webhook on http://0.0.0.0:${port}`);
});
