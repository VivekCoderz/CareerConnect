import React, { useState, useEffect, useMemo } from "react";
import organizationService from "../../services/organizationService";

// Granular Permission Definitions organized by functional module
export const PERMISSION_MODULES = [
  {
    id: "jobs",
    label: "Job Management",
    icon: "💼",
    description: "Permissions for posting, modifying, publishing and archiving jobs",
    permissions: [
      { key: "jobs.view", label: "View Jobs", desc: "Browse published and draft job listings" },
      { key: "jobs.create", label: "Create Jobs", desc: "Draft new job postings and requirements" },
      { key: "jobs.edit", label: "Edit Jobs", desc: "Modify requirements, locations, and salary bands" },
      { key: "jobs.publish", label: "Publish / Pause Jobs", desc: "Toggle live visibility on candidate portal" },
      { key: "jobs.delete", label: "Delete Jobs", desc: "Permanently remove job requisitions" },
    ],
  },
  {
    id: "candidates",
    label: "Candidate Screening & ATS",
    icon: "👥",
    description: "Permissions for candidate discovery, resume screening and pipeline progression",
    permissions: [
      { key: "candidates.view", label: "View Candidate Profiles", desc: "Inspect student resumes and skills" },
      { key: "candidates.add", label: "Add & Source Candidates", desc: "Import candidates into talent pool" },
      { key: "candidates.shortlist", label: "Move ATS Stages", desc: "Shortlist or advance applicants" },
      { key: "candidates.reject", label: "Reject Candidates", desc: "Disqualify applicants with feedback" },
      { key: "candidates.resume", label: "Download Resumes", desc: "Export original PDF resumes" },
      { key: "candidates.export", label: "Export Candidate CSV", desc: "Download full candidate datasets" },
    ],
  },
  {
    id: "interviews",
    label: "Interviews & Evaluations",
    icon: "📅",
    description: "Permissions for interview scheduling, conducting evaluations and feedback",
    permissions: [
      { key: "interviews.view", label: "View Interview Schedules", desc: "Access team recruitment calendars" },
      { key: "interviews.schedule", label: "Schedule Interviews", desc: "Book slots and send candidate invites" },
      { key: "interviews.feedback", label: "Submit Evaluation Scorecards", desc: "Rate candidates and record notes" },
      { key: "interviews.view_all_feedback", label: "View Cross-Interviewer Feedback", desc: "Inspect scores from all interviewers" },
      { key: "interviews.decision", label: "Finalize Hiring Decision", desc: "Approve or reject after final round" },
    ],
  },
  {
    id: "offers",
    label: "Offers & Compensation",
    icon: "✉️",
    description: "Permissions for drafting packages, budget approvals and formal letter dispatch",
    permissions: [
      { key: "offers.view", label: "View Job Offers", desc: "Check status of issued offer letters" },
      { key: "offers.create", label: "Draft Offer Packages", desc: "Prepare salary and benefits terms" },
      { key: "offers.compensation", label: "View/Edit Compensation", desc: "Access confidential package details" },
      { key: "offers.approve", label: "Approve Offer Packages", desc: "Authorize budget and compensation" },
      { key: "offers.send", label: "Send Official Offer", desc: "Dispatch legally binding offer letter" },
    ],
  },
  {
    id: "training",
    label: "Employee Directory & LMS",
    icon: "🎓",
    description: "Permissions for internal employee directory, upskilling and skill gaps",
    permissions: [
      { key: "employees.view", label: "View Employee Directory", desc: "Browse internal team roster" },
      { key: "employees.manage", label: "Add/Remove Employees", desc: "Manage internal staff records" },
      { key: "training.assign", label: "Assign LMS Training", desc: "Deploy course curricula to teams" },
      { key: "training.skillgaps", label: "View Skill Gap Matrix", desc: "Inspect department competency gaps" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & Telemetry",
    icon: "📊",
    description: "Permissions for recruitment velocity, training compliance and reports",
    permissions: [
      { key: "analytics.hiring", label: "View Hiring Analytics", desc: "Speed to hire, funnel conversion" },
      { key: "analytics.learning", label: "View LMS Analytics", desc: "Employee learning hours & certificates" },
      { key: "analytics.export", label: "Export Executive Reports", desc: "Download PDF/CSV executive summaries" },
    ],
  },
  {
    id: "team_settings",
    label: "Team & Security Settings",
    icon: "🛡️",
    description: "Permissions for organization settings, user invitations and RBAC policies",
    permissions: [
      { key: "team.view", label: "View Team Directory", desc: "View all member access and roles" },
      { key: "team.invite", label: "Invite Team Members", desc: "Send invitations to new staff" },
      { key: "team.roles", label: "Manage Custom Roles", desc: "Create, edit and delete custom roles" },
      { key: "team.permissions", label: "Configure Permissions", desc: "Adjust granular permission matrix" },
      { key: "audit.view", label: "View Audit Logs", desc: "Inspect security activity and history" },
      { key: "billing.manage", label: "Manage Billing & Subscriptions", desc: "Access payment methods and invoices" },
    ],
  },
];

// Predefined Role Templates for quick role creation
export const ROLE_TEMPLATES = [
  {
    name: "Blank (Custom)",
    description: "Start with an empty permission set and configure granular rights from scratch",
    permissions: [],
  },
  {
    name: "Senior Recruiter",
    description: "Full end-to-end recruitment authority for posting jobs, screening candidates, and scheduling rounds",
    permissions: [
      "jobs.view", "jobs.create", "jobs.edit", "jobs.publish", "jobs.pause",
      "candidates.view", "candidates.add", "candidates.shortlist", "candidates.reject", "candidates.resume", "candidates.export",
      "interviews.view", "interviews.schedule", "interviews.feedback",
      "offers.view", "offers.create", "analytics.hiring",
    ],
  },
  {
    name: "Engineering Hiring Manager",
    description: "Reviews technical resumes, participates in interview rounds, and makes final hire recommendations",
    permissions: [
      "jobs.view", "candidates.view", "candidates.shortlist", "candidates.resume",
      "interviews.view", "interviews.schedule", "interviews.feedback", "interviews.view_all_feedback", "interviews.decision",
      "offers.view", "offers.approve", "analytics.hiring",
    ],
  },
  {
    name: "Technical Interviewer",
    description: "Focused strictly on reviewing candidate resumes and submitting structured round scorecards",
    permissions: [
      "jobs.view", "candidates.view", "candidates.resume", "interviews.view", "interviews.feedback",
    ],
  },
  {
    name: "HR Operations Specialist",
    description: "Coordinates logistics, schedules candidate rounds, issues offers, and handles staff onboarding",
    permissions: [
      "jobs.view", "candidates.view", "candidates.resume",
      "interviews.view", "interviews.schedule",
      "offers.view", "offers.create", "offers.send",
      "employees.view", "employees.manage",
    ],
  },
  {
    name: "L&D Coordinator",
    description: "Deploys training programs, analyzes department skill competencies, and tracks certificates",
    permissions: [
      "employees.view", "training.assign", "training.skillgaps", "analytics.learning", "analytics.export",
    ],
  },
  {
    name: "Talent Analyst (Read-Only)",
    description: "Read-only access across recruitment velocity, funnel metrics and training compliance",
    permissions: [
      "jobs.view", "candidates.view", "analytics.hiring", "analytics.learning", "analytics.export",
    ],
  },
];

const TeamManagementSystem = ({ showToast }) => {
  // Tabs: 'roles', 'members', 'invitations', 'audit'
  const [activeSubTab, setActiveSubTab] = useState("roles");
  const [loading, setLoading] = useState(true);

  // Data States
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filters
  const [roleSearch, setRoleSearch] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState("All");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberDeptFilter, setMemberDeptFilter] = useState("All");
  const [memberRoleFilter, setMemberRoleFilter] = useState("All");

  const [auditModuleFilter, setAuditModuleFilter] = useState("All");
  const [auditSearch, setAuditSearch] = useState("");

  // Modals & Drawers
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [viewPermissionsRole, setViewPermissionsRole] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedMemberToEdit, setSelectedMemberToEdit] = useState(null);

  // Form States: Role Creation/Editing
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormSelectedPermissions, setRoleFormSelectedPermissions] = useState([]);
  const [roleFormSelectedTemplate, setRoleFormSelectedTemplate] = useState("Blank (Custom)");

  // Form States: Invite Member
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("Engineering");
  const [inviteAccessScope, setInviteAccessScope] = useState("All Jobs");
  const [inviteMessage, setInviteMessage] = useState("");

  // Load all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, membersRes, invitesRes, auditRes] = await Promise.all([
        organizationService.getTeamRoles().catch(() => ({ roles: [] })),
        organizationService.getTeamMembers().catch(() => ({ members: [] })),
        organizationService.getInvitations().catch(() => ({ invitations: [] })),
        organizationService.getAuditLogs().catch(() => ({ logs: [] })),
      ]);

      setRoles(rolesRes?.roles || []);
      setMembers(membersRes?.members || []);
      setInvitations(invitesRes?.invitations || []);
      setAuditLogs(auditRes?.logs || []);

      if (rolesRes?.roles?.length > 0 && !inviteRoleId) {
        setInviteRoleId(rolesRes.roles[0]._id);
      }
    } catch (err) {
      console.error("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalMembers = members.length;
    const activeRoles = roles.filter((r) => r.status === "Active").length;
    const customRolesCount = roles.filter((r) => r.type === "custom").length;
    const pendingInvites = invitations.length;
    return { totalMembers, activeRoles, customRolesCount, pendingInvites };
  }, [members, roles, invitations]);

  // Handle Template Selection in Role Modal
  const handleSelectTemplate = (templateName) => {
    setRoleFormSelectedTemplate(templateName);
    const found = ROLE_TEMPLATES.find((t) => t.name === templateName);
    if (found) {
      setRoleFormSelectedPermissions([...found.permissions]);
    }
  };

  // Toggle single permission
  const handleTogglePermission = (permKey) => {
    setRoleFormSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  // Toggle all permissions in a module
  const handleToggleModulePermissions = (moduleObj, selectAll) => {
    const moduleKeys = moduleObj.permissions.map((p) => p.key);
    if (selectAll) {
      setRoleFormSelectedPermissions((prev) => Array.from(new Set([...prev, ...moduleKeys])));
    } else {
      setRoleFormSelectedPermissions((prev) => prev.filter((k) => !moduleKeys.includes(k)));
    }
  };

  // Open Create Role Modal
  const handleOpenCreateRoleModal = (roleToDuplicate = null) => {
    if (roleToDuplicate) {
      setEditingRole(null);
      setRoleFormName(`${roleToDuplicate.name} (Copy)`);
      setRoleFormDesc(roleToDuplicate.description || "");
      setRoleFormSelectedPermissions([...roleToDuplicate.permissions]);
      setRoleFormSelectedTemplate("Blank (Custom)");
    } else {
      setEditingRole(null);
      setRoleFormName("");
      setRoleFormDesc("");
      setRoleFormSelectedPermissions([]);
      setRoleFormSelectedTemplate("Blank (Custom)");
    }
    setIsCreateRoleModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEditRoleModal = (role) => {
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description || "");
    setRoleFormSelectedPermissions([...role.permissions]);
    setRoleFormSelectedTemplate("Custom");
    setIsCreateRoleModalOpen(true);
  };

  // Save Role (Create or Update)
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      showToast?.("Please provide a role name", "error");
      return;
    }

    try {
      if (editingRole) {
        const res = await organizationService.updateRole(editingRole._id, {
          name: roleFormName.trim(),
          description: roleFormDesc,
          permissions: roleFormSelectedPermissions,
        });
        if (res?.success) {
          showToast?.(`Role '${roleFormName}' updated successfully!`, "success");
          setIsCreateRoleModalOpen(false);
          fetchData();
        }
      } else {
        const res = await organizationService.createCustomRole({
          name: roleFormName.trim(),
          description: roleFormDesc,
          baseTemplate: roleFormSelectedTemplate,
          permissions: roleFormSelectedPermissions,
        });
        if (res?.success) {
          showToast?.(`Custom role '${roleFormName}' created!`, "success");
          setIsCreateRoleModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to save role", "error");
    }
  };

  // Delete Custom Role
  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the custom role '${roleName}'?`)) return;
    try {
      const res = await organizationService.deleteRole(roleId);
      if (res?.success) {
        showToast?.(`Role '${roleName}' deleted successfully`, "success");
        fetchData();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to delete role", "error");
    }
  };

  // Send Member Invite
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteFullName.trim() || !inviteEmail.trim() || !inviteRoleId) {
      showToast?.("Please complete all required fields", "error");
      return;
    }

    try {
      const res = await organizationService.inviteTeamMember({
        fullName: inviteFullName.trim(),
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
        department: inviteDepartment,
        accessScope: inviteAccessScope,
        message: inviteMessage,
      });

      if (res?.success) {
        showToast?.(`Invitation sent to ${inviteEmail}`, "success");
        setIsInviteModalOpen(false);
        setInviteFullName("");
        setInviteEmail("");
        setInviteMessage("");
        fetchData();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to send invitation", "error");
    }
  };

  // Resend Invite
  const handleResendInvite = async (inviteId, email) => {
    try {
      const res = await organizationService.resendInvitation(inviteId);
      if (res?.success) {
        showToast?.(`Invitation resent to ${email}`, "success");
        fetchData();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to resend invite", "error");
    }
  };

  // Revoke Invite
  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm("Revoke this invitation?")) return;
    try {
      const res = await organizationService.revokeInvitation(inviteId);
      if (res?.success) {
        showToast?.("Invitation revoked", "success");
        fetchData();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to revoke invite", "error");
    }
  };

  // Open Edit Member Modal
  const handleOpenEditMember = (member) => {
    setSelectedMemberToEdit(member);
    setIsEditMemberModalOpen(true);
  };

  // Update Member Role / Scope / Status
  const handleSaveMemberChanges = async (e) => {
    e.preventDefault();
    if (!selectedMemberToEdit) return;

    try {
      const res = await organizationService.updateMember(selectedMemberToEdit._id, {
        roleId: selectedMemberToEdit.roleId?._id || selectedMemberToEdit.roleId,
        department: selectedMemberToEdit.department,
        accessScope: selectedMemberToEdit.accessScope,
        status: selectedMemberToEdit.status,
      });

      if (res?.success) {
        showToast?.("Member access configuration updated", "success");
        setIsEditMemberModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to update member", "error");
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from your organization team?`)) return;
    try {
      const res = await organizationService.removeMember(memberId);
      if (res?.success) {
        showToast?.(`${memberName} removed from team`, "success");
        fetchData();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || "Failed to remove member", "error");
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchQuery =
        r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(roleSearch.toLowerCase());
      const matchType =
        roleTypeFilter === "All"
          ? true
          : roleTypeFilter === "System"
          ? r.type === "system"
          : r.type === "custom";
      return matchQuery && matchType;
    });
  }, [roles, roleSearch, roleTypeFilter]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchQuery =
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase());
      const matchDept = memberDeptFilter === "All" ? true : m.department === memberDeptFilter;
      const matchRole =
        memberRoleFilter === "All"
          ? true
          : m.roleId?.name === memberRoleFilter || m.roleId?._id === memberRoleFilter;
      return matchQuery && matchDept && matchRole;
    });
  }, [members, memberSearch, memberDeptFilter, memberRoleFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      const matchModule = auditModuleFilter === "All" ? true : l.module === auditModuleFilter;
      const matchSearch =
        !auditSearch ||
        l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.actorName.toLowerCase().includes(auditSearch.toLowerCase());
      return matchModule && matchSearch;
    });
  }, [auditLogs, auditModuleFilter, auditSearch]);

  const totalPossiblePermissions = useMemo(() => {
    return PERMISSION_MODULES.reduce((acc, m) => acc + m.permissions.length, 0);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide uppercase border border-amber-400/30">
              Enterprise Access Control
            </span>
            <span className="text-xs text-slate-400">· Multi-Tenant RBAC</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Team & Permission Management
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Govern who can access your organization, define customized roles, enforce granular data
            scopes, and inspect real-time security audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20 transition flex items-center gap-1.5 backdrop-blur-xs"
          >
            <span>⚖️</span> Compare Roles
          </button>
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <span>+</span> Invite Team Member
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
            👥
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Team Members</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{metrics.totalMembers}</span>
              <span className="text-[11px] text-emerald-600 font-semibold">Active in Org</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
            🛡️
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configured Roles</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{metrics.activeRoles}</span>
              <span className="text-[11px] text-slate-500 font-semibold">{metrics.customRolesCount} Custom</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
            ✉️
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Invites</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{metrics.pendingInvites}</span>
              <span className="text-[11px] text-amber-600 font-semibold">Awaiting Acceptance</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            ⚡
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Status</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm font-black text-emerald-700">RBAC Enforced</span>
              <span className="text-[10px] text-slate-400">Live Audit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50/70 overflow-x-auto">
          {[
            { id: "roles", label: "Roles & Permissions", icon: "🛡️", count: roles.length },
            { id: "members", label: "Team Members", icon: "👥", count: members.length },
            { id: "invitations", label: "Invitations", icon: "✉️", count: invitations.length },
            { id: "audit", label: "Audit & Security Log", icon: "📜", count: auditLogs.length },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 text-amber-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      isActive ? "bg-amber-100 text-amber-800" : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ROLES & PERMISSIONS                                */}
        {/* ======================================================== */}
        {activeSubTab === "roles" && (
          <div className="p-6 space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Search roles or capabilities..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  <svg
                    className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <select
                  value={roleTypeFilter}
                  onChange={(e) => setRoleTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="All">All Role Types</option>
                  <option value="System">System Default Roles</option>
                  <option value="Custom">Custom Organization Roles</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateRoleModal()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>+</span> Create Custom Role
                </button>
              </div>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRoles.map((r) => {
                const isSystem = r.type === "system";
                const grantedCount = r.permissions?.length || 0;
                const percentage = Math.round((grantedCount / totalPossiblePermissions) * 100);

                return (
                  <div
                    key={r._id || r.name}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                              {r.name}
                            </h4>
                            {isSystem ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                System Role
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Custom Role
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {r.description || "No description provided."}
                          </p>
                        </div>
                      </div>

                      {/* Capabilities Progress */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Assigned Members</span>
                          <span className="font-bold text-slate-800">{r.memberCount || 0} Users</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Granted Rights</span>
                          <span className="font-bold text-amber-700">
                            {grantedCount} / {totalPossiblePermissions} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percentage > 80
                                ? "bg-emerald-500"
                                : percentage > 40
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setViewPermissionsRole(r)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>👁️</span> View Permissions
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCreateRoleModal(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-xs"
                          title="Duplicate as new custom role"
                        >
                          📋
                        </button>
                        {!isSystem && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRoleModal(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition text-xs"
                              title="Edit Role & Permissions"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(r._id, r.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition text-xs"
                              title="Delete Custom Role"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TEAM MEMBERS                                       */}
        {/* ======================================================== */}
        {activeSubTab === "members" && (
          <div className="p-6 space-y-6">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name, email..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <svg
                    className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <select
                  value={memberDeptFilter}
                  onChange={(e) => setMemberDeptFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Departments</option>
                  <option value="Executive">Executive</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product & Design">Product & Design</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                </select>

                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Roles</option>
                  {roles.map((r) => (
                    <option key={r._id || r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>+</span> Invite Member
              </button>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Team Member</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Data Access Scope</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {m.fullName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{m.fullName}</p>
                            <p className="text-[11px] text-slate-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/70 font-semibold text-[11px]">
                          {m.roleId?.name || "Member"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{m.department || "General"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            m.accessScope === "All Jobs"
                              ? "bg-purple-50 text-purple-700"
                              : m.accessScope === "Department Jobs"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.accessScope || "All Jobs"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMember(m)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                          >
                            Edit Access
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m._id, m.fullName)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition text-xs"
                            title="Remove from Organization"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: INVITATIONS                                        */}
        {/* ======================================================== */}
        {activeSubTab === "invitations" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pending & Dispatched Invitations</h3>
                <p className="text-xs text-slate-500">
                  Track pending invites and resend verification emails
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs"
              >
                + Send New Invitation
              </button>
            </div>

            {invitations.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <span className="text-3xl">✉️</span>
                <h4 className="text-sm font-bold text-slate-800 mt-2">No Pending Invitations</h4>
                <p className="text-xs text-slate-500 mt-1">
                  All invited members have activated their accounts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Invited Role</th>
                      <th className="py-3 px-4">Department & Scope</th>
                      <th className="py-3 px-4">Sent At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{inv.fullName}</p>
                          <p className="text-[11px] text-slate-400">{inv.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px]">
                            {inv.roleId?.name || "Member"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {inv.department} ·{" "}
                          <span className="text-[11px] text-slate-400">{inv.accessScope}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString() : "Recent"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                            Pending Activation
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleResendInvite(inv._id, inv.email)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition"
                            >
                              Resend Invite
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv._id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: AUDIT LOG                                          */}
        {/* ======================================================== */}
        {activeSubTab === "audit" && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security & Activity Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Immutable record of user actions, role changes, and system modifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter audit actions..."
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                />

                <select
                  value={auditModuleFilter}
                  onChange={(e) => setAuditModuleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Modules</option>
                  <option value="Roles">Roles & RBAC</option>
                  <option value="Team">Team Members</option>
                  <option value="Jobs">Jobs</option>
                  <option value="Candidates">Candidates</option>
                  <option value="Settings">Settings</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredAuditLogs.map((log) => (
                <div
                  key={log._id || log.createdAt}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-xl bg-white border border-slate-200 text-sm">
                      {log.module === "Roles"
                        ? "🛡️"
                        : log.module === "Team"
                        ? "👥"
                        : log.module === "Jobs"
                        ? "💼"
                        : "⚡"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{log.actorName}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold">
                          {log.module}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.details}</p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                    <span className="block text-[10px] font-mono text-slate-400">IP: {log.ipAddress || "127.0.0.1"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE / EDIT CUSTOM ROLE WITH PERMISSION MATRIX */}
      {/* ======================================================== */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Custom Role"}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure role metadata and select granular authorization rights
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveRole} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleFormName}
                    onChange={(e) => setRoleFormName(e.target.value)}
                    placeholder="e.g. Senior Technical Recruiter"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Role Template Baseline
                  </label>
                  <select
                    value={roleFormSelectedTemplate}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50"
                  >
                    {ROLE_TEMPLATES.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Role Description
                </label>
                <textarea
                  rows="2"
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  placeholder="Summarize this role's purpose and day-to-day responsibilities..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Granular Permission Matrix */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Granular Permission Matrix ({roleFormSelectedPermissions.length} selected)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.key));
                        setRoleFormSelectedPermissions(allKeys);
                      }}
                      className="text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setRoleFormSelectedPermissions([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {PERMISSION_MODULES.map((module) => {
                    const moduleKeys = module.permissions.map((p) => p.key);
                    const allSelected = moduleKeys.every((k) =>
                      roleFormSelectedPermissions.includes(k)
                    );

                    return (
                      <div
                        key={module.id}
                        className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{module.icon}</span>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900">{module.label}</h5>
                              <p className="text-[10px] text-slate-500">{module.description}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(module, !allSelected)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                          >
                            {allSelected ? "Deselect Module" : "Select Module"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {module.permissions.map((perm) => {
                            const isChecked = roleFormSelectedPermissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                                  isChecked
                                    ? "bg-amber-50/80 border-amber-300"
                                    : "bg-white border-slate-200/70 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.key)}
                                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{perm.label}</p>
                                  <p className="text-[10px] text-slate-500">{perm.desc}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition"
                >
                  {editingRole ? "Save Changes" : "Create Custom Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER / MODAL 2: VIEW PERMISSIONS DRAWER                */}
      {/* ======================================================== */}
      {viewPermissionsRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">{viewPermissionsRole.name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {viewPermissionsRole.type === "system" ? "System Role" : "Custom Role"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewPermissionsRole.permissions?.length || 0} active permissions configured
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewPermissionsRole(null)}
                className="text-slate-400 hover:text-white p-2 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {PERMISSION_MODULES.map((module) => (
                <div key={module.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span>{module.icon}</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {module.label}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {module.permissions.map((perm) => {
                      const hasPerm = viewPermissionsRole.permissions?.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                            hasPerm
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                              : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-60"
                          }`}
                        >
                          <span className="font-bold text-xs">{hasPerm ? "✓" : "✕"}</span>
                          <div>
                            <p className="text-xs font-bold">{perm.label}</p>
                            <p className="text-[10px]">{perm.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewPermissionsRole(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: INVITE TEAM MEMBER                              */}
      {/* ======================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
                <p className="text-xs text-slate-500">Send an invitation to join your organization</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="priya@company.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Assign Role *
                  </label>
                  <select
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Data Access Scope
                </label>
                <select
                  value={inviteAccessScope}
                  onChange={(e) => setInviteAccessScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="All Jobs">All Jobs (Full Organization Visibility)</option>
                  <option value="Department Jobs">Department Jobs Only</option>
                  <option value="Assigned Jobs">Assigned Jobs (Collaborator Only)</option>
                  <option value="Own Jobs">Own Created Jobs</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ROLE COMPARISON MATRIX MODAL                    */}
      {/* ======================================================== */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">Role Capability Comparison</h3>
                <p className="text-xs text-slate-400">
                  Side-by-side comparison matrix across all configured system and custom roles
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4 font-bold text-slate-800">Capability / Action</th>
                    {roles.map((r) => (
                      <th key={r._id || r.name} className="py-3 px-4 font-bold text-slate-900 text-center">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { key: "jobs.view", label: "View Job Postings" },
                    { key: "jobs.create", label: "Create & Publish Jobs" },
                    { key: "candidates.view", label: "Inspect Candidate Resumes" },
                    { key: "candidates.shortlist", label: "Shortlist / Reject Applicants" },
                    { key: "interviews.schedule", label: "Schedule Interviews" },
                    { key: "interviews.feedback", label: "Submit Scorecards" },
                    { key: "offers.create", label: "Draft Offer Letters" },
                    { key: "offers.approve", label: "Approve Offer Packages" },
                    { key: "training.assign", label: "Assign LMS Courses" },
                    { key: "team.roles", label: "Manage Roles & RBAC" },
                    { key: "billing.manage", label: "Manage Billing & Subscriptions" },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-700">{row.label}</td>
                      {roles.map((r) => {
                        const hasIt = r.permissions?.includes(row.key);
                        return (
                          <td key={r._id || r.name} className="py-3 px-4 text-center">
                            {hasIt ? (
                              <span className="inline-block w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] leading-5">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-block w-5 h-5 rounded-full bg-slate-100 text-slate-300 font-bold text-[11px] leading-5">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: EDIT MEMBER ACCESS SCOPE & ROLE                 */}
      {/* ======================================================== */}
      {isEditMemberModalOpen && selectedMemberToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Member: {selectedMemberToEdit.fullName}
                </h3>
                <p className="text-xs text-slate-500">{selectedMemberToEdit.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMemberChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Role
                </label>
                <select
                  value={selectedMemberToEdit.roleId?._id || selectedMemberToEdit.roleId}
                  onChange={(e) =>
                    setSelectedMemberToEdit({ ...selectedMemberToEdit, roleId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <select
                  value={selectedMemberToEdit.department}
                  onChange={(e) =>
                    setSelectedMemberToEdit({ ...selectedMemberToEdit, department: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="Executive">Executive</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product & Design">Product & Design</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Data Access Scope
                </label>
                <select
                  value={selectedMemberToEdit.accessScope}
                  onChange={(e) =>
                    setSelectedMemberToEdit({
                      ...selectedMemberToEdit,
                      accessScope: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="All Jobs">All Jobs (Full Organization Visibility)</option>
                  <option value="Department Jobs">Department Jobs Only</option>
                  <option value="Assigned Jobs">Assigned Jobs (Collaborator Only)</option>
                  <option value="Own Jobs">Own Created Jobs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Account Status
                </label>
                <select
                  value={selectedMemberToEdit.status}
                  onChange={(e) =>
                    setSelectedMemberToEdit({ ...selectedMemberToEdit, status: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagementSystem;
