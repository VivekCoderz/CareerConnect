import React, { useState, useRef, useEffect } from 'react';

export const EDUCATION_LEVELS = [
  {
    id: 'undergraduate',
    label: 'Undergraduate / College / University',
    badge: 'Undergraduate / College',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: '12th',
    label: '12th / Senior Secondary School',
    badge: '12th / Senior Secondary',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: '10th',
    label: '10th / Secondary School',
    badge: '10th / Secondary',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'diploma',
    label: 'Diploma (if applicable)',
    badge: 'Diploma',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'postgraduate',
    label: "Postgraduate / Master's",
    badge: "Postgraduate / Master's",
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'other',
    label: 'Other',
    badge: 'Other',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  },
];

/** Infer education level if not explicitly defined */
export const inferEducationLevel = (item) => {
  if (item?.level) return item.level;
  const deg = (item?.degree || '').toLowerCase();
  if (
    deg.includes('10th') ||
    (deg.includes('secondary') && !deg.includes('senior')) ||
    deg.includes('matric') ||
    deg.includes('high school')
  ) {
    return '10th';
  }
  if (
    deg.includes('12th') ||
    deg.includes('senior secondary') ||
    deg.includes('intermediate') ||
    deg.includes('higher secondary')
  ) {
    return '12th';
  }
  if (deg.includes('diploma') || deg.includes('polytechnic')) {
    return 'diploma';
  }
  if (
    deg.includes('master') ||
    deg.includes('mba') ||
    deg.includes('mca') ||
    deg.includes('m.tech') ||
    deg.includes('m.sc') ||
    deg.includes('postgraduate')
  ) {
    return 'postgraduate';
  }
  return 'undergraduate';
};

