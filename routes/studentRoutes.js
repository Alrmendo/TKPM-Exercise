const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Route hiển thị trang sinh viên
router.get('/', studentController.getStudentPage);

module.exports = router;
