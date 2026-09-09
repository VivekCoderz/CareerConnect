const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Course = require("../models/Course");
const StudentProfile = require("../models/StudentProfile");
const { GoogleGenerativeAI } = require("@google/generative-ai");

let geminiModel = null;
if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your_gemini")) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
    console.log("RAG AI Assistant initialized with Gemini");
  } catch (e) {
    console.warn("Could not init Gemini for RAG:", e.message);
  }
}

/**
 * 1. RETRIEVAL: Query database based on user intent and keywords
 */
const retrievePlatformContext = async (queryText, userId = null) => {
  const queryLower = (queryText || "").toLowerCase();
  const tokens = queryLower
    .replace(/[^\w\s]/gi, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const contextData = {
    jobs: [],
    internships: [],
    courses: [],
    studentProfile: null,
    topic: "general",
  };

  // 1. Fetch student profile if authenticated
  if (userId) {
    try {
      contextData.studentProfile = await StudentProfile.findOne({ userId }).lean();
    } catch (err) {
      console.warn("Could not fetch student profile for RAG:", err.message);
    }
  }

  // Detect intent
  const isJobQuery = /job|salary|opening|role|ctc|fulltime|full-time|hiring|company/i.test(queryLower);
  const isInternQuery = /intern|stipend|summer|winter|trainee|fresher/i.test(queryLower);
  const isCourseQuery = /course|learn|certif|study|skill|module|tutorial/i.test(queryLower);
  const isResumeQuery = /resume|cv|profile|critique|improve|missing|review|readiness/i.test(queryLower);

  // Search Jobs
  try {
    const jobRegex = tokens.length > 0 ? new RegExp(tokens.join("|"), "i") : /developer|engineer|analyst/i;
    const jobs = await Job.find({
      status: "Published",
      $or: [
        { title: { $regex: jobRegex } },
        { company: { $regex: jobRegex } },
        { skillsRequired: { $in: tokens } },
        { location: { $regex: jobRegex } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    contextData.jobs = jobs.map((j) => ({
      type: "job",
      id: j._id,
      title: j.title,
      company: j.company || "Top Tech Partner",
      location: j.location || "Multiple Locations",
      workMode: j.workMode || (j.remote ? "Remote" : "In-office"),
      salary: j.salary || "Competitive CTC",
      skills: j.skillsRequired || ["Problem Solving"],
      applyUrl: `/jobs`,
    }));
  } catch (err) {
    console.warn("RAG jobs retrieval error:", err.message);
  }

  // Search Internships
  try {
    const intRegex = tokens.length > 0 ? new RegExp(tokens.join("|"), "i") : /web|frontend|backend|data|python/i;
    const [internships1, internships2] = await Promise.all([
      Internship.find({
        status: "Published",
        $or: [
          { title: { $regex: intRegex } },
          { company: { $regex: intRegex } },
          { skillsRequired: { $in: tokens } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Job.find({
        status: "Published",
        employmentType: "Internship",
        $or: [
          { title: { $regex: intRegex } },
          { company: { $regex: intRegex } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
    ]);

    const rawInternships = [...(internships1 || []), ...(internships2 || [])].slice(0, 3);
    contextData.internships = rawInternships.map((i) => ({
      type: "internship",
      id: i._id,
      title: i.title,
      company: i.company || i.employerId?.companyName || "Verified Startup",
      location: i.location || "Remote",
      workMode: i.workMode || (i.remote ? "Work from home" : "In-office"),
      stipend: i.stipend || "₹15,000 - ₹35,000 / month",
      duration: i.duration || "3 - 6 Months",
      skills: i.skillsRequired || ["Web Development"],
      applyUrl: `/internships`,
    }));
  } catch (err) {
    console.warn("RAG internships retrieval error:", err.message);
  }

  // Search Courses
  try {
    const courseRegex = tokens.length > 0 ? new RegExp(tokens.join("|"), "i") : /full stack|react|python|cloud|ai/i;
    const courses = await Course.find({
      $or: [
        { title: { $regex: courseRegex } },
        { provider: { $regex: courseRegex } },
        { skillsCovered: { $in: tokens } },
      ],
    })
      .limit(3)
      .lean();

    contextData.courses = courses.map((c) => ({
      type: "course",
      id: c._id,
      title: c.title,
      provider: c.provider || "Geeta University Academy",
      duration: c.duration || "6 Weeks",
      level: c.level || "All Levels",
      rating: c.rating || "4.8",
      isFree: c.isFree !== false,
      applyUrl: `/courses/${c._id}`,
    }));
  } catch (err) {
    console.warn("RAG courses retrieval error:", err.message);
  }

  if (isResumeQuery) contextData.topic = "resume";
  else if (isInternQuery) contextData.topic = "internship";
  else if (isJobQuery) contextData.topic = "job";
  else if (isCourseQuery) contextData.topic = "course";

  return contextData;
};

/**
 * 2. AUGMENTATION & GENERATION: Generate answer via Gemini or local RAG reasoning
 */
const answerUserQuery = async ({ query, userId = null, conversationHistory = [] }) => {
  const context = await retrievePlatformContext(query, userId);

  // Prepare contextual items to return as interactive cards
  let suggestedCards = [];
  if (context.topic === "internship") {
    suggestedCards = context.internships;
  } else if (context.topic === "job") {
    suggestedCards = context.jobs;
  } else if (context.topic === "course") {
    suggestedCards = context.courses;
  } else {
    suggestedCards = [
      ...(context.internships.slice(0, 1)),
      ...(context.jobs.slice(0, 1)),
      ...(context.courses.slice(0, 1)),
    ];
  }

  // Format context for prompt
  const profileText = context.studentProfile
    ? `
STUDENT PROFILE INFORMATION:
- Career Goal: ${context.studentProfile.careerGoal || "Software Developer"}
- Technical Skills: ${(context.studentProfile.technicalSkills || []).join(", ") || "None listed"}
- Soft Skills: ${(context.studentProfile.softSkills || []).join(", ") || "Communication, Teamwork"}
- Education: ${
        context.studentProfile.education?.[0]
          ? `${context.studentProfile.education[0].degree} from ${context.studentProfile.education[0].institution}`
          : "Geeta University"
      }
- Projects Count: ${context.studentProfile.projects?.length || 0}
- Certifications: ${context.studentProfile.certifications?.length || 0}
- Has Uploaded Resume: ${!!context.studentProfile.resume?.resumeUrl}
    `.trim()
    : "STUDENT PROFILE: Guest user / Profile not loaded yet.";

  const opportunitiesText = `
LIVE DATABASE JOBS:
${context.jobs
  .map(
    (j) =>
      `• ${j.title} at ${j.company} | Location: ${j.location} | CTC: ${j.salary} | Skills: ${j.skills.join(", ")}`
  )
  .join("\n") || "No immediate jobs matching."}

LIVE DATABASE INTERNSHIPS:
${context.internships
  .map(
    (i) =>
      `• ${i.title} at ${i.company} | Stipend: ${i.stipend} | Duration: ${i.duration} | Mode: ${i.workMode}`
  )
  .join("\n") || "No immediate internships matching."}

AVAILABLE COURSES:
${context.courses
  .map(
    (c) =>
      `• ${c.title} by ${c.provider} | Duration: ${c.duration} | Level: ${c.level} | Rating: ★${c.rating}`
  )
  .join("\n") || "No immediate courses matching."}
  `.trim();

  // Try Gemini API if available
  if (geminiModel) {
    try {
      const systemPrompt = `
You are the CareerConnect AI Assistant, an expert career advisor and live platform guide for students at Geeta University and job candidates.
You answer user questions using Retrieval-Augmented Generation (RAG) based on real database opportunities and candidate profiles.

Answer naturally, warmly, and concisely in English or Hinglish (depending on the user's query language).
Always give structured, actionable guidance. When recommending jobs, internships, or courses, reference the exact live opportunities retrieved below.

${profileText}

${opportunitiesText}
      `.trim();

      const chatHistory = conversationHistory.slice(-4).map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
      const fullPrompt = `${systemPrompt}\n\nRecent Chat:\n${chatHistory}\nUser: ${query}\nAI:`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), 8000)
      );
      const result = await Promise.race([geminiModel.generateContent(fullPrompt), timeoutPromise]);
      const answer = result?.response?.text();

      if (answer && answer.trim()) {
        return {
          success: true,
          answer: answer.trim(),
          suggestedCards,
          topic: context.topic,
        };
      }
    } catch (err) {
      console.warn("Gemini generation failed, falling back to local RAG engine:", err.message);
    }
  }

  // Intelligent Local RAG Domain Engine (Fallback)
  let fallbackAnswer = "";
  const qLower = query.toLowerCase();

  if (/resume|cv|critique|improve/i.test(qLower)) {
    const skills = context.studentProfile?.technicalSkills || [];
    const projs = context.studentProfile?.projects?.length || 0;
    fallbackAnswer = `### 📝 Resume & Profile Analysis

Aapke profile ke mutabiq:
- **Current Skills:** ${skills.length > 0 ? skills.join(", ") : "Abhi skills add nahi kiye gaye hain."}
- **Projects:** ${projs > 0 ? `${projs} Projects listed` : "Kam se kam 2 live web/mobile projects add karein."}

**Key Suggestions to Boost Shortlisting:**
1. **Add 5+ Core Technical Skills:** Industry recruitments me React, Node.js, SQL, aur Git sabse zyada demand me hain.
2. **Action-Oriented Bullets:** Har project me measurable impact likhein (jaise *"Engineered RESTful API reducing query latency by 30%"*).
3. **Verified Resume:** Sidebar me **Resume Builder** use karke ATS-friendly resume export karein.`;
  } else if (/intern|stipend/i.test(qLower)) {
    fallbackAnswer = `### 🎓 Recommended Internships for You

Aapke branch aur skills ke mutabiq sabse best live internships ye hain:

${context.internships
  .map(
    (i, idx) =>
      `**${idx + 1}. ${i.title}** at **${i.company}**  \n📍 ${i.location} (${i.workMode}) • 💵 Stipend: ${i.stipend} • ⏱ Duration: ${i.duration}`
  )
  .join("\n\n") || "Filhaal active internships discovery page par available hain."}

Neeche diye gaye card par click karke direct apply kar sakte hain!`;
  } else if (/job|salary|opening/i.test(qLower)) {
    fallbackAnswer = `### 💼 Top Jobs Matching Your Profile

Platform par yeh trending entry-level aur fresher openings active hain:

${context.jobs
  .map(
    (j, idx) =>
      `**${idx + 1}. ${j.title}** at **${j.company}**  \n📍 ${j.location} (${j.workMode}) • 💵 CTC: ${j.salary}`
  )
  .join("\n\n") || "Filhaal active jobs discovery page par available hain."}

Aap dashboard ya direct cards se 1-click apply kar sakte hain!`;
  } else if (/course|learn|skill/i.test(qLower)) {
    fallbackAnswer = `### 📚 Recommended Courses & Certifications

CareerConnect aur Geeta University ke verified certified courses:

${context.courses
  .map(
    (c, idx) =>
      `**${idx + 1}. ${c.title}** (${c.provider})  \n⏱ ${c.duration} • 📊 ${c.level} • ★ ${c.rating} • ${c.isFree ? "FREE Access" : "Certified"}`
  )
  .join("\n\n") || "Web development aur Python masterclass courses available hain."}

Inhe complete karke aap verified badges earn kar sakte hain!`;
  } else {
    fallbackAnswer = `### 🤖 CareerConnect Personal AI Assistant

Main aapki madad live platform data se kar sakta hoon:
- **Internships:** "Mere liye best internships kaunsi hain?"
- **Jobs:** "Latest software engineer jobs dikhao"
- **Resume Review:** "Mera resume analyze karke batao kya missing hai"
- **Courses:** "Full Stack seekhne ke liye kaunsa course karein?"

Aap bina kisi hichkichaahat ke mujhse kuch bhi pooch sakte hain!`;
  }

  return {
    success: true,
    answer: fallbackAnswer,
    suggestedCards,
    topic: context.topic,
  };
};

module.exports = {
  retrievePlatformContext,
  answerUserQuery,
};
