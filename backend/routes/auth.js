const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authcontrollers');

router.post('/register', registerUser);

module.exports = router;
