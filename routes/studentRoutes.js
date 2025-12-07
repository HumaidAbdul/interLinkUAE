const router = require('express').Router();
const upload = require('../middleware/uploadMiddleware');
const ctrl = require('../controllers/studentController');
const auth = require('../middleware/authMiddleware');
const requireApproved = require('../middleware/requireApproved');


// Public
router.post(
  '/register',
  upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'profile_image', maxCount: 1 }]),
  ctrl.registerStudent
);

// Protected
router.use(auth, requireApproved);
router.get('/dashboard', ctrl.getDashboard);
router.post('/apply', ctrl.applyToInternship);
router.get('/applications', ctrl.getStudentApplications);

router.put('/password', ctrl.changePassword);
router.put(
  '/dashboard',
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'cv',            maxCount: 1 },
  ]),
  ctrl.updateStudentProfile
);



module.exports = router;
