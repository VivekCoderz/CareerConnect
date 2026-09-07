import React from "react";
import {
  LayoutDashboard,
  User,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  Plus,
  CalendarDays,
  Pencil,
  Trash2,
  EyeOff,
  Upload,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

import "./EmployeeCoursesPage.css";

const EmployeeCoursesPage = () => {
  // Temporary dummy data
  // Baad mein isi jagah GET /api/courses/my-courses ka data aayega
  const courses = [
    {
      id: 1,
      title: "React Development for Beginners",
      description:
        "Learn React from scratch and build modern web applications with hands-on projects.",
      category: "DEVELOPMENT",
      level: "Beginner",
      duration: "8 Weeks",
      lessons: "15 Lessons",
      rating: "4.8",
      status: "Published",
      createdOn: "20 Mar 2024",
      image: "react",
    },
    {
      id: 2,
      title: "JavaScript Fundamentals",
      description:
        "Master the core concepts of JavaScript and improve your programming skills.",
      category: "PROGRAMMING",
      level: "Beginner",
      duration: "6 Weeks",
      lessons: "12 Lessons",
      rating: "4.6",
      status: "Draft",
      createdOn: "18 Mar 2024",
      image: "javascript",
    },
    {
      id: 3,
      title: "Node.js - Build Scalable Apps",
      description:
        "Learn Node.js, Express and MongoDB to build scalable backend applications.",
      category: "BACKEND",
      level: "Intermediate",
      duration: "10 Weeks",
      lessons: "18 Lessons",
      rating: "4.7",
      status: "Published",
      createdOn: "15 Mar 2024",
      image: "node",
    },
  ];

  return (
    <div className="employee-courses-page">

      {/* ================= HEADER ================= */}
      <header className="employee-header">

        <div className="header-left">

          <div className="university-logo">
            <img
              src="/geeta-university-logo.png"
              alt="Geeta University"
            />
          </div>

          <div className="header-divider"></div>

          <button className="menu-button">
            <Menu size={26} />
          </button>

        </div>

        <div className="header-right">

          <div className="notification-wrapper">
            <Bell size={27} />
            <span className="notification-count">3</span>
          </div>

          <div className="employee-profile">

            <div className="employee-avatar">
              E
            </div>

            <span className="employee-name">
              Employee
            </span>

            <ChevronDown size={18} />

          </div>

        </div>

      </header>


      {/* ================= MAIN LAYOUT ================= */}

      <div className="employee-layout">

        {/* ================= SIDEBAR ================= */}

        <aside className="employee-sidebar">

          <nav className="sidebar-nav">

            <a href="#" className="sidebar-item">
              <LayoutDashboard size={23} />
              <span>Dashboard</span>
            </a>

            <a href="#" className="sidebar-item">
              <User size={23} />
              <span>My Profile</span>
            </a>

            <a
              href="/employer/courses"
              className="sidebar-item active"
            >
              <BookOpen size={23} />
              <span>My Courses</span>
            </a>

            <a href="#" className="sidebar-item">
              <ClipboardList size={23} />
              <span>Applications</span>
            </a>

            <a href="#" className="sidebar-item">
              <MessageSquare size={23} />
              <span>Messages</span>
            </a>

            <a href="#" className="sidebar-item">
              <Settings size={23} />
              <span>Settings</span>
            </a>

          </nav>

        </aside>


        {/* ================= CONTENT ================= */}

        <main className="courses-content">

          {/* Page heading */}

          <div className="courses-heading">

            <div>

              <h1>My Courses</h1>

              <div className="breadcrumb">
                <span>Dashboard</span>
                <span className="breadcrumb-arrow">›</span>
                <span>My Courses</span>
              </div>

            </div>

            <button className="create-course-btn">
              <Plus size={22} />
              <span>Create New Course</span>
            </button>

          </div>


          {/* ================= COURSE LIST ================= */}

          <div className="course-list">

            {courses.map((course) => (

              <div className="course-card" key={course.id}>

                {/* Course Thumbnail */}

                <div className={`course-thumbnail ${course.image}`}>

                  {course.image === "react" && (
                    <>
                      <div className="react-symbol">⚛</div>
                      <div className="thumbnail-title">
                        React
                      </div>
                      <div className="thumbnail-subtitle">
                        DEVELOPMENT
                      </div>
                    </>
                  )}

                  {course.image === "javascript" && (
                    <>
                      <div className="js-box">JS</div>
                      <div className="thumbnail-title js-title">
                        JavaScript
                      </div>
                      <div className="thumbnail-subtitle js-subtitle">
                        FUNDAMENTALS
                      </div>
                    </>
                  )}

                  {course.image === "node" && (
                    <>
                      <div className="node-logo">
                        node
                        <span>.js</span>
                      </div>

                      <div className="thumbnail-title node-title">
                        BUILD SCALABLE
                      </div>

                      <div className="thumbnail-subtitle node-subtitle">
                        APPS
                      </div>
                    </>
                  )}

                </div>


                {/* Course Information */}

                <div className="course-info">

                  <div className="course-category">
                    {course.category}
                  </div>

                  <h2>{course.title}</h2>

                  <p className="course-description">
                    {course.description}
                  </p>


                  {/* Course Meta */}

                  <div className="course-meta">

                    <span>
                      <CalendarDays size={17} />
                      {course.level}
                    </span>

                    <span className="meta-dot">•</span>

                    <span>{course.duration}</span>

                    <span className="meta-dot">•</span>

                    <span>{course.lessons}</span>

                    <span className="meta-dot">•</span>

                    <span className="rating">
                      <Star
                        size={17}
                        fill="currentColor"
                      />
                      {course.rating}
                    </span>

                  </div>

                </div>


                {/* Right Section */}

                <div className="course-actions-section">

                  <div className="course-status-area">

                    <span
                      className={`course-status ${
                        course.status === "Published"
                          ? "published"
                          : "draft"
                      }`}
                    >
                      {course.status}
                    </span>

                    <p>
                      Created on {course.createdOn}
                    </p>

                  </div>


                  {/* Buttons */}

                  <div className="course-buttons">

                    <button className="edit-btn">
                      <Pencil size={18} />
                      <span>Edit</span>
                    </button>

                    <button className="delete-btn">
                      <Trash2 size={18} />
                      <span>Delete</span>
                    </button>

                    {course.status === "Published" ? (

                      <button className="unpublish-btn">
                        <EyeOff size={18} />
                        <span>Unpublish</span>
                      </button>

                    ) : (

                      <button className="publish-btn">
                        <Upload size={18} />
                        <span>Publish</span>
                      </button>

                    )}

                  </div>

                </div>

              </div>

            ))}

          </div>


          {/* ================= BOTTOM ================= */}

          <div className="courses-bottom">

            <p>
              Showing 1 to 3 of 3 courses
            </p>

            <div className="pagination">

              <button className="pagination-arrow">
                <ChevronLeft size={20} />
              </button>

              <button className="pagination-number active-page">
                1
              </button>

              <button className="pagination-arrow">
                <ChevronRight size={20} />
              </button>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
};

export default EmployeeCoursesPage;