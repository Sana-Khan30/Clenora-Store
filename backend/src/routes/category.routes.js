const express = require('express');
const c = require('../controllers/category.controller');

const router = express.Router();
router.get('/', c.listPublic);

module.exports = router;
