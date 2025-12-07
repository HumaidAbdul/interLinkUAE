// backend/routes/adminRoutes.js
const router = require("express").Router();
const ctrl = require("../controllers/adminController");

// نستخدم نفس نظام الحماية الموجود في باقي المشروع
const auth = require("../middleware/authMiddleware");

// ميدل وير بسيط للتأكد إن اليوزر Admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

// كل راوتات الأدمن محمية
router.use(auth, requireAdmin);

// summary & pending lists
router.get("/summary", ctrl.getSummary);
router.get("/pending-internships", ctrl.getPendingInternships);
router.get("/pending-applications", ctrl.getPendingApplications);

// approve / reject internships
router.post("/internships/:id/approve", ctrl.approveInternship);
router.post("/internships/:id/reject", ctrl.rejectInternship);

// approve / reject applications
router.post("/applications/:id/approve", ctrl.approveApplication);
router.post("/applications/:id/reject", ctrl.rejectApplication);

// users list + details
router.get("/users", ctrl.getAllUsers);
router.get("/users/:id", ctrl.getUserById);

// application details
router.get("/applications/:id", ctrl.getApplicationById);

router.get('/internships/:id', ctrl.getAdminInternshipById);


module.exports = router;
