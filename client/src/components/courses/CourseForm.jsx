import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Image as ImageIcon,
  Clock,
  Layers,
  Sparkles,
  Tag,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/**
 * CourseForm
 * Reusable form component for CreateCoursePage and EditCoursePage.
 */
const CourseForm = ({
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  submitText = "Create Course",
  onCancel,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thumbnail: "",
    domain: "Computer Science & IT",
    category: "Web Development",
    level: "beginner",
    duration: 8,
    durationUnit: "hours",
    skills: "",
    price: 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData({
        title: initialValues.title || "",
        description: initialValues.description || "",
        thumbnail: initialValues.thumbnail || "",
        domain: initialValues.domain || "Computer Science & IT",
        category: initialValues.category || "Web Development",
        level: initialValues.level || "beginner",
        duration: initialValues.duration || 8,
        durationUnit: initialValues.durationUnit || "hours",
        skills: Array.isArray(initialValues.skills)
          ? initialValues.skills.join(", ")
          : initialValues.skills || "",
        price: initialValues.price ?? 0,
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = "Course title must be at least 3 characters.";
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      newErrors.description = "Course description must be at least 10 characters.";
    }
    if (!formData.domain.trim()) {
      newErrors.domain = "Domain is required.";
    }
    if (!formData.category.trim()) {
      newErrors.category = "Category is required.";
    }
    if (!formData.duration || Number(formData.duration) < 1) {
      newErrors.duration = "Duration must be at least 1.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Process skills into array if string
    const processedSkills = typeof formData.skills === "string"
      ? formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : formData.skills;

    const payload = {
      ...formData,
      duration: Number(formData.duration),
      price: Number(formData.price || 0),
      skills: processedSkills,
    };

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  const domainOptions = [
    "Computer Science & IT",
    "Data Science & AI",
    "Management & Business",
    "Design & Media",
    "Engineering",
    "Digital Marketing",
    "Finance & Accounting",
    "Healthcare & Sciences",
  ];

  const categoryOptions = [
    "Web Development",
    "Mobile App Development",
    "Backend & APIs",
    "Machine Learning & Data Analytics",
    "Cloud Computing & DevOps",
    "UI/UX Design",
    "Cyber Security",
    "Software Testing",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Details Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <BookOpen className="text-[#1e3a8a]" size={20} />
          <h3 className="text-base font-bold text-slate-900">Basic Course Details</h3>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Course Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Full-Stack Web Development with React & Node.js"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              errors.title
                ? "border-rose-300 focus:ring-2 focus:ring-rose-200"
                : "border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
            } outline-none text-slate-800`}
          />
          {errors.title && (
            <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Course Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide a comprehensive summary of what students will learn, course objectives, and outcomes..."
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              errors.description
                ? "border-rose-300 focus:ring-2 focus:ring-rose-200"
                : "border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
            } outline-none text-slate-800`}
          />
          {errors.description && (
            <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.description}
            </p>
          )}
        </div>

        {/* Thumbnail URL & Live Preview */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Course Thumbnail Image URL
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full relative">
              <ImageIcon className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="url"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800"
              />
            </div>
            {formData.thumbnail && (
              <div className="w-16 h-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                <img
                  src={formData.thumbnail}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Provide a direct image URL for the course card header (optional).
          </p>
        </div>
      </div>

      {/* Domain, Category & Metadata Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Layers className="text-[#1e3a8a]" size={20} />
          <h3 className="text-base font-bold text-slate-900">Classification & Meta</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Domain */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Domain / Industry <span className="text-rose-500">*</span>
            </label>
            <select
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800 bg-white"
            >
              {domainOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Category <span className="text-rose-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800 bg-white"
            >
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Difficulty Level
            </label>
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800 bg-white"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Duration & Unit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Duration <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                name="duration"
                min="1"
                value={formData.duration}
                onChange={handleChange}
                className="w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800"
              />
              <select
                name="durationUnit"
                value={formData.durationUnit}
                onChange={handleChange}
                className="w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800 bg-white"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skills Tagged */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Skills Covered (Comma separated)
          </label>
          <div className="relative">
            <Tag className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g. React, Redux Toolkit, Tailwind CSS, JavaScript"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Course Price (₹) — 0 for Free
          </label>
          <input
            type="number"
            name="price"
            min="0"
            value={formData.price}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>{submitText}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CourseForm;
