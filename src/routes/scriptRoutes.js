const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');

router.post('/run-script', scriptController.runScript);

module.exports = router;