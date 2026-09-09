
import React, { useState, useRef, useEffect } from 'react';

// Comprehensive category-specific skill catalogs
const SKILL_CATALOGS = {
  programmingLanguages: [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C++',
    'C',
    'C#',
    'Go',
    'Rust',
    'PHP',
    'Ruby',
    'Swift',
    'Kotlin',
    'Dart',
    'SQL',
    'HTML5',
    'CSS3',
    'R',
    'Scala',
    'Shell Scripting',
    'Bash',
    'MATLAB',
    'Solidity',
  ],
  frameworks: [
    'React',
    'React.js',
    'Next.js',
    'Node.js',
    'Express.js',
    'Angular',
    'Vue.js',
    'Django',
    'Flask',
    'FastAPI',
    'Spring Boot',
    'ASP.NET Core',
    'Tailwind CSS',
    'Bootstrap',
    'Redux',
    'Redux Toolkit',
    'GraphQL',
    'jQuery',
    'React Native',
    'Flutter',
    'Svelte',
    'Laravel',
    'Ruby on Rails',
    'PyTorch',
    'TensorFlow',
    'Pandas',
    'NumPy',
    'Scikit-learn',
    'Prisma',
    'Hibernate',
  ],
  tools: [
    'Git',
    'GitHub',
    'GitLab',
    'Docker',
    'Kubernetes',
    'AWS',
    'Microsoft Azure',
    'Google Cloud (GCP)',
    'Linux',
    'Postman',
    'VS Code',
    'Jira',
    'Figma',
    'Vercel',
    'Netlify',
    'Jenkins',
    'Webpack',
    'Vite',
    'CI/CD',
    'Terraform',
    'Nginx',
    'Prometheus',
    'Grafana',
  ],
  other: [
    'REST APIs',
    'Microservices',
    'System Design',
    'Data Structures & Algorithms (DSA)',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'Redis',
    'Firebase',
    'Object-Oriented Programming (OOP)',
    'Database Management (DBMS)',
    'Computer Networks',
    'Operating Systems',
    'Machine Learning',
    'Deep Learning',
    'Agile / Scrum',
    'Unit Testing',
    'WebSockets',
    'Cloud Computing',
    'Cyber Security',
    'UI/UX Design',
    'DevOps',
  ],
};

const CATEGORY_CONFIG = [
  {
    key: 'programmingLanguages',
    label: 'Programming Languages',
    icon: '💻',
    placeholder: 'e.g. JavaScript, Python (type or pick below)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    chipClass: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    popularPills: ['JavaScript', 'Python', 'Java', 'C++', 'TypeScript', 'SQL', 'HTML5', 'CSS3', 'Go', 'PHP'],
  },
  {
    key: 'frameworks',
    label: 'Frameworks / Libraries',
    icon: '⚡',
    placeholder: 'e.g. React, Node.js, Express (type or pick below)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    chipClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
    popularPills: ['React', 'Node.js', 'Express.js', 'Next.js', 'Tailwind CSS', 'Django', 'Spring Boot', 'Redux', 'MongoDB'],
  },
  {
    key: 'tools',
    label: 'Tools & Platforms',
    icon: '🛠️',
    placeholder: 'e.g. Git, Docker, Postman (type or pick below)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    chipClass: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    popularPills: ['Git', 'GitHub', 'Docker', 'VS Code', 'Postman', 'AWS', 'Linux', 'Figma', 'Jira', 'Kubernetes'],
  },
  {
    key: 'other',
    label: 'Other Technical Skills & Concepts',
    icon: '🧠',
    placeholder: 'e.g. REST APIs, DSA, System Design (type or pick below)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    chipClass: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
    popularPills: ['REST APIs', 'Data Structures & Algorithms (DSA)', 'MongoDB', 'PostgreSQL', 'System Design', 'Redis', 'OOP', 'Agile / Scrum'],
  },
];

