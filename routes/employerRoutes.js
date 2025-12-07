const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/employerController');


router.post('/register', upload.single('logo'), ctrl.registerEmployer);

router.get('/internships', auth, ctrl.getEmployerInternships); // ✅

router.get('/dashboard', auth, ctrl.getEmployerDashboard);
router.get('/internships/:id/applications', auth, ctrl.getInternshipApplications); // ✅
router.get('/applicants/:internship_id', auth, ctrl.getInternshipApplicants);
router.post('/applications/:id/approve', auth, ctrl.approveApplication);
router.post('/applications/:id/reject', auth, ctrl.rejectApplication);
router.put('/profile',auth,   upload.single('company_logo'),ctrl.updateEmployerProfile);
router.put('/password', ctrl.changePassword);

module.exports = router;
