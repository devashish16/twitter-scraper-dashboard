const express = require('express');
const router = express.Router();

const USER = {
  username: 'admin',
  password: '1234',
};

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === USER.username && password === USER.password) {
    return res.status(200).json({ message: 'Login successful' });
  } else {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
});

module.exports = router;
