// server/controllers/internshipController.js
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const { syncExternalInternships } = require("../services/externalInternships");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const { isEligibleForInternship } = require("../utils/eligibility");

// Helper to normalize URL slugs to category names
const formatCategorySlug = (slug = "") => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getUserProfileFromReq = async (req) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return null;

    if (user.userType === "student") {
      return await StudentProfile.findOne({ userId: user._id });
    } else if (user.userType === "fresher") {
      return await FresherProfile.findOne({ userId: user._id });
    }
  } catch (error) {
    // ignore
  }
  return null;
};

// POST /api/internships (Employer creates internship)
exports.createInternship = async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "Complete company profile before posting internships",
      });
    }

    const internship = await Internship.create({
      ...req.body,
      employerId: profile._id,
      createdBy: req.user._id,
      companyName: profile.companyName,
      source: "CareerConnect",
      isExternal: false,
      status: req.body.status || "Published",
    });

    return res.status(201).json({
      success: true,
      message: "Internship posted successfully",
      internship,
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/internships (Filterable, paginated internship catalog)
exports.getInternships = async (req, res, next) => {
  try {
    const {
      q,
      search,
      category,
      city,
      location,
      workMode,
      skill,
      isPaid,
      hasJobOffer,
      isInternational,
      minStipend,
      maxStipend,
      source,
      myPosts,
      status,
      sort = "latest",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (myPosts === "true") {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      const profile = await EmployerProfile.findOne({ userId: req.user._id });
      if (!profile) {
        return res.json({
          success: true,
          count: 0,
          internships: [],
          data: [],
          pagination: { total: 0, page: 1, limit: Number(limit) || 20, totalPages: 1 },
        });
      }
      filter.employerId = profile._id;
    } else {
      filter.status = status || "Published";
    }

    // Work Mode
    if (workMode && workMode !== "All") {
      filter.workMode = workMode === "Remote" || workMode === "work-from-home" ? "Remote" : workMode;
    }

    // City & Location
    const targetCity = city && city !== "All" ? city.replace(/-/g, " ") : "";
    const targetLocation = location && location !== "All" ? location : "";
    if (targetCity || targetLocation) {
      const locTerm = targetCity || targetLocation;
      filter.$or = [
        { city: { $regex: locTerm, $options: "i" } },
        { location: { $regex: locTerm, $options: "i" } },
      ];
    }

    // Category
    if (category && category !== "All") {
      const formattedCategory = formatCategorySlug(category);
      const catRegex = new RegExp(formattedCategory, "i");
      const catFilter = [
        { category: { $regex: catRegex } },
        { subCategory: { $regex: catRegex } },
        { title: { $regex: catRegex } },
        { requiredSkills: { $in: [catRegex] } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: catFilter }];
        delete filter.$or;
      } else {
        filter.$or = catFilter;
      }
    }

    // Specific Skill
    if (skill && skill !== "All") {
      filter.requiredSkills = { $in: [new RegExp(skill, "i")] };
    }

    // Paid status
    if (isPaid !== undefined && isPaid !== "All") {
      if (isPaid === "true" || isPaid === true) {
        filter.isPaid = true;
      } else if (isPaid === "false" || isPaid === false) {
        filter.isPaid = false;
      }
    }

    // Job offer (PPO)
    if (hasJobOffer === "true" || hasJobOffer === true) {
      filter.hasJobOffer = true;
    }

    // International
    if (isInternational === "true" || isInternational === true) {
      filter.isInternational = true;
    }

    // Source (campus vs external)
    if (source === "campus") filter.isExternal = false;
    if (source === "external") filter.isExternal = true;

    // Search query (keyword: q or search)
    const searchTerm = (search || q || "").trim();
    if (searchTerm) {
      const sRegex = new RegExp(searchTerm, "i");
      const searchOr = [
        { title: { $regex: sRegex } },
        { description: { $regex: sRegex } },
        { companyName: { $regex: sRegex } },
        { category: { $regex: sRegex } },
        { requiredSkills: { $in: [sRegex] } },
        { location: { $regex: sRegex } },
      ];
      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === "stipend_high") sortOption = { "stipendAmount.min": -1, "salaryRange.min": -1 };
    if (sort === "stipend_low") sortOption = { "stipendAmount.min": 1, "salaryRange.min": 1 };
    if (sort === "deadline") sortOption = { deadline: 1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    // Try finding in Internship collection first
    let [total, items] = await Promise.all([
      Internship.countDocuments(filter),
      Internship.find(filter)
        .populate("employerId", "companyName logo headquarters website industry description")
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    // Fallback/Supplement from Job collection if Internship collection is empty or fewer records
    if (total === 0 && myPosts !== "true") {
      const jobFilter = {
        ...filter,
        employmentType: "Internship",
      };
      [total, items] = await Promise.all([
        Job.countDocuments(jobFilter),
        Job.find(jobFilter)
          .populate("employerId", "companyName logo headquarters website industry description")
          .sort(sortOption)
          .skip(skip)
          .limit(pageSize)
          .lean(),
      ]);
    }

    // Optional profile eligibility filtering for student/fresher
    let filteredList = items;
    if (myPosts !== "true") {
      const profile = await getUserProfileFromReq(req);
      if (profile) {
        filteredList = items.filter((item) => isEligibleForInternship(item, profile));
      }
    }

    const formattedList = filteredList.map((int) => {
      const stipendStr =
        int.stipend ||
        (int.salaryRange?.min > 0
          ? `₹${int.salaryRange.min.toLocaleString("en-IN")}/month`
          : int.stipendAmount?.min > 0
          ? `₹${int.stipendAmount.min.toLocaleString("en-IN")}/month`
          : int.isPaid ? "Paid Stipend" : "Unpaid / Academic");

      return {
        ...int,
        _id: int._id,
        id: int._id.toString(),
        jobId: int._id.toString(),
        title: int.title,
        company: int.employerId?.companyName || int.companyName || "Partner Employer",
        companyName: int.employerId?.companyName || int.companyName || "Partner Employer",
        companyId: int.employerId?._id || "",
        logo: int.employerId?.logo || "",
        location: int.location,
        city: int.city || "Bangalore",
        category: int.category || "Web Development",
        subCategory: int.subCategory || "Full Stack",
        stipend: stipendStr,
        salary: stipendStr,
        duration: int.duration || "3-6 Months",
        type: "Internship",
        workMode: int.workMode || "Remote",
        isPaid: int.isPaid !== false,
        hasJobOffer: !!int.hasJobOffer,
        isInternational: !!int.isInternational,
        skillsRequired: int.requiredSkills || [],
        postedAt: "Recently Posted",
        createdAt: int.createdAt,
        deadline: int.deadline
          ? new Date(int.deadline).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Open until filled",
        description: int.description,
        responsibilities: int.responsibilities || [],
        openings: int.openings || 1,
        applicantsCount: int.applicantsCount || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedList.length,
      data: formattedList,
      internships: formattedList,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/internships/categories (Dynamic category & location counts aggregated from database)
exports.getInternshipCategories = async (req, res, next) => {
  try {
    const baseQuery = { status: "Published" };

    const [
      internshipCount,
      jobInternshipCount,
      allInternships,
      allJobs,
    ] = await Promise.all([
      Internship.countDocuments(baseQuery),
      Job.countDocuments({ ...baseQuery, employmentType: "Internship" }),
      Internship.find(baseQuery).select("category city workMode isPaid hasJobOffer isInternational requiredSkills").lean(),
      Job.find({ ...baseQuery, employmentType: "Internship" }).select("category city workMode isPaid hasJobOffer isInternational requiredSkills").lean(),
    ]);

    const combined = [...allInternships, ...allJobs];
    const totalActive = internshipCount > 0 ? internshipCount : jobInternshipCount;

    const workFromHomeCount = combined.filter((i) => i.workMode === "Remote").length;
    const paidCount = combined.filter((i) => i.isPaid !== false).length;
    const withJobOfferCount = combined.filter((i) => !!i.hasJobOffer).length;
    const internationalCount = combined.filter((i) => !!i.isInternational).length;

    // Top Cities
    const targetCities = [
      "Bangalore",
      "Delhi",
      "Hyderabad",
      "Mumbai",
      "Chennai",
      "Pune",
      "Kolkata",
      "Jaipur",
      "Gurugram",
      "Noida",
    ];

    const cityCounts = {};
    targetCities.forEach((city) => {
      cityCounts[city] = combined.filter(
        (i) => i.city?.toLowerCase() === city.toLowerCase()
      ).length;
    });

    // Top Categories
    const targetCategories = [
      "Web Development",
      "App Development",
      "Software Development",
      "Data Science",
      "Machine Learning",
      "AI",
      "UI/UX Design",
      "Digital Marketing",
      "Content Writing",
      "Graphic Design",
      "HR",
      "Finance",
      "Sales",
      "Business Development",
      "Python",
      "Java",
      "React",
    ];

    const categoryCounts = {};
    targetCategories.forEach((cat) => {
      const catLower = cat.toLowerCase();
      categoryCounts[cat] = combined.filter(
        (i) =>
          i.category?.toLowerCase() === catLower ||
          (i.requiredSkills || []).some((s) => s.toLowerCase().includes(catLower))
      ).length;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalActive: totalActive || combined.length,
        workFromHomeCount,
        paidCount,
        withJobOfferCount,
        internationalCount,
        cityCounts,
        categoryCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/internships/:id
exports.getInternshipById = async (req, res, next) => {
  try {
    let internship = await Internship.findById(req.params.id).populate(
      "employerId",
      "companyName logo industry headquarters website description"
    );

    if (!internship) {
      internship = await Job.findOne({
        _id: req.params.id,
        employmentType: "Internship",
      }).populate(
        "employerId",
        "companyName logo industry headquarters website description"
      );
    }

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship opportunity not found" });
    }

    internship.viewsCount = (internship.viewsCount || 0) + 1;
    await internship.save();

    return res.status(200).json({
      success: true,
      internship,
      data: internship,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/internships/:id (Employer updates internship)
exports.updateInternship = async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const internship = await Internship.findOne({
      _id: req.params.id,
      employerId: profile?._id,
    });

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    ["employerId", "createdBy", "source", "isExternal", "externalId"].forEach(
      (k) => delete req.body[k]
    );

    Object.assign(internship, req.body);
    await internship.save();

    return res.json({ success: true, message: "Updated", internship, data: internship });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/internships/:id/status (Employer updates status)
exports.updateInternshipStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["Draft", "Published", "Paused", "Closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const internship = await Internship.findOneAndUpdate(
      { _id: req.params.id, employerId: profile?._id },
      { status },
      { new: true }
    );

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    return res.json({ success: true, internship, data: internship });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/internships/:id (Employer deletes internship)
exports.deleteInternship = async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const internship = await Internship.findOneAndDelete({
      _id: req.params.id,
      employerId: profile?._id,
    });

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    return res.json({ success: true, message: "Internship deleted" });
  } catch (error) {
    next(error);
  }
};

// POST /api/internships/sync/external (Sync external APIs)
exports.syncFromExternalAPIs = async (req, res, next) => {
  try {
    const result = await syncExternalInternships();
    return res.json({
      success: true,
      message: "External internships synced",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
