import React from "react";
import ClassicTemplate from "./templates/ClassicTemplate";
import ExecutiveTemplate from "./templates/ExecutiveTemplate";
import SidebarTemplate from "./templates/SidebarTemplate";
import TwoColumnTemplate from "./templates/TwoColumnTemplate";
import CompactTemplate from "./templates/CompactTemplate";
import ElegantTemplate from "./templates/ElegantTemplate";
import BoldTemplate from "./templates/BoldTemplate";
import ATSSafeResumeRenderer from "./templates/ATSSafeResumeRenderer";

const ResumePreview = ({ data, templateId }) => {
  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400">No resume generated yet.</div>
    );
  }

  const tid = (templateId || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  switch (tid) {
    case "classic":
    case "professional":
    case "traditional":
    case "atssafe":
    case "ats":
      return <ATSSafeResumeRenderer data={data} templateId="classic" />;
    case "modern":
    case "bold":
    case "boldheader":
      return <ATSSafeResumeRenderer data={data} templateId="modern" />;
    case "minimal":
    case "elegant":
      return <ATSSafeResumeRenderer data={data} templateId="minimal" />;
    case "executive":
    case "corporate":
      return <ExecutiveTemplate data={data} />;
    case "sidebar":
    case "leftsidebar":
      return <SidebarTemplate data={data} />;
    case "twocolumn":
    case "2column":
      return <TwoColumnTemplate data={data} />;
    case "compact":
    case "compacttech":
    case "tech":
    case "developer":
      return <CompactTemplate data={data} />;
    default:
      return <ATSSafeResumeRenderer data={data} templateId={tid || "classic"} />;
  }
};

export default ResumePreview;