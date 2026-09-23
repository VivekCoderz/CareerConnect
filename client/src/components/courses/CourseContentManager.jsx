import JourneyLoader from "../common/JourneyLoader";
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
  const [previewObjectUrl, setPreviewObjectUrl] = useState(null); // local blob preview
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState(null); // final URL after upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");

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
    setPreviewObjectUrl(null);
    setUploadedPreviewUrl(null);
    setUploadProgress(0);
    setUploadStage("");
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
    setPreviewObjectUrl(item.url || null);
    setUploadedPreviewUrl(item.url || null);
    setUploadProgress(0);
    setUploadStage("");
    setFormError("");
    setIsFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadedPreviewUrl(null);
      // Create local blob URL for instant preview before upload
      const localUrl = URL.createObjectURL(file);
      setPreviewObjectUrl(localUrl);
    }
  };

  // Resilient Chunked Browser-to-Cloudinary Direct Upload (Handles 200MB+ PDF & 500MB+ Video)
  const uploadToCloudinaryDirect = async (file, type, onProgress) => {
    // Route large binary assets (PDFs & Videos) through Cloudinary's high-capacity pipeline to bypass the 10MB raw cap
    const targetResourceType = "video";

    // 1. Fetch upload signature from backend
    const sigRes = await api.get("/course-content/upload-signature", {
      params: { courseId, resourceType: targetResourceType },
    });

    if (!sigRes.data?.success) {
      throw new Error(sigRes.data?.message || "Could not generate upload authorization");
    }

    const { signature, timestamp, apiKey, cloudName, folder } = sigRes.data;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${targetResourceType}/upload`;

    // Multi-Stream Parallel Upload (3 simultaneous connections for 3x bandwidth throughput)
    const CHUNK_SIZE = 12 * 1024 * 1024; // 12 MB chunk
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const uniqueUploadId = `cc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    // Track loaded bytes per chunk index for aggregate progress
    const chunkLoaded = new Array(totalChunks).fill(0);

    const updateAggregateProgress = () => {
      const totalLoaded = chunkLoaded.reduce((sum, val) => sum + val, 0);
      const percent = Math.min(99, Math.round((totalLoaded * 100) / totalSize));
      const elapsedSeconds = Math.max(0.5, (Date.now() - startTime) / 1000);
      const speedMBs = (totalLoaded / (elapsedSeconds * 1024 * 1024)).toFixed(1);
      const remainingBytes = Math.max(0, totalSize - totalLoaded);
      const remainingSeconds = Math.round(
        remainingBytes / (totalLoaded / elapsedSeconds || 1024 * 1024)
      );
      const etaText =
        remainingSeconds > 60
          ? `~${Math.round(remainingSeconds / 60)}m left`
          : `~${remainingSeconds}s left`;

      setUploadStage(
        `High-Speed Multi-Stream (${percent}% • ${speedMBs} MB/s • ${etaText})`
      );
      if (onProgress) onProgress(percent);
    };

    // Single direct stream if small (< 15MB)
    if (totalChunks <= 1) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded * 100) / event.total);
            const stats = getStats(event.loaded);
            setUploadStage(`Uploading ${type === "video" ? "video" : "document"} (${percent}% • ${stats})`);
            onProgress(percent);
          }
        });

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resData = JSON.parse(xhr.responseText);
                resolve(resData);
              } catch (err) {
                reject(new Error("Invalid response from cloud storage"));
              }
            } else {
              let errMsg = "Cloud upload failed";
              try {
                const errData = JSON.parse(xhr.responseText);
                if (errData?.error?.message) {
                  errMsg = errData.error.message;
                  if (errMsg.includes("File size too large") || errMsg.includes("Maximum is")) {
                    errMsg += " — Tip: You can also paste an external URL (Google Drive, YouTube, CDN) in the link field for instant 0-second access.";
                  }
                }
              } catch (e) {}
              reject(new Error(errMsg));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error during file upload"));

        const bodyData = new FormData();
        bodyData.append("file", file);
        bodyData.append("api_key", apiKey);
        bodyData.append("timestamp", timestamp);
        bodyData.append("signature", signature);
        bodyData.append("folder", folder);

        xhr.open("POST", uploadUrl, true);
        xhr.send(bodyData);
      });
    }

    // Parallel multi-stream chunk pipeline (concurrency = 3)
    let finalResult = null;
    const CONCURRENCY = 3;

    // Single chunk upload handler with 1 retry
    const uploadSingleChunk = (index, attempt = 1) => {
      const start = index * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice(start, end);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            chunkLoaded[index] = event.loaded;
            updateAggregateProgress();
          }
        });

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              chunkLoaded[index] = end - start;
              updateAggregateProgress();
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (e) {
                resolve({});
              }
            } else {
              if (attempt < 2) {
                // Retry once on failure
                uploadSingleChunk(index, attempt + 1).then(resolve).catch(reject);
              } else {
                let errMsg = `Upload error at chunk ${index + 1}`;
                try {
                  const errData = JSON.parse(xhr.responseText);
                  if (errData?.error?.message) {
                    errMsg = errData.error.message;
                    if (errMsg.includes("File size too large") || errMsg.includes("Maximum is")) {
                      errMsg += " — Tip: You can also paste an external link in the URL field.";
                    }
                  }
                } catch (e) {}
                reject(new Error(errMsg));
              }
            }
          }
        };

        xhr.onerror = () => {
          if (attempt < 2) {
            uploadSingleChunk(index, attempt + 1).then(resolve).catch(reject);
          } else {
            reject(new Error("Network connection unstable. Please try again."));
          }
        };

        const chunkFormData = new FormData();
        chunkFormData.append("file", chunk);
        chunkFormData.append("api_key", apiKey);
        chunkFormData.append("timestamp", timestamp);
        chunkFormData.append("signature", signature);
        chunkFormData.append("folder", folder);

        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("X-Unique-Upload-Id", uniqueUploadId);
        xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${totalSize}`);
        xhr.send(chunkFormData);
      });
    };

    // Execute in concurrent worker batches of 3
    for (let i = 0; i < totalChunks; i += CONCURRENCY) {
      const batchIndices = [];
      for (let j = i; j < Math.min(i + CONCURRENCY, totalChunks); j++) {
        batchIndices.push(j);
      }

      const batchResults = await Promise.all(
        batchIndices.map((idx) => uploadSingleChunk(idx))
      );

      for (const res of batchResults) {
        if (res?.secure_url) {
          finalResult = res;
        }
      }
    }

    if (onProgress) {
      onProgress(100);
      setUploadStage("Finalizing lesson on cloud storage...");
    }

    if (!finalResult?.secure_url) {
      throw new Error("Upload completed but no secure URL was returned from cloud storage.");
    }

    return finalResult;
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
      setUploadProgress(0);

      const startTime = Date.now();

      if (editingContent) {
        // If editing and selected new file, stream via FormData
        if (selectedFile && (formData.type === "video" || formData.type === "pdf")) {
          setUploadStage("Fast uploading updated file...");
          const bodyFormData = new FormData();
          bodyFormData.append("file", selectedFile);
          bodyFormData.append("type", formData.type);
          bodyFormData.append("title", formData.title);
          bodyFormData.append("description", formData.description);
          bodyFormData.append("section", formData.section);
          bodyFormData.append("order", Number(formData.order));
          bodyFormData.append("duration", Number(formData.duration || 0));
          bodyFormData.append("content", formData.content);

          const res = await api.put(`/course-content/${editingContent._id}`, bodyFormData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 600000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const elapsedSeconds = Math.max(0.2, (Date.now() - startTime) / 1000);
                const speedMBs = (progressEvent.loaded / (elapsedSeconds * 1024 * 1024)).toFixed(1);
                setUploadProgress(percent);
                setUploadStage(`Instant Fast Ingestion (${percent}% • ${speedMBs} MB/s)`);
              }
            },
          });

          if (res.data?.success) {
            setContentList((prev) =>
              prev.map((c) => (c._id === editingContent._id ? res.data.courseContent : c))
            );
            setIsFormOpen(false);
            setSelectedFile(null);
            setPreviewObjectUrl(null);
          }
        } else {
          // JSON payload
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
            setSelectedFile(null);
            setPreviewObjectUrl(null);
          }
        }
      } else {
        // Create Content via POST
        if (selectedFile && (formData.type === "video" || formData.type === "pdf")) {
          setUploadStage("Instant Fast Ingestion (0%)...");
          const bodyFormData = new FormData();
          bodyFormData.append("file", selectedFile);
          bodyFormData.append("type", formData.type);
          bodyFormData.append("title", formData.title);
          bodyFormData.append("description", formData.description);
          bodyFormData.append("section", formData.section);
          bodyFormData.append("order", Number(formData.order));
          bodyFormData.append("duration", Number(formData.duration || 0));
          bodyFormData.append("content", formData.content);

          const res = await api.post(`/course-content/${courseId}`, bodyFormData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 600000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const elapsedSeconds = Math.max(0.2, (Date.now() - startTime) / 1000);
                const speedMBs = (progressEvent.loaded / (elapsedSeconds * 1024 * 1024)).toFixed(1);
                setUploadProgress(percent);
                setUploadStage(
                  percent >= 100
                    ? "Saving lesson to curriculum..."
                    : `Instant Fast Ingestion (${percent}% • ${speedMBs} MB/s)`
                );
              }
            },
          });

          if (res.data?.success) {
            const saved = res.data.courseContent;
            setContentList((prev) => [...prev, saved]);
            setUploadedPreviewUrl(saved.url || previewObjectUrl || null);
            setIsFormOpen(false);
            setSelectedFile(null);
            setPreviewObjectUrl(null);
            setFormData((prev) => ({
              ...prev,
              title: "",
              description: "",
              url: "",
              content: "",
              duration: "",
              order: (prev.order || 1) + 1,
            }));
          }
        } else {
          // JSON payload (Notes or Direct URL)
          const res = await api.post(`/course-content/${courseId}`, formData);
          if (res.data?.success) {
            const saved = res.data.courseContent;
            setContentList((prev) => [...prev, saved]);
            setUploadedPreviewUrl(saved.url || null);
            setIsFormOpen(false);
            setSelectedFile(null);
            setPreviewObjectUrl(null);
            setFormData((prev) => ({
              ...prev,
              title: "",
              description: "",
              url: "",
              content: "",
              duration: "",
              order: (prev.order || 1) + 1,
            }));
          }
        }
      }
    } catch (err) {
      console.error("Save Content Error:", err);
      setFormError(err.message || err.response?.data?.message || "Failed to save course content.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadStage("");
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
        <JourneyLoader variant="learning" size="sm" className="mx-auto mb-3" />
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

      {/* Add / Edit Form — Two-Column Layout: Form Left | Preview Right */}
      {isFormOpen && (
        <div className="bg-white border-2 border-[#1e3a8a]/25 rounded-2xl shadow-lg animate-fade-in relative overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#1e3a8a]/5 to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1e3a8a]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingContent ? "Edit Content Item" : "Add New Content Item"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={17} />
            </button>
          </div>

          {/* Two-Column Body */}
          <div className="flex flex-col lg:flex-row">

            {/* ── LEFT: Form ── */}
            <div className="flex-1 p-6 space-y-4 lg:border-r border-slate-100">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <form onSubmit={handleSaveContent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Content Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e) => {
                        handleFormChange(e);
                        setPreviewObjectUrl(null);
                        setUploadedPreviewUrl(null);
                        setSelectedFile(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="video">🎥 Video Lecture</option>
                      <option value="pdf">📄 PDF Document</option>
                      <option value="notes">📝 Text Notes / Article</option>
                    </select>
                  </div>

                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Lesson Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      placeholder="e.g. Introduction to React State and Props"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Description / Key Takeaways
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Brief summary of this lecture..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Section */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Section / Chapter Name
                    </label>
                    <input
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleFormChange}
                      placeholder="General"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Order */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Lecture Number / Order
                    </label>
                    <input
                      type="number"
                      name="order"
                      min="1"
                      value={formData.order}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      name="duration"
                      min="0"
                      value={formData.duration}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* File Upload / External Link for Video/PDF */}
                {(formData.type === "video" || formData.type === "pdf") && (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {formData.type === "video" ? "📹 Upload Video File or Provide URL" : "📄 Upload PDF File or Provide URL"}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl transition-all shadow-xs">
                        <Upload size={13} />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept={formData.type === "video" ? "video/*" : "application/pdf"}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {selectedFile && (
                        <span className="self-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate max-w-[200px]">
                          ✓ {selectedFile.name}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 self-center font-bold">OR</span>
                      <input
                        type="url"
                        name="url"
                        value={formData.url}
                        onChange={(e) => {
                          handleFormChange(e);
                          setPreviewObjectUrl(e.target.value || null);
                          setUploadedPreviewUrl(null);
                        }}
                        placeholder="https://..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a] bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Textarea for Notes */}
                {formData.type === "notes" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Text Notes Content <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="content"
                      rows={6}
                      value={formData.content}
                      onChange={handleFormChange}
                      placeholder="Type lecture notes, code snippets, or reference material..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                    />
                  </div>
                )}

                {/* Upload Progress Bar */}
                {isSubmitting && uploadProgress > 0 && (
                  <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1e3a8a]">
                      <span className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                        {uploadStage || "Streaming to cloud..."}
                      </span>
                      <span className="text-sm font-extrabold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#1e3a8a] to-blue-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Processing..."}</span>
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

            {/* ── RIGHT: Preview Panel ── */}
            <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 p-5 bg-slate-50/70">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-500" />
                Live Preview
              </p>

              {/* SKELETON — uploading in progress */}
              {isSubmitting && uploadProgress > 0 && (
                <div className="space-y-3 animate-pulse">
                  <div className="w-full h-44 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-2xl" style={{
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                  }} />
                  <div className="space-y-2 px-1">
                    <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                    <div className="h-2.5 bg-slate-200 rounded-full w-1/2" />
                    <div className="h-2.5 bg-slate-200 rounded-full w-2/3" />
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-6 h-6 bg-slate-200 rounded-full" />
                    <div className="h-2.5 bg-slate-200 rounded-full flex-1" />
                  </div>
                  <p className="text-[11px] font-semibold text-[#1e3a8a] text-center pt-1 flex items-center justify-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                    Uploading {uploadProgress}%...
                  </p>
                </div>
              )}

              {/* VIDEO PREVIEW */}
              {!isSubmitting && formData.type === "video" && (previewObjectUrl || formData.url) && (() => {
                const rawTarget = previewObjectUrl || formData.url;
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const serverBase = apiBase.replace(/\/api\/?$/, "");
                const targetSrc = rawTarget.startsWith("/uploads") ? `${serverBase}${rawTarget}` : rawTarget;

                const ytMatch = targetSrc.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
                const vimeoMatch = targetSrc.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
                const driveMatch = targetSrc.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);

                return (
                  <div className="space-y-3">
                    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-black aspect-video flex items-center justify-center">
                      {ytMatch ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                          title="Video Preview"
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      ) : vimeoMatch ? (
                        <iframe
                          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                          title="Video Preview"
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      ) : driveMatch ? (
                        <iframe
                          src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
                          title="Video Preview"
                          className="w-full h-full border-0"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          key={targetSrc}
                          src={targetSrc}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="px-1 space-y-1">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {formData.title || "Untitled Video"}
                      </p>
                      {selectedFile && (
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · {selectedFile.type}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        🎥 Video Lecture
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* PDF PREVIEW */}
              {!isSubmitting && formData.type === "pdf" && (previewObjectUrl || formData.url) && (() => {
                const rawPdf = previewObjectUrl || formData.url || "";
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
                const serverBase = apiBase.replace(/\/api\/?$/, "");
                const pdfTarget = rawPdf.startsWith("/uploads") ? `${serverBase}${rawPdf}` : rawPdf;

                return (
                  <div className="space-y-3">
                    <div className="w-full h-52 rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white">
                      <iframe
                        key={pdfTarget}
                        src={pdfTarget}
                        title="PDF Preview"
                        className="w-full h-full"
                        style={{ border: "none" }}
                      />
                    </div>
                    <div className="px-1 space-y-1">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {formData.title || "Untitled Document"}
                      </p>
                      {selectedFile && (
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · PDF
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                        📄 PDF Document
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* NOTES PREVIEW */}
              {!isSubmitting && formData.type === "notes" && formData.content && (
                <div className="space-y-3">
                  <div className="w-full min-h-40 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                    <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                      {formData.content}
                    </p>
                  </div>
                  <div className="px-1 space-y-1">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">
                      {formData.title || "Untitled Notes"}
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                      📝 Text Lesson
                    </span>
                  </div>
                </div>
              )}

              {/* PLACEHOLDER — no file selected yet */}
              {!isSubmitting && !previewObjectUrl && !formData.url && !formData.content && (
                <div className="w-full h-52 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-3 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    {formData.type === "video" ? (
                      <Video size={22} className="text-slate-400" />
                    ) : formData.type === "pdf" ? (
                      <FileText size={22} className="text-slate-400" />
                    ) : (
                      <BookOpen size={22} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      {formData.type === "notes" ? "Start typing notes" : "Choose a file to preview"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formData.type === "video"
                        ? "Video preview will appear here"
                        : formData.type === "pdf"
                        ? "PDF preview will appear here"
                        : "Notes preview will appear here"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

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
