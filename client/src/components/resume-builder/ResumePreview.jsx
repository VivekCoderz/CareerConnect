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

  switch (templateId) {
    case "executive":
      return <ExecutiveTemplate data={data} />;
    case "sidebar":
      return <SidebarTemplate data={data} />;
    case "twocolumn":
      return <TwoColumnTemplate data={data} />;
    case "compact":
      return <CompactTemplate data={data} />;
    case "elegant":
      return <ElegantTemplate data={data} />;
    case "bold":
      return <BoldTemplate data={data} />;
    case "classic":
    default:
      return <ClassicTemplate data={data} />;
  }
};

export default ResumePreview;