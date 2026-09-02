const Employee = require("../models/Employee");
const Department = require("../models/Department");
const TrainingAssignment = require("../models/TrainingAssignment");
const EmployerProfile = require("../models/EmployerProfile");
const Course = require("../models/Course");

const getEmployerProfileId = async (user) => {
  let profile = await EmployerProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await EmployerProfile.create({
      userId: user._id,
      companyName: user.fullName || "Company",
    });
  }
  return profile._id;
};

// ==================== EMPLOYEES ====================

// GET /api/organization/employees
exports.getEmployees = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { department, status, search } = req.query;

    const query = { employerId };
    if (department && department !== "All") query.department = department;
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/organization/employees
exports.addEmployee = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { fullName, email, phone, designation, department, team, roleInCompany, skills } = req.body;

    if (!fullName || !email || !designation) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and designation are required",
      });
    }

    const existing = await Employee.findOne({ employerId, email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An employee with this email already exists in your organization",
      });
    }

    const employee = await Employee.create({
      employerId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || "",
      designation: designation.trim(),
      department: department || "Engineering",
      team: team || "Core Team",
      roleInCompany: roleInCompany || "Employee",
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(",").map((s) => s.trim()) : []),
      status: "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Employee added successfully",
      employee,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/organization/employees/:id
exports.updateEmployee = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, employerId },
      req.body,
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/organization/employees/:id
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    await Employee.findOneAndDelete({ _id: req.params.id, employerId });
    await TrainingAssignment.deleteMany({ employeeId: req.params.id });

    return res.status(200).json({
      success: true,
      message: "Employee removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==================== DEPARTMENTS & TEAMS ====================

// GET /api/organization/departments
exports.getDepartments = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    let departments = await Department.find({ employerId }).sort({ name: 1 });

    if (departments.length === 0) {
      // Seed default standard departments
      departments = await Department.insertMany([
        { employerId, name: "Engineering", head: "VP Engineering", teams: ["Frontend", "Backend", "DevOps", "QA"] },
        { employerId, name: "Product & Design", head: "Head of Product", teams: ["UI/UX", "Product Management"] },
        { employerId, name: "Marketing & Growth", head: "Marketing Director", teams: ["Digital Marketing", "Content", "SEO"] },
        { employerId, name: "Human Resources", head: "HR Manager", teams: ["Recruitment", "People Ops", "L&D"] },
      ]);
    }

    return res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/organization/departments
exports.createDepartment = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { name, head, teams, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Department name is required" });
    }

    const dept = await Department.create({
      employerId,
      name: name.trim(),
      head: head || "",
      teams: Array.isArray(teams) ? teams : (teams ? teams.split(",").map((t) => t.trim()) : ["General"]),
      description: description || "",
    });

    return res.status(201).json({
      success: true,
      message: "Department created",
      department: dept,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== TRAINING ASSIGNMENTS ====================

// GET /api/organization/training
exports.getTrainingAssignments = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const assignments = await TrainingAssignment.find({ employerId })
      .populate("courseId", "title domain category duration durationUnit thumbnail skills")
      .populate("employeeId", "fullName email designation department team")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/organization/training/assign
exports.assignTraining = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { courseId, assignedToType, employeeId, departmentName, teamName, deadline } = req.body;

    if (!courseId || !deadline) {
      return res.status(400).json({
        success: false,
        message: "Course and completion deadline are required",
      });
    }

    if (assignedToType === "Department" && departmentName) {
      const employees = await Employee.find({ employerId, department: departmentName });
      const createdAssignments = [];

      for (const emp of employees) {
        const assignment = await TrainingAssignment.create({
          employerId,
          courseId,
          assignedToType: "Department",
          employeeId: emp._id,
          departmentName,
          assignedBy: req.user._id,
          deadline: new Date(deadline),
          status: "Assigned",
        });
        createdAssignments.push(assignment);
      }

      return res.status(201).json({
        success: true,
        message: `Course assigned to all ${employees.length} employees in ${departmentName}`,
        assignments: createdAssignments,
      });
    }

    // Single employee assignment
    const assignment = await TrainingAssignment.create({
      employerId,
      courseId,
      assignedToType: assignedToType || "Employee",
      employeeId: employeeId || null,
      departmentName: departmentName || "",
      teamName: teamName || "",
      assignedBy: req.user._id,
      deadline: new Date(deadline),
      status: "Assigned",
    });

    return res.status(201).json({
      success: true,
      message: "Training assigned successfully",
      assignment,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SKILL GAP ANALYSIS ====================

// GET /api/organization/skill-gaps
exports.getSkillGapAnalysis = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const employees = await Employee.find({ employerId }).lean();
    const courses = await Course.find({ status: "Published" }).lean();

    // Standard benchmark required competencies by department
    const benchmarkSkills = {
      Engineering: ["React.js", "Node.js", "System Design", "Docker", "TypeScript", "SQL"],
      "Product & Design": ["Figma", "User Research", "Wireframing", "Agile", "Design Systems"],
      "Marketing & Growth": ["SEO", "Google Analytics", "Content Strategy", "Social Media Marketing"],
      "Human Resources": ["HR Analytics", "Talent Acquisition", "Conflict Resolution", "Employment Law"],
    };

    const departmentSkillGaps = [];

    Object.keys(benchmarkSkills).forEach((dept) => {
      const deptEmployees = employees.filter((e) => e.department === dept);
      const required = benchmarkSkills[dept];

      const currentSkillsSet = new Set();
      deptEmployees.forEach((e) => (e.skills || []).forEach((s) => currentSkillsSet.add(s.toLowerCase())));

      const strongSkills = [];
      const missingSkills = [];

      required.forEach((rSkill) => {
        const found = Array.from(currentSkillsSet).some((cs) => cs.includes(rSkill.toLowerCase()) || rSkill.toLowerCase().includes(cs));
        if (found) strongSkills.push(rSkill);
        else missingSkills.push(rSkill);
      });

      // Recommend relevant LMS courses for missing skills
      const recommendedCourses = courses
        .filter((c) =>
          missingSkills.some((ms) =>
            (c.skills || []).some((cs) => cs.toLowerCase().includes(ms.toLowerCase()) || ms.toLowerCase().includes(cs.toLowerCase()))
          )
        )
        .slice(0, 3);

      departmentSkillGaps.push({
        department: dept,
        totalEmployees: deptEmployees.length || 4,
        requiredSkills: required,
        strongSkills,
        missingSkills,
        gapPercentage: Math.round((missingSkills.length / required.length) * 100),
        recommendedCourses,
      });
    });

    return res.status(200).json({
      success: true,
      skillGaps: departmentSkillGaps,
    });
  } catch (error) {
    next(error);
  }
};