const EducationForm = ({ data = [], onChange }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef(null);

  // Close add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemChange = (index, field, value) => {
    const updated = data.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: value };

      // Keep aliases in sync for backward and forward compatibility
      if (field === 'college') {
        next.school = value;
        next.institution = value;
        next.institute = value;
      }
      if (field === 'branch') {
        next.stream = value;
        next.specialization = value;
        next.fieldOfStudy = value;
      }
      if (field === 'cgpa') {
        next.percentage = value;
        next.grade = value;
      }
      if (field === 'endYear') {
        next.passingYear = value;
        next.graduationYear = value;
      }
      return next;
    });
    onChange(updated);
  };

  const handleLevelChange = (index, newLevel) => {
    const updated = data.map((item, i) => {
      if (i !== index) return item;

      let newDegree = item.degree || '';
      if (newLevel === '10th') {
        newDegree = '10th / Secondary';
      } else if (newLevel === '12th') {
        newDegree = '12th / Senior Secondary';
      } else if (
        item.degree === '10th / Secondary' ||
        item.degree === '12th / Senior Secondary'
      ) {
        newDegree = '';
      }

      return {
        ...item,
        level: newLevel,
        degree: newDegree,
        branch: newLevel === '10th' ? '' : item.branch || '',
        stream: newLevel === '10th' ? '' : item.stream || item.branch || '',
        specialization:
          newLevel === '10th' ? '' : item.specialization || item.branch || '',
      };
    });
    onChange(updated);
  };

  const addEducationWithLevel = (level = 'undergraduate') => {
    setShowAddMenu(false);
    let defaultDegree = '';
    if (level === '10th') defaultDegree = '10th / Secondary';
    if (level === '12th') defaultDegree = '12th / Senior Secondary';

    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        level,
        college: '',
        school: '',
        institution: '',
        degree: defaultDegree,
        branch: '',
        stream: '',
        specialization: '',
        cgpa: '',
        percentage: '',
        startYear: '',
        endYear: '',
        passingYear: '',
        location: '',
      },
    ]);
  };

  const removeEducation = (index) => {
    if (data.length <= 1) return;
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Education Details</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add multiple education qualifications (Undergraduate, 12th, 10th, Diploma, etc.)
          </p>
        </div>

        {/* Add Education Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowAddMenu((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm transition-colors"
          >
            <span className="text-base font-semibold leading-none">+</span>
            <span>Add Education</span>
            <svg
              className={`w-4 h-4 ml-0.5 transition-transform ${showAddMenu ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Select Education Level
              </div>
              {EDUCATION_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => addEducationWithLevel(lvl.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors"
                >
                  <span>{lvl.label}</span>
                  <span className="text-xs text-gray-400">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Education Entries List */}
      {data.map((edu, index) => {
        const currentLevel = inferEducationLevel(edu);
        const levelConfig =
          EDUCATION_LEVELS.find((l) => l.id === currentLevel) || EDUCATION_LEVELS[0];

        return (
          <div
            key={edu.id || index}
            className="p-4 sm:p-5 border border-gray-200 rounded-lg space-y-4 relative bg-white shadow-sm hover:border-gray-300 transition-colors"
          >
            {/* Top Bar: Level Selector & Badge & Remove */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${levelConfig.badgeClass}`}
                >
                  {levelConfig.badge}
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-gray-500">
                    Change Level:
                  </label>
                  <select
                    value={currentLevel}
                    onChange={(e) => handleLevelChange(index, e.target.value)}
                    className="text-xs font-medium bg-gray-50 border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {data.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEducation(index)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove
                </button>
              )}
            </div>

            {/* DYNAMIC FIELDS PER EDUCATION LEVEL */}

            {/* ── 1. UNDERGRADUATE / COLLEGE / UNIVERSITY ── */}
            {currentLevel === 'undergraduate' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.degree || ''}
                    onChange={(e) => handleItemChange(index, 'degree', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. B.Tech, BCA, B.Sc"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Specialization / Branch
                  </label>
                  <input
                    type="text"
                    value={edu.branch || ''}
                    onChange={(e) => handleItemChange(index, 'branch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    College / University <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.college || ''}
                    onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Geeta University, Panipat"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CGPA / Percentage
                  </label>
                  <input
                    type="text"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 9.2 or 85%"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={edu.location || ''}
                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Panipat, Haryana"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={edu.startYear || ''}
                    onChange={(e) => handleItemChange(index, 'startYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2023"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Year / Graduation Year
                  </label>
                  <input
                    type="text"
                    value={edu.endYear || ''}
                    onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2027"
                  />
                </div>
              </div>
            )}

            {/* ── 2. 12TH / SENIOR SECONDARY SCHOOL ── */}
            {currentLevel === '12th' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    School Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.college || ''}
                    onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. ABC Senior Secondary School"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stream
                  </label>
                  <input
                    type="text"
                    value={edu.branch || ''}
                    onChange={(e) => handleItemChange(index, 'branch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Science (PCM/PCB), Commerce, Arts"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Percentage / CGPA
                  </label>
                  <input
                    type="text"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 85% or 8.8"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Passing Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.endYear || ''}
                    onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2023"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={edu.location || ''}
                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Delhi, India"
                  />
                </div>
              </div>
            )}

            {/* ── 3. 10TH / SECONDARY SCHOOL ── */}
            {currentLevel === '10th' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    School Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.college || ''}
                    onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. XYZ High School"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Percentage / CGPA
                  </label>
                  <input
                    type="text"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 90% or 9.4"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Passing Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.endYear || ''}
                    onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2021"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={edu.location || ''}
                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Delhi, India"
                  />
                </div>
              </div>
            )}

            {/* ── 4. DIPLOMA ── */}
            {currentLevel === 'diploma' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Diploma / Course <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.degree || ''}
                    onChange={(e) => handleItemChange(index, 'degree', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Diploma in Mechanical Engineering"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={edu.branch || ''}
                    onChange={(e) => handleItemChange(index, 'branch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Automobile Engineering"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Institute Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.college || ''}
                    onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Government Polytechnic Institute"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Percentage / CGPA
                  </label>
                  <input
                    type="text"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 82% or 8.4"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={edu.location || ''}
                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Mumbai, Maharashtra"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={edu.startYear || ''}
                    onChange={(e) => handleItemChange(index, 'startYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2020"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Year
                  </label>
                  <input
                    type="text"
                    value={edu.endYear || ''}
                    onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2023"
                  />
                </div>
              </div>
            )}

            {/* ── 5. POSTGRADUATE / MASTER'S ── */}
            {currentLevel === 'postgraduate' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.degree || ''}
                    onChange={(e) => handleItemChange(index, 'degree', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. M.Tech, MBA, MCA, M.Sc"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={edu.branch || ''}
                    onChange={(e) => handleItemChange(index, 'branch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Artificial Intelligence, Marketing"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    University / College <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.college || ''}
                    onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Delhi University"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CGPA / Percentage
                  </label>
                  <input
                    type="text"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 8.8 or 85%"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={edu.location || ''}
                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. New Delhi, India"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={edu.startYear || ''}
                    onChange={(e) => handleItemChange(index, 'startYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2023"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Year
                  </label>
                  <input
                    type="text"
                    value={edu.endYear || ''}
                    onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2025"
                  />
                </div>
              </div>
            )}

            {/* ── 6. OTHER ── */}
            {currentLevel === 'other' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Qualification / Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.degree || ''}
                    onChange={(e) => handleItemChange(index, 'degree', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Certificate in Full Stack Development"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Specialization / Field
                  </label>
                  <input
                    type="text"
                    value={edu.branch || ''}
                    onChange={(e) => handleItemChange(index, 'branch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Web Technologies"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Institution / Organization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={edu.college || ''}
                    onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. National Skill Center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Percentage / Grade / CGPA
                  </label>
                  <input
                    type="text"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Grade A or 85%"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={edu.location || ''}
                    onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Bangalore, India"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={edu.startYear || ''}
                    onChange={(e) => handleItemChange(index, 'startYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2022"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Year / Completion Year
                  </label>
                  <input
                    type="text"
                    value={edu.endYear || ''}
                    onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 2023"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Quick Add Pill Buttons below the list for fast convenient addition */}
      <div className="pt-2">
        <p className="text-xs font-medium text-gray-500 mb-2">Quick Add another education level:</p>
        <div className="flex flex-wrap gap-2">
          {EDUCATION_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => addEducationWithLevel(lvl.id)}
              className="text-xs px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors"
            >
              + {lvl.badge}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EducationForm;

