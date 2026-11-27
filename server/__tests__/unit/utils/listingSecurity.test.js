// Q02: the moderation rules behind S03 (no self-publishing) and S04 (autoApproveJobs only for
// verified employers), checked directly. The routes also block unverified employers before
// these run, so the integration tests alone would not notice if these rules were reverted.
const mongoose = require("mongoose");
const {
  resolveNewListingModeration,
  checkEmployerStatusChange,
} = require("../../../utils/listingSecurity");

const employer = { _id: new mongoose.Types.ObjectId(), role: "employer", userType: "employer" };
const superAdmin = { _id: new mongoose.Types.ObjectId(), role: "SUPER_ADMIN" };
const companyAdmin = { _id: new mongoose.Types.ObjectId(), role: "admin", companyId: new mongoose.Types.ObjectId() };

describe("resolveNewListingModeration", () => {
  it.each(["Published", "Pending Approval", "Paused", "Closed", "Rejected", undefined, "anything"])(
    "puts an employer's new listing sent as %p into Pending Approval",
    (status) => {
      expect(resolveNewListingModeration(employer, status)).toMatchObject({
        status: "Pending Approval", approvedBy: null, approvedAt: null, approvalMethod: null,
      });
    }
  );

  it("keeps an employer's explicit draft as Draft", () => {
    expect(resolveNewListingModeration(employer, "Draft").status).toBe("Draft");
  });

  it("never auto-publishes for an employer who is not verified (S04)", () => {
    for (const employerApproved of [false, undefined]) {
      const result = resolveNewListingModeration(employer, "Published", { autoApproveJobs: true, employerApproved });
      expect(result.status).toBe("Pending Approval");
      expect(result.approvalMethod).toBeNull();
    }
  });

  it("auto-publishes only when autoApproveJobs is on and the employer is verified (S04)", () => {
    expect(resolveNewListingModeration(employer, "Published", { autoApproveJobs: false, employerApproved: true }).status)
      .toBe("Pending Approval");
    expect(resolveNewListingModeration(employer, "Published", { autoApproveJobs: true, employerApproved: true }))
      .toMatchObject({ status: "Published", approvalMethod: "auto", approvedBy: null });
  });

  it("lets only a platform admin publish directly", () => {
    expect(resolveNewListingModeration(superAdmin, "Published"))
      .toMatchObject({ status: "Published", approvalMethod: "admin", approvedBy: superAdmin._id });
    expect(resolveNewListingModeration(companyAdmin, "Published").status).toBe("Pending Approval");
  });
});

describe("checkEmployerStatusChange", () => {
  const future = new Date(Date.now() + 7 * 86400000);
  const listing = (fields) => ({ deadline: future, approvedAt: null, rejectedAt: null, ...fields });

  it("refuses statuses outside the employer list", () => {
    expect(checkEmployerStatusChange(listing({ status: "Draft" }), "Rejected")).toMatchObject({ code: 400 });
  });

  it.each(["Draft", "Pending Approval", "Rejected", "Paused", "Closed"])(
    "refuses to publish a never-approved %s listing",
    (status) => {
      expect(checkEmployerStatusChange(listing({ status }), "Published")).toMatchObject({ code: 403 });
    }
  );

  it("refuses to re-publish a paused listing whose last decision was a rejection", () => {
    const rejected = listing({ status: "Paused", approvedAt: new Date(), rejectedAt: new Date() });
    expect(checkEmployerStatusChange(rejected, "Published")).toMatchObject({ code: 403 });
  });

  it("lets an approved paused or closed listing be re-opened", () => {
    for (const status of ["Paused", "Closed"]) {
      expect(checkEmployerStatusChange(listing({ status, approvedAt: new Date() }), "Published")).toBeNull();
    }
  });
});
