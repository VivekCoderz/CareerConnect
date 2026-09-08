import React, { useState, useEffect } from "react";
import {
  Plus,
  Video,
  FileText,
  BookOpen,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import api from "../../api/api";
import ContentCard from "./ContentCard";

/**
 * CourseContentManager
 * Full LMS course content management component.
 * Allows employees to create, upload, update, and organize lectures, PDFs, and notes.
 */
const CourseContentManager = ({ courseId, onBack, courseTitle }) => {
  const [contentList, setContentList] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State for Add / Edit Content
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    type: "video",
    title: "",
    description: "",
    section: "General",
    order: 1,
    duration: 10,
    content: "",
    url: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const fetchContent = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/course-content/${courseId}`);
      if (res.data?.success) {
        setContentList(res.data.content || []);
        if (res.data.course) {
          setCourseInfo(res.data.course);
        }
      }
    } catch (err) {
      console.error("Fetch Course Content Error:", err);
      setError(err.response?.data?.message || "Failed to load course content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [courseId]);

  const handleOpenAddForm = () => {
    setEditingContent(null);
    setFormData({
      type: "video",
      title: "",
      description: "",
      section: "General",
      order: contentList.length + 1,
      duration: 10,
      content: "",
      url: "",
    });
    setSelectedFile(null);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingContent(item);
    setFormData({
      type: item.type || "video",
      title: item.title || "",
      description: item.description || "",
      section: item.section || "General",
      order: item.order || 1,
      duration: item.duration || 0,
      content: item.content || "",
      url: item.url || "",
    });
    setSelectedFile(null);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Content title is required.");
      return;
    }

    if (formData.type === "notes" && !formData.content.trim()) {
      setFormError("Notes content text is required.");
      return;
    }

    if (
      !editingContent &&
      (formData.type === "video" || formData.type === "pdf") &&
      !selectedFile &&
      !formData.url
    ) {
      setFormError(`Please select a ${formData.type.toUpperCase()} file or enter a direct URL.`);
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingContent) {
        // Update Content via PUT
        const payload = {
          type: formData.type,
          title: formData.title,
          description: formData.description,
          section: formData.section,
          order: Number(formData.order),
          duration: Number(formData.duration || 0),
          content: formData.content,
          url: formData.url,
        };

        const res = await api.put(`/course-content/${editingContent._id}`, payload);
        if (res.data?.success) {
          setContentList((prev) =>
            prev.map((c) => (c._id === editingContent._id ? res.data.courseContent : c))
          );
          setIsFormOpen(false);
        }
      } else {
        // Create Content via POST
        // If file present, use FormData
        if (selectedFile) {
          const bodyFormData = new FormData();
          bodyFormData.append("file", selectedFile);
          bodyFormData.append("type", formData.type);
          bodyFormData.append("title", formData.title);
          bodyFormData.append("description", formData.description);
          bodyFormData.append("section", formData.section);
          bodyFormData.append("order", formData.order);
          bodyFormData.append("duration", formData.duration);
          bodyFormData.append("content", formData.content);

          const res = await api.post(`/course-content/${courseId}`, bodyFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (res.data?.success) {
            setContentList((prev) => [...prev, res.data.courseContent]);
            setIsFormOpen(false);
          }
        } else {
          // JSON payload
          const res = await api.post(`/course-content/${courseId}`, formData);
          if (res.data?.success) {
            setContentList((prev) => [...prev, res.data.courseContent]);
            setIsFormOpen(false);
          }
        }
      }
    } catch (err) {
      console.error("Save Content Error:", err);
      setFormError(err.response?.data?.message || "Failed to save course content.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm("Are you sure you want to delete this lecture/resource?")) return;
    try {
      const res = await api.delete(`/course-content/${contentId}`);
      if (res.data?.success) {
        setContentList((prev) => prev.filter((item) => item._id !== contentId));
      }
    } catch (err) {
      console.error("Delete Content Error:", err);
      alert(err.response?.data?.message || "Failed to delete content");
    }
  };

  // Content Counts
  const counts = {
    total: contentList.length,
    videos: contentList.filter((c) => c.type === "video").length,
    pdfs: contentList.filter((c) => c.type === "pdf").length,
    notes: contentList.filter((c) => c.type === "notes").length,
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
        <div className="w-8 h-8 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading course curriculum & content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Back to Courses"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-900">
              {courseInfo?.title || courseTitle || "Course Content Manager"}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Upload video lectures, PDF resources, and reading notes for your students.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddForm}
          className="px-4 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>+ Add Content</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Curriculum Items</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-blue-700">Video Lectures</p>
          <p className="text-2xl font-bold text-[#1e3a8a] mt-1">{counts.videos}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-rose-700">PDF Notes / Resources</p>
          <p className="text-2xl font-bold text-rose-800 mt-1">{counts.pdfs}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-amber-800">Text Lessons</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{counts.notes}</p>
        </div>
      </div>

      {/* Add / Edit Form Modal or Drawer */}
      {isFormOpen && (
        <div className="p-6 bg-white border-2 border-[#1e3a8a]/30 rounded-2xl shadow-md space-y-4 animate-fade-in relative">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
          >
            <X size={18} />
          </button>

          <h3 className="text-base font-bold text-slate-900 border-b pb-2">
            {editingContent ? "Edit Content Item" : "Add New Content Item"}
          </h3>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} /> {formError}
            </div>
          )}

          <form onSubmit={handleSaveContent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Content Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a]"
                >
                  <option value="video">🎥 Video Lecture</option>
                  <option value="pdf">📄 PDF Document</option>
                  <option value="notes">📝 Text Notes / Article</option>
                </select>
              </div>

              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lesson Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Introduction to React State and Props"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description / Key Takeaways
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Brief summary of this lecture..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Section / Chapter Name
                </label>
                <input
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleFormChange}
                  placeholder="General"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lecture Number / Order
                </label>
                <input
                  type="number"
                  name="order"
                  min="1"
                  value={formData.order}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  min="0"
                  value={formData.duration}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                />
              </div>
            </div>

            {/* File Upload / External Link for Video/PDF */}
            {(formData.type === "video" || formData.type === "pdf") && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {formData.type === "video" ? "Upload Video File or Provide URL" : "Upload PDF File or Provide URL"}
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept={formData.type === "video" ? "video/*" : "application/pdf"}
                    onChange={handleFileChange}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1e3a8a] file:text-white hover:file:bg-[#1e40af]"
                  />

                  <span className="text-xs text-slate-400 self-center font-bold">OR</span>

                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleFormChange}
                    placeholder="https://..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] bg-white"
                  />
                </div>
              </div>
            )}

            {/* Textarea for Notes */}
            {formData.type === "notes" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Text Notes Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="content"
                  rows={5}
                  value={formData.content}
                  onChange={handleFormChange}
                  placeholder="Type lecture notes, code snippets, or reference material..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{editingContent ? "Save Changes" : "Upload Content"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Item List */}
      {contentList.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <BookOpen size={36} className="mx-auto text-slate-300" />
          <h4 className="text-base font-bold text-slate-800">No content items added yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Build your course curriculum by adding video lectures, PDF notes, or text readings.
          </p>
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs inline-flex items-center gap-2"
          >
            <Plus size={16} />
            <span>+ Create First Lesson</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contentList.map((item, idx) => (
            <ContentCard
              key={item._id}
              item={item}
              index={idx}
              isEmployee={true}
              onEdit={handleOpenEditForm}
              onDelete={handleDeleteContent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseContentManager;
