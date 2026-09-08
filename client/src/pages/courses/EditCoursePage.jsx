import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../../api/api";
import CourseForm from "../../components/courses/CourseForm";

/**
 * EditCoursePage
 * Page for Employee / Employer to edit an existing course.
 */
const EditCoursePage = ({ id: propId, onCancel, onSuccess }) => {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = propId || params.id || params.courseId;

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);

        // Try getting my courses or direct details
        const res = await api.get("/courses/my-courses");
        if (res.data?.success && res.data.courses) {
          const found = res.data.courses.find((c) => c._id === courseId);
          if (found) {
            setInitialValues(found);
            return;
          }
        }

        // Fallback detail endpoint
        const detailRes = await api.get(`/courses/${courseId}`);
        if (detailRes.data?.success && detailRes.data.course) {
          setInitialValues(detailRes.data.course);
        }
      } catch (err) {
        console.error("Fetch Course for Edit Error:", err);
        setError(err.response?.data?.message || "Failed to load course details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleUpdateCourse = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.put(`/courses/${courseId}`, formData);

      if (res.data?.success) {
        if (onSuccess) {
          onSuccess(res.data.course);
        } else {
          navigate("/employer/courses");
        }
      }
    } catch (err) {
      console.error("Update Course Error:", err);
      setError(err.response?.data?.message || "Failed to update course.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-600">Loading course data for editing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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
              Edit Course Information
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Update course title, description, domain classifications, and pricing.
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
          initialValues={initialValues}
          onSubmit={handleUpdateCourse}
          isSubmitting={isSubmitting}
          submitText="Save Changes"
          onCancel={handleCancelClick}
          isEdit={true}
        />
      </div>
    </div>
  );
};

export default EditCoursePage;
