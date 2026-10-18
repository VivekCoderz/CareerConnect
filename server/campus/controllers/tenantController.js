// GET /api/campus/tenant : the portal's name, logo and colours for the landing page (PRD R1, R2).
exports.tenant = (req, res) => res.status(200).json({ success: true, institution: req.institution.toPublic() });
