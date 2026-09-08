import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import CourseContentManager from "../../components/courses/CourseContentManager";

/**
 * CourseContentPage
 * Dedicated Page for managing course contents, video lectures, and PDF resources.
 */
const CourseContentPage = ({ id: propId, onBack }) => {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = propId || params.id || params.courseId;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/employer/courses");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <CourseContentManager courseId={courseId} onBack={handleBack} />
      </div>
    </div>
  );
};

export default CourseContentPage;
