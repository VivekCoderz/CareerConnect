import React from "react";
import ClassicTemplate from "./templates/ClassicTemplate";
import ExecutiveTemplate from "./templates/ExecutiveTemplate";
import SidebarTemplate from "./templates/SidebarTemplate";
import TwoColumnTemplate from "./templates/TwoColumnTemplate";
import CompactTemplate from "./templates/CompactTemplate";
import ElegantTemplate from "./templates/ElegantTemplate";
import BoldTemplate from "./templates/BoldTemplate";

const ResumePreview = ({ data, templateId }) => {
  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400">No resume generated yet.</div>
    );
  }

  const tid = (templateId || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  switch (tid) {
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
    case "elegant":
    case "minimal":
      return <ElegantTemplate data={data} />;
    case "bold":
    case "boldheader":
    case "modern":
      return <BoldTemplate data={data} />;
    case "classic":
    case "professional":
    case "traditional":
    default:
      return <ClassicTemplate data={data} />;
  }
};

export default ResumePreview;