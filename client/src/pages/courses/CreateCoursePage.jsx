import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../../api/api";
import CourseForm from "../../components/courses/CourseForm";

/**
 * CreateCoursePage
 * Page for Employee / Employer to create a new learning course.
 */
const CreateCoursePage = ({ onCancel, onSuccess }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateCourse = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.post("/courses", formData);

      if (res.data?.success) {
        if (onSuccess) {
          onSuccess(res.data.course);
        } else {
          navigate("/employer/courses");
        }
      }
    } catch (err) {
      console.error("Create Course Page Error:", err);
      setError(err.response?.data?.message || "Failed to create course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/employer/courses");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={handleCancelClick}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1e3a8a] transition-colors mb-2"
            >
              <ArrowLeft size={16} />
              <span>Back to Courses</span>
            </button>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create New Course
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish structured learning modules, video lectures, and PDF resources for Geeta University learners.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <CourseForm
          onSubmit={handleCreateCourse}
          isSubmitting={isSubmitting}
          submitText="Create & Save Course"
          onCancel={handleCancelClick}
        />
      </div>
    </div>
  );
};

export default CreateCoursePage;
