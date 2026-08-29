import { useState } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px]">
            {/* Logo - Geeta University */}
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/geeta-university-logo.png"
                alt="Geeta University"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              {/* Fallback if image not loaded */}
              <div className="hidden items-center gap-2">
                <div className="w-10 h--10 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm">
                  GU
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-[#1e3a8a]">GEETA</p>
                  <p className="text-[10px] font-semibold text-[#f59e0b] tracking-wide">UNIVERSITY</p>
                </div>
              </div>
            </Link>

            {/* Nav */}
            <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-slate-600">
              <a href="#internships" className="hover:text-[#1e3a8a] transition">Internships</a>
              <a href="#jobs" className="hover:text-[#1e3a8a] transition">Jobs</a>
              <a href="#companies" className="hover:text-[#1e3a8a] transition">Companies</a>
              <a href="#how-it-works" className="hover:text-[#1e3a8a] transition">How it works</a>
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="hidden sm:inline-flex text-[13px] font-semibold text-slate-600 hover:text-[#1e3a8a] transition px-2"
              >
                Login
              </Link>
              <Link
                to="/register/student"
                className="inline-flex items-center h-9 px-4 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-[13px] font-semibold transition"
              >
                Student Register
              </Link>
              <Link
                to="/register/employer"
                className="hidden md:inline-flex items-center h-9 px-4 rounded-lg border-2 border-[#f59e0b] text-[#b45309] hover:bg-[#fffbeb] text-[13px] font-semibold transition"
              >
                Employer Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eff6ff] via-white to-white">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e3a8a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fff7ed] border border-[#fed7aa] text-[12px] font-semibold text-[#c2410c] mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                Official Career Platform · Geeta University
              </div>

              <h1 className="text-[2.35rem] sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-slate-900 leading-[1.15]">
                Internships & jobs that{" "}
                <span className="text-[#1e3a8a]">shape your career</span>
              </h1>

              <p className="mt-5 text-[16px] text-slate-600 leading-relaxed max-w-xl">
                Explore verified internships, jobs and projects. Build your profile, apply in one click, and take the next step — built for Geeta University students & alumni.
              </p>

              {/* Search */}
              <div className="mt-8 max-w-xl">
                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60">
                  <div className="flex-1 flex items-center gap-3 px-3">
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search internships, jobs, companies..."
                      className="w-full h-11 text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <Link
                    to={searchQuery ? `/opportunities?q=${encodeURIComponent(searchQuery)}` : "/opportunities"}
                    className="h-11 px-6 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition flex items-center justify-center"
                  >
                    Search
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Internship", "Remote", "Fresher", "Part-time", "Work from Home"].map((tag) => (
                    <Link
                      key={tag}
                      to={`/opportunities?type=${tag.toLowerCase()}`}
                      className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Dual CTA */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register/student"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition shadow-lg shadow-blue-900/20"
                >
                  I’m a Student / Fresher
                </Link>
                <Link
                  to="/register/employer"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-semibold transition shadow-lg shadow-amber-500/25"
                >
                  I’m an Employer / Recruiter
                </Link>
              </div>
            </div>

            {/* Right - Visual cards */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-6 -right-4 w-72 h-72 bg-[#f59e0b]/10 rounded-full blur-3xl" />
              <div className="relative space-y-4">
                {[
                  { title: "Frontend Intern", company: "TechNova", tag: "Internship", pay: "₹15k/mo" },
                  { title: "Software Engineer", company: "CloudWorks", tag: "Full-time", pay: "₹6–8 LPA" },
                  { title: "UI/UX Design Intern", company: "DesignLab", tag: "Internship", pay: "₹12k/mo" },
                ].map((job, i) => (
                  <div
                    key={job.title}
                    className={`bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5 ${
                      i === 1 ? "ml-8" : i === 2 ? "ml-4" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3a8a]">
                          {job.tag}
                        </span>
                        <p className="mt-2 text-[15px] font-semibold text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-500">{job.company}</p>
                      </div>
                      <p className="text-sm font-bold text-[#1e3a8a]">{job.pay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="border-y border-slate-100 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "500+", label: "Live Opportunities" },
              { value: "2,000+", label: "Students Registered" },
              { value: "120+", label: "Hiring Partners" },
              { value: "1,500+", label: "Applications" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-bold text-[#1e3a8a]">{s.value}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section id="internships" className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Explore by category
              </h2>
              <p className="mt-1.5 text-slate-500 text-sm">Find what fits your goals</p>
            </div>
            <Link to="/opportunities" className="hidden sm:inline text-sm font-semibold text-[#1e3a8a] hover:underline">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Internships", count: "180+", emoji: "🎓", path: "/opportunities?type=internship" },
              { title: "Fresher Jobs", count: "95+", emoji: "💼", path: "/opportunities?type=job" },
              { title: "Work from Home", count: "70+", emoji: "🏠", path: "/opportunities?remote=true" },
              { title: "Part-time", count: "45+", emoji: "⏰", path: "/opportunities?type=part-time" },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.path}
                className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#1e3a8a]/40 hover:shadow-md transition"
              >
                <span className="text-2xl">{c.emoji}</span>
                <h3 className="mt-3 text-[15px] font-bold text-slate-900 group-hover:text-[#1e3a8a] transition">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{c.count} openings</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURED OPPORTUNITIES ================= */}
      <section id="jobs" className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Featured opportunities
              </h2>
              <p className="mt-1.5 text-slate-500 text-sm">Fresh openings from top companies</p>
            </div>
            <Link to="/opportunities" className="hidden sm:inline text-sm font-semibold text-[#1e3a8a] hover:underline">
              See all →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Frontend Developer Intern", company: "TechNova", loc: "Bangalore · Remote", type: "Internship", pay: "₹15,000/mo" },
              { title: "Software Engineer (Fresher)", company: "CloudWorks", loc: "Hyderabad", type: "Full-time", pay: "₹6–8 LPA" },
              { title: "UI/UX Design Intern", company: "DesignLab", loc: "M · Hybrid", type: "Internship", pay: "₹12,000/mo" },
              { title: "Backend Developer", company: "DataPipe", loc: "Pune", type: "Full-time", pay: "₹8–12 LPA" },
              { title: "Digital Marketing Intern", company: "Growthify", loc: "Delhi · Remote", type: "Internship", pay: "₹10,000/mo" },
              { title: "Data Analyst Trainee", company: "InsightAI", loc: "Chennai", type: "Trainee", pay: "₹20,000/mo" },
            ].map((job) => (
              <div
                key={job.title}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#1e3a8a]/30 hover:shadow-md transition group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e3a8a]">
                      {job.type}
                    </span>
                    <h3 className="mt-2 text-[15px] font-bold text-slate-900 group-hover:text-[#1e3a8a] transition truncate">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">{job.company}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">{job.loc}</span>
                  <span className="text-sm font-bold text-slate-800">{job.pay}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMPANIES MARQUEE ================= */}
      <section id="companies" className="py-14 lg:py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Hiring partners
            </h2>
            <p className="mt-1.5 text-slate-500 text-sm">
              Companies hiring Geeta University talent
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10" />

          <div className="flex overflow-hidden">
            <div className="flex animate-marquee gap-4 sm:gap-5 py-2">
              {[
                "TechNova", "CloudWorks", "DesignLab", "DataPipe", "Growthify",
                "InsightAI", "ByteForge", "Nexlify", "CodeNest", "PixelCraft",
                "TechNova", "CloudWorks", "DesignLab", "DataPipe", "Growthify",
                "InsightAI", "ByteForge", "Nexlify", "CodeNest", "PixelCraft",
              ].map((company, i) => (
                <div
                  key={`${company}-${i}`}
                  className="flex-shrink-0 w-36 sm:w-40 h-[88px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-1.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {company.slice(0, 2)}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{company}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How it works
            </h2>
            <p className="mt-2 text-slate-500 text-sm">Get started in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Register & verify", desc: "Create your account with email OTP verification as student, fresher or professional." },
              { step: "2", title: "Complete your profile", desc: "Add education, skills, projects and resume so recruiters can find you." },
              { step: "3", title: "Apply & get hired", desc: "Browse opportunities, apply in one click, and track interviews & offers." },
            ].map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center text-sm font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= DUAL CTA: Student + Employer ================= */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-5">
            {/* Student card */}
            <div className="rounded-3xl bg-[#1e3a8a] p-8 sm:p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <p className="text-[12px] font-semibold text-blue-200 uppercase tracking-wider mb-2">
                For Students & Freshers
              </p>
              <h3 className="text-2xl font-bold leading-snug">
                Find internships & jobs that match your skills
              </h3>
              <p className="mt-3 text-blue-100 text-sm leading-relaxed">
                Build profile, apply easily, track applications — all in one place.
              </p>
              <Link
                to="/register/student"
                className="inline-flex mt-6 h-11 px-6 rounded-xl bg-white text-[#1e3a8a] text-sm font-bold hover:bg-blue-50 transition"
              >
                Student Register
              </Link>
            </div>

            {/* Employer card */}
            <div className="rounded-3xl bg-[#fffbeb] border border-[#fde68a] p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#f59e0b]/10 rounded-full blur-2xl" />
              <p className="text-[12px] font-semibold text-[#b45309] uppercase tracking-wider mb-2">
                For Employers & Recruiters
              </p>
              <h3 className="text-2xl font-bold text-slate-900 leading-snug">
                Hire verified talent from Geeta University
              </h3>
              <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                Post opportunities, review applications, and hire the right candidates faster.
              </p>
              <Link
                to="/register/employer"
                className="inline-flex mt-6 h-11 px-6 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-bold transition"
              >
                Employer Sign-up
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
                  GU
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1e3a8a]">GEETA UNIVERSITY</p>
                  <p className="text-[10px] text-[#f59e0b] font-semibold">CareerConnect</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Official career & opportunity platform for Geeta University students, alumni and recruiters.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Platform</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#internships" className="hover:text-[#1e3a8a]">Internships</a></li>
                <li><a href="#jobs" className="hover:text-[#1e3a8a]">Jobs</a></li>
                <li><a href="#companies" className="hover:text-[#1e3a8a]">Companies</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Candidates</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/login" className="hover:text-[#1e3a8a]">Login</Link></li>
                <li><Link to="/signup" className="hover:text-[#1e3a8a]">Sign-up</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Employers</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/login?type=employer" className="hover:text-[#1e3a8a]">Employer Login</Link></li>
                <li><Link to="/register/employer" className="hover:text-[#1e3a8a]">Employer Sign-up</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Geeta University · CareerConnect
            </p>
            <p className="text-xs text-slate-400">
              Panipat, Delhi NCR, India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;