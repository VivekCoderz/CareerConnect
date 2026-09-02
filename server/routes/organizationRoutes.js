const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/organizationController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);
router.use(requireEmployer);

// Employees
router.get("/employees", organizationController.getEmployees);
router.post("/employees", organizationController.addEmployee);
router.put("/employees/:id", organizationController.updateEmployee);
router.delete("/employees/:id", organizationController.deleteEmployee);

// Departments
router.get("/departments", organizationController.getDepartments);
router.post("/departments", organizationController.createDepartment);

// Training Assignments
router.get("/training", organizationController.getTrainingAssignments);
router.post("/training/assign", organizationController.assignTraining);

// Skill Gap Analysis
router.get("/skill-gaps", organizationController.getSkillGapAnalysis);

module.exports = router;
