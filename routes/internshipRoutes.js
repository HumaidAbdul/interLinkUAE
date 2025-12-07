const express = require('express');
const router = express.Router();
const { createInternship, getAllInternships, getInternshipById, updateInternship, getById } = require('../controllers/internshipController');
const authenticate = require('../middleware/authMiddleware');


router.post('/create', authenticate, createInternship);  // employer only
router.get('/all', getAllInternships);                   // public
router.get('/:id', getInternshipById);
router.put('/:id', authenticate, updateInternship);

router.get('/:id', getById);
module.exports = router;