// Helper to parse comma-separated string into unique array
const parseSkillsArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((s) => (typeof s === 'string' ? s.trim() : s?.name || '')).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const SkillCategoryField = ({ config, currentString = '', onUpdateCategory }) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedSkills = parseSkillsArray(currentString);
  const catalog = SKILL_CATALOGS[config.key] || [];

  // Filter catalog for autocomplete suggestions based on current input
  const suggestions = catalog.filter((skill) => {
    const isAlreadySelected = selectedSkills.some(
      (s) => s.toLowerCase() === skill.toLowerCase()
    );
    if (isAlreadySelected) return false;
    if (!inputValue.trim()) return false;
    return skill.toLowerCase().includes(inputValue.trim().toLowerCase());
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addSkill = (skillToAdd) => {
    const clean = String(skillToAdd || '').trim();
    if (!clean) return;

    // Check if skill (or matched catalog skill) is already present
    const existingIndex = selectedSkills.findIndex(
      (s) => s.toLowerCase() === clean.toLowerCase()
    );
    if (existingIndex !== -1) {
      setInputValue('');
      setShowDropdown(false);
      return;
    }

    // Prefer catalog casing if available
    const catalogMatch = catalog.find(
      (c) => c.toLowerCase() === clean.toLowerCase()
    );
    const finalSkillName = catalogMatch || clean;

    const newSkills = [...selectedSkills, finalSkillName];
    onUpdateCategory(newSkills.join(', '));
    setInputValue('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const removeSkill = (skillToRemove) => {
    const newSkills = selectedSkills.filter(
      (s) => s.toLowerCase() !== skillToRemove.toLowerCase()
    );
    onUpdateCategory(newSkills.join(', '));
  };

  const togglePill = (skill) => {
    const isSelected = selectedSkills.some(
      (s) => s.toLowerCase() === skill.toLowerCase()
    );
    if (isSelected) {
      removeSkill(skill);
    } else {
      addSkill(skill);
    }
  };

  const handleKeyDown = (e) => {
    // Comma or Enter to add
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        addSkill(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        // May contain multiple comma-separated entries if pasted
        const parts = inputValue.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length > 1) {
          let updated = [...selectedSkills];
          parts.forEach((p) => {
            if (!updated.some((s) => s.toLowerCase() === p.toLowerCase())) {
              updated.push(p);
            }
          });
          onUpdateCategory(updated.join(', '));
          setInputValue('');
          setShowDropdown(false);
        } else {
          addSkill(inputValue);
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedSkills.length > 0) {
      // Remove last skill on backspace in empty input
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowDropdown(true);
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowDropdown(true);
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // If user typed comma, process immediately
    if (val.includes(',')) {
      const parts = val.split(',').map((p) => p.trim()).filter(Boolean);
      let updated = [...selectedSkills];
      parts.forEach((p) => {
        if (!updated.some((s) => s.toLowerCase() === p.toLowerCase())) {
          updated.push(p);
        }
      });
      onUpdateCategory(updated.join(', '));
      setInputValue('');
      setShowDropdown(false);
      return;
    }
    setInputValue(val);
    setShowDropdown(val.trim().length > 0);
    setHighlightedIndex(-1);
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <span>{config.icon}</span>
          <span>{config.label}</span>
          {selectedSkills.length > 0 && (
            <span className="text-xs font-normal text-gray-500">
              ({selectedSkills.length} added)
            </span>
          )}
        </label>
        {selectedSkills.length > 0 && (
          <button
            type="button"
            onClick={() => onUpdateCategory('')}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Skill Tags & Input Box */}
      <div
        ref={containerRef}
        className="relative border border-gray-300 rounded-md p-2 bg-gray-50 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.chipClass} transition-colors`}
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSkill(skill);
                }}
                className="hover:text-red-700 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-xs leading-none"
                title={`Remove ${skill}`}
              >
                ×
              </button>
            </span>
          ))}

          {/* Typeahead input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.trim()) setShowDropdown(true);
            }}
            placeholder={
              selectedSkills.length === 0
                ? config.placeholder
                : 'Type to add more (Enter or comma)...'
            }
            className="flex-1 min-w-[160px] bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none py-1 px-1"
          />
        </div>

        {/* Live Auto-Complete Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Matching Suggestions
            </div>
            {suggestions.slice(0, 8).map((suggestion, idx) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addSkill(suggestion);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between transition-colors ${
                  idx === highlightedIndex
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{suggestion}</span>
                <span className="text-xs text-blue-500 font-semibold">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Suggested Skill Pills (Click to Toggle) */}
      <div className="pt-1">
        <div className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
          <span>💡</span>
          <span>Popular Suggestions (Click to add):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {config.popularPills.map((pill) => {
            const isSelected = selectedSkills.some(
              (s) => s.toLowerCase() === pill.toLowerCase()
            );
            return (
              <button
                key={pill}
                type="button"
                onClick={() => togglePill(pill)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-medium ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <span>{isSelected ? '✓' : '+'}</span>
                <span>{pill}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SkillsForm = ({ data = {}, onChange }) => {
  const handleCategoryUpdate = (categoryKey, newString) => {
    onChange({
      ...data,
      [categoryKey]: newString,
    });
  };

  return (
    <div className="space-y-5">
      <div className="pb-1 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Skills</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Click suggested skills to add them instantly, or type your own and press Enter.
        </p>
      </div>

      <div className="space-y-4">
        {CATEGORY_CONFIG.map((config) => (
          <SkillCategoryField
            key={config.key}
            config={config}
            currentString={data[config.key] || ''}
            onUpdateCategory={(newString) =>
              handleCategoryUpdate(config.key, newString)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default SkillsForm;
