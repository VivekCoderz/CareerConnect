// Admin controllers. The handlers live in controllers/admin/, one file per area; this file
// keeps the import path that routes/adminRoutes.js uses.
module.exports = {
  ...require("./admin/auth"),
  ...require("./admin/dashboard"),
  ...require("./admin/companies"),
  ...require("./admin/organizationRequests"),
  ...require("./admin/users"),
  ...require("./admin/listings"),
  ...require("./admin/listingModeration"),
  ...require("./admin/applications"),
  ...require("./admin/reports"),
  ...require("./admin/reportActions"),
  ...require("./admin/settings"),
};
