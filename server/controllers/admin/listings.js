// Jobs and internships: the admin list, posting for an employer and editing.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const mongoose = require("mongoose");
const Company = require("../../models/Company");
const Report = require("../../models/Report");
const Job = require("../../models/Job");
const Internship = require("../../models/Internship");
const Application = require("../../models/Application");
const EmployerProfile = require("../../models/EmployerProfile");
const AuditLog = require("../../models/AuditLog");
const {
  pickListingUpdate,
  checkListingInput,
  checkListingKind,
  hasLocation,
  LOCATION_REQUIRED,
} = require("../../utils/listingSecurity");
const { clearSearchCache } = require("../../services/jobScraperService");
const { createNotification } = require("../../services/notificationService");

/**
 * GET /api/admin/opportunities
 * Comprehensive server-side filtering, dynamic KPIs, application counts, and attention items
 */
exports.getAdminOpportunities = async (req, res, next) => {
  try {
    const {
      type = "all",
      status = "all",
      companyId = "",
      search = "",
      startDate = "",
      endDate = "",
      page = 1,
      limit = 12,
    } = req.query;

    const isCompanyAdmin = req.user.role === "COMPANY_ADMIN";
    const effectiveCompanyId = isCompanyAdmin ? req.user.companyId : companyId;

    // Base filter for KPI counts (scoped to company if company admin or company filter passed)
    const statsBaseFilter = {};
    if (effectiveCompanyId) {
      statsBaseFilter.companyId = effectiveCompanyId;
    }

    const now = new Date();

    // 1. DYNAMIC KPIS (Real MongoDB countDocuments)
    const [
      totalJobs,
      totalInternships,
      publishedJobs,
      publishedInternships,
      pendingJobs,
      pendingInternships,
      closedJobs,
      closedInternships,
      expiredJobs,
      expiredInternships,
      rejectedJobs,
      rejectedInternships,
      featuredJobs,
      featuredInternships,
    ] = await Promise.all([
      Job.countDocuments(statsBaseFilter),
      Internship.countDocuments(statsBaseFilter),
      // Active & Published: status Published and not past deadline
      Job.countDocuments({
        ...statsBaseFilter,
        status: "Published",
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }],
      }),
      Internship.countDocuments({
        ...statsBaseFilter,
        status: "Published",
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }],
      }),
      // Pending Review
      Job.countDocuments({ ...statsBaseFilter, status: "Pending Approval" }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Pending Approval" }),
      // Manually Closed
      Job.countDocuments({ ...statsBaseFilter, status: "Closed" }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Closed" }),
      // Expired (deadline passed & still Published)
      Job.countDocuments({ ...statsBaseFilter, status: "Published", deadline: { $lt: now } }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Published", deadline: { $lt: now } }),
      // Rejected
      Job.countDocuments({ ...statsBaseFilter, status: "Rejected" }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Rejected" }),
      // Featured
      Job.countDocuments({ ...statsBaseFilter, isFeatured: true }),
      Internship.countDocuments({ ...statsBaseFilter, isFeatured: true }),
    ]);

    const totalListings = totalJobs + totalInternships;
    const activePublished = publishedJobs + publishedInternships;
    const pendingReview = pendingJobs + pendingInternships;
    const closedExpired = (closedJobs + closedInternships) + (expiredJobs + expiredInternships);

    const stats = {
      total: totalListings,
      totalJobs,
      totalInternships,
      published: activePublished,
      pending: pendingReview,
      closed: closedExpired,
      rejected: rejectedJobs + rejectedInternships,
      featured: featuredJobs + featuredInternships,
    };

    // 2. BUILD QUERY FILTER FOR LISTINGS
    const queryFilter = {};
    if (effectiveCompanyId) {
      queryFilter.companyId = effectiveCompanyId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      queryFilter.$or = [
        { title: { $regex: s, $options: "i" } },
        { companyName: { $regex: s, $options: "i" } },
        { location: { $regex: s, $options: "i" } },
        { city: { $regex: s, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      queryFilter.createdAt = {};
      if (startDate) queryFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        queryFilter.createdAt.$lte = eDate;
      }
    }

    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "pending" || normalizedStatus === "pending review" || normalizedStatus === "pending approval") {
      queryFilter.status = "Pending Approval";
    } else if (normalizedStatus === "published" || normalizedStatus === "approved" || normalizedStatus === "active") {
      queryFilter.status = "Published";
      queryFilter.$and = queryFilter.$and || [];
      queryFilter.$and.push({
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }],
      });
    } else if (normalizedStatus === "closed") {
      queryFilter.status = "Closed";
    } else if (normalizedStatus === "expired") {
      queryFilter.deadline = { $lt: now };
    } else if (normalizedStatus === "rejected") {
      queryFilter.status = "Rejected";
    } else if (normalizedStatus === "featured") {
      queryFilter.isFeatured = true;
    } else if (status !== "all" && status !== "") {
      queryFilter.status = status;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const skip = (pageNum - 1) * limitNum;

    let items = [];
    let total = 0;

    const populateFields = [
      { path: "companyId", select: "name logo status isVerified location industry" },
      { path: "createdBy", select: "fullName email phone" },
      { path: "approvedBy", select: "fullName email" },
      { path: "rejectedBy", select: "fullName email" },
    ];

    if (type === "job" || type === "jobs") {
      [items, total] = await Promise.all([
        Job.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Job.countDocuments(queryFilter),
      ]);
      items = items.map((j) => ({ ...j, opportunityType: "Job" }));
    } else if (type === "internship" || type === "internships") {
      [items, total] = await Promise.all([
        Internship.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Internship.countDocuments(queryFilter),
      ]);
      items = items.map((i) => ({ ...i, opportunityType: "Internship" }));
    } else {
      const [jobsTotal, internshipsTotal] = await Promise.all([
        Job.countDocuments(queryFilter),
        Internship.countDocuments(queryFilter),
      ]);
      total = jobsTotal + internshipsTotal;

      const [jobs, internships] = await Promise.all([
        Job.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .limit(skip + limitNum)
          .lean(),
        Internship.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .limit(skip + limitNum)
          .lean(),
      ]);

      const combined = [
        ...jobs.map((j) => ({ ...j, opportunityType: "Job" })),
        ...internships.map((i) => ({ ...i, opportunityType: "Internship" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      items = combined.slice(skip, skip + limitNum);
    }

    // 3. REAL DYNAMIC APPLICATION COUNTS
    const oppIds = items.map((it) => it._id);
    if (oppIds.length > 0) {
      const appCounts = await Application.aggregate([
        {
          $match: {
            $or: [{ jobId: { $in: oppIds } }, { internshipId: { $in: oppIds } }],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$jobId", "$internshipId"] },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap = {};
      appCounts.forEach((ac) => {
        if (ac._id) countMap[ac._id.toString()] = ac.count;
      });

      items = items.map((it) => ({
        ...it,
        applicationsCount: countMap[it._id.toString()] || 0,
        isExpired: it.deadline ? new Date(it.deadline) < now : false,
      }));
    }

    // 4. REQUIRES ATTENTION SECTION (Real MongoDB alerts only)
    const attentionItems = [];
    if (pendingReview > 0) {
      attentionItems.push({
        id: "pending-approvals",
        type: "pending",
        severity: "warning",
        title: `${pendingReview} Opportunities Awaiting Review`,
        description: "Employer listings waiting for administrative approval to go live.",
        actionFilter: "Pending Approval",
      });
    }

    const openReportsCount = await Report.countDocuments({
      targetType: { $in: ["job", "internship", "Job", "Internship"] },
      status: "Open",
    });
    if (openReportsCount > 0) {
      attentionItems.push({
        id: "reported-opportunities",
        type: "reported",
        severity: "danger",
        title: `${openReportsCount} Reported Opportunities`,
        description: "Opportunities reported by users for misleading or inappropriate content.",
        link: "/admin/reports",
      });
    }

    const suspendedCompanies = await Company.find({ status: "suspended" }).select("_id name").lean();
    if (suspendedCompanies.length > 0) {
      const suspendedIds = suspendedCompanies.map((c) => c._id);
      const suspendedActiveOpps = await Promise.all([
        Job.countDocuments({ companyId: { $in: suspendedIds }, status: "Published" }),
        Internship.countDocuments({ companyId: { $in: suspendedIds }, status: "Published" }),
      ]);
      const suspendedActiveCount = suspendedActiveOpps[0] + suspendedActiveOpps[1];
      if (suspendedActiveCount > 0) {
        attentionItems.push({
          id: "suspended-company-listings",
          type: "suspended_company",
          severity: "danger",
          title: `${suspendedActiveCount} Active Listings from Suspended Companies`,
          description: "Companies currently suspended still have active opportunities visible to candidates.",
          actionFilter: "Published",
        });
      }
    }

    const expiredActiveCount = expiredJobs + expiredInternships;
    if (expiredActiveCount > 0) {
      attentionItems.push({
        id: "expired-active-listings",
        type: "expired",
        severity: "info",
        title: `${expiredActiveCount} Opportunities Past Deadline`,
        description: "Listings that have surpassed their application deadline.",
        actionFilter: "expired",
      });
    }

    // 5. RECENT MODERATION ACTIVITY (Real from AuditLog)
    const recentActivity = await AuditLog.find({
      module: { $in: ["Jobs", "Opportunities", "Internships"] },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        opportunities: items,
        stats,
        attention: attentionItems,
        recentActivity: (recentActivity || []).map((a) => ({
          _id: a._id,
          action: a.action,
          target: a.target,
          details: a.details,
          actorName: a.actorName,
          createdAt: a.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error("getAdminOpportunities error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/opportunities/companies-list
 * Helper for filter dropdowns
 */
exports.getOpportunityCompaniesList = async (req, res, next) => {
  try {
    const companies = await Company.find({ status: { $ne: "deleted" } })
      .select("_id name logo industry status isVerified")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      companies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/opportunities  (Super Admin)
 * Posts a job or internship on behalf of an approved employer (assisted posting).
 * The listing belongs to the employer, so it appears in their dashboard and they
 * manage the applicants; it goes live straight away as approved by this admin.
 * body: { type: "job" | "internship", employerProfileId, title, description, location, ...listing fields }
 */
exports.createOpportunityForEmployer = async (req, res, next) => {
  try {
    const { type = "job", employerProfileId } = req.body || {};
    if (!["job", "internship"].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "job" or "internship"' });
    }
    if (!mongoose.isValidObjectId(employerProfileId)) {
      return res.status(400).json({ success: false, message: "Choose an employer" });
    }
    const profile = await EmployerProfile.findById(employerProfileId).populate("userId", "isActive companyId fullName");
    if (!profile?.userId) {
      return res.status(404).json({ success: false, message: "Employer not found" });
    }
    if (profile.verificationStatus !== "approved" || profile.userId.isActive === false) {
      return res.status(400).json({ success: false, message: "Approve this employer before posting for them" });
    }

    const fields = pickListingUpdate(req.body);
    if (!hasLocation(fields.location)) {
      return res.status(400).json({ success: false, message: LOCATION_REQUIRED });
    }
    for (const required of ["title", "description"]) {
      if (typeof fields[required] !== "string" || !fields[required].trim()) {
        return res.status(400).json({ success: false, message: `${required} is required` });
      }
    }

    const invalid = checkListingKind(fields, type) || checkListingInput(fields);
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    const Model = type === "internship" ? Internship : Job;
    const now = new Date();
    const listing = await Model.create({
      ...fields,
      employerId: profile._id,
      createdBy: profile.userId._id,
      companyId: profile.userId.companyId || null,
      companyName: profile.companyName || "",
      isExternal: false,
      status: "Published",
      approvedBy: req.user._id,
      approvedAt: now,
      approvalMethod: "admin",
    });
    clearSearchCache();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.fullName,
      companyId: listing.companyId || null,
      action: "OPPORTUNITY_POSTED_ON_BEHALF",
      module: type === "internship" ? "Internships" : "Jobs",
      target: listing.title,
      details: `Posted "${listing.title}" on behalf of ${profile.companyName || "employer"}`,
      ipAddress: req.ip || "127.0.0.1",
    }).catch((err) => console.warn("Audit log failed:", err.message));

    await createNotification({
      recipientId: profile.userId._id,
      senderId: req.user._id,
      title: `We posted "${listing.title}" for you`,
      message: `E2Job posted "${listing.title}" on your behalf. It's live now, and you can manage applicants from your dashboard.`,
      actionUrl: "/employer/dashboard",
    });

    return res.status(201).json({ success: true, message: "Listing posted for the employer and published", opportunity: listing });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/opportunities/:type/:id
 * Direct edit of existing opportunity details in MongoDB
 */
exports.editOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only edit opportunities belonging to your company",
        });
      }
    }

    const {
      title,
      department,
      category,
      subCategory,
      workMode,
      location,
      city,
      state,
      country,
      description,
      requiredSkills,
      preferredSkills,
      openings,
      deadline,
      salaryRange,
      stipend,
      duration,
    } = req.body;

    const invalid = checkListingInput({ deadline, salaryRange }, opp);
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    if (title) opp.title = title.trim();
    if (department !== undefined) opp.department = department;
    if (category !== undefined) opp.category = category;
    if (subCategory !== undefined) opp.subCategory = subCategory;
    if (workMode !== undefined) opp.workMode = workMode;
    if (location) opp.location = location.trim();
    if (city !== undefined) opp.city = city;
    if (state !== undefined) opp.state = state;
    if (country !== undefined) opp.country = country;
    if (description) opp.description = description.trim();
    if (requiredSkills !== undefined) {
      opp.requiredSkills = Array.isArray(requiredSkills)
        ? requiredSkills
        : String(requiredSkills).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (preferredSkills !== undefined) {
      opp.preferredSkills = Array.isArray(preferredSkills)
        ? preferredSkills
        : String(preferredSkills).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (openings !== undefined) opp.openings = Math.max(1, Number(openings) || 1);
    if (deadline !== undefined) opp.deadline = deadline ? new Date(deadline) : null;
    if (salaryRange !== undefined && opp.salaryRange) {
      opp.salaryRange = { ...opp.salaryRange.toObject?.() || opp.salaryRange, ...salaryRange };
    }
    if (stipend !== undefined) opp.stipend = stipend;
    if (duration !== undefined) opp.duration = duration;

    await opp.save();
    clearSearchCache();

    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "EDIT_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Opportunity updated by Admin.`,
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Opportunity updated successfully",
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};
