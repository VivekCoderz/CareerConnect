const Employee = require("../models/Employee");
const Department = require("../models/Department");
const TrainingAssignment = require("../models/TrainingAssignment");
const EmployerProfile = require("../models/EmployerProfile");
const Course = require("../models/Course");
<<<<<<< HEAD
const TeamRole = require("../models/TeamRole");
=======
const mongoose = require("mongoose");
const { escapeRegex } = require("../utils/listingSecurity");

const employeeFields = new Set([
  "fullName", "email", "phone", "designation", "department", "team",
  "roleInCompany", "skills", "joinedDate", "status", "avatar",
]);
const getPage = (query) => ({
  page: Math.max(1, Math.min(1000, Number.parseInt(query.page, 10) || 1)),
  limit: Math.max(1, Math.min(200, Number.parseInt(query.limit, 10) || 50)),
});
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7

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

    if ((department && typeof department !== "string") ||
        (status && typeof status !== "string") ||
        (search && typeof search !== "string")) {
      return res.status(400).json({ success: false, message: "Invalid employee filter" });
    }

    const query = { employerId };
    if (department && department !== "All") query.department = department;
    if (status && status !== "All") query.status = status;
    if (typeof search === "string" && search.trim()) {
      const term = escapeRegex(search.trim());
      query.$or = [
        { fullName: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { designation: { $regex: term, $options: "i" } },
      ];
    }

    const { page, limit } = getPage(req.query);
    const [employees, total] = await Promise.all([
      Employee.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Employee.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: employees.length,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
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
    const update = Object.fromEntries(Object.entries(req.body || {})
      .filter(([key]) => employeeFields.has(key)));
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No editable employee fields supplied" });
    }
    if (update.email !== undefined) {
      if (typeof update.email !== "string" || !update.email.trim()) {
        return res.status(400).json({ success: false, message: "Valid email is required" });
      }
      update.email = update.email.trim().toLowerCase();
    }
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, employerId },
      { $set: update },
      { returnDocument: "after", runValidators: true }
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
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, employerId });
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    await TrainingAssignment.deleteMany({ employerId, employeeId: employee._id });

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
    const { page, limit } = getPage(req.query);
    const [assignments, total] = await Promise.all([TrainingAssignment.find({ employerId })
      .populate("courseId", "title domain category duration durationUnit thumbnail skills")
      .populate("employeeId", "fullName email designation department team")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      TrainingAssignment.countDocuments({ employerId }),
    ]);

    return res.status(200).json({
      success: true,
      count: assignments.length,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
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

    const due = new Date(deadline);
    if (!mongoose.Types.ObjectId.isValid(courseId) || Number.isNaN(due.getTime()) || due <= new Date() ||
        !["Employee", "Department", "Team", undefined].includes(assignedToType)) {
      return res.status(400).json({ success: false, message: "Invalid course, assignment type, or deadline" });
    }
    const course = await Course.findOne({
      _id: courseId, $or: [{ status: "Published" }, { createdBy: req.user._id }],
    }).select("_id").lean();
    if (!course) return res.status(404).json({ success: false, message: "Course not available" });

    if (assignedToType === "Department" || assignedToType === "Team") {
      const name = assignedToType === "Department" ? departmentName : teamName;
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Department or team is required" });
      }
      const employees = await Employee.find({ employerId, [assignedToType === "Department" ? "department" : "team"]: name.trim() })
        .select("_id").limit(501).lean();
      if (employees.length > 500) {
        return res.status(400).json({ success: false, message: "Assign training in batches of 500 or fewer employees" });
      }
      const createdAssignments = await TrainingAssignment.insertMany(employees.map((emp) => ({
          employerId,
          courseId,
          assignedToType,
          employeeId: emp._id,
          departmentName: assignedToType === "Department" ? name.trim() : "",
          teamName: assignedToType === "Team" ? name.trim() : "",
          assignedBy: req.user._id,
          deadline: due,
          status: "Assigned",
      })));

      return res.status(201).json({
        success: true,
        message: `Course assigned to ${employees.length} employees in ${name.trim()}`,
        assignments: createdAssignments,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId) ||
        !(await Employee.exists({ _id: employeeId, employerId }))) {
      return res.status(404).json({ success: false, message: "Employee not found in your organization" });
    }

    // Single employee assignment
    const assignment = await TrainingAssignment.create({
      employerId,
      courseId,
      assignedToType: "Employee",
      employeeId,
      departmentName: "",
      teamName: "",
      assignedBy: req.user._id,
      deadline: due,
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

// ==================== DYNAMIC TEAM ROLES ====================

// GET /api/organization/team-roles
exports.getTeamRoles = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const roles = await TeamRole.find({ employerId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: roles.length, roles });
  } catch (error) {
    next(error);
  }
};

// POST /api/organization/team-roles
exports.createTeamRole = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { name, description, permissions, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }
    const role = await TeamRole.create({
      employerId,
      name: name.trim(),
      description: description || "",
      permissions: Array.isArray(permissions) ? permissions : [],
      type: type || "custom",
    });
    return res.status(201).json({ success: true, message: "Role created successfully", role });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/organization/team-roles/:id
exports.deleteTeamRole = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const deleted = await TeamRole.findOneAndDelete({ _id: req.params.id, employerId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    return res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    next(error);
  }
};
