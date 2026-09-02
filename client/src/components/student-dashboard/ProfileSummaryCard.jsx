import { Link } from "react-router-dom";

const ProfileSummaryCard = ({ user, profile }) => {
  const studentName = user?.fullName || profile?.userId?.fullName || "Student";
  const username = user?.username || profile?.userId?.username;
  const email = user?.email || profile?.userId?.email;
  const phone = user?.phone || profile?.userId?.phone;
  const profileImage = user?.profileImage || profile?.userId?.profileImage;
  const initial = studentName.charAt(0).toUpperCase();

  const primaryEducation = profile?.education?.[0] || {
    institution: "Geeta University",
    degree: "B.Tech",
    fieldOfStudy: "Computer Science",
    startYear: 2024,
    endYear: 2028,
  };

  const location = profile?.location?.city
    ? `${profile.location.city}${profile.location.state ? `, ${profile.location.state}` : ""}`
    : "India";
  const careerGoal = profile?.careerGoal || "Full Stack Developer";
  const bio = profile?.bio || "Enthusiastic Computer Science student passionate about building modern web applications.";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {profileImage ? (
            <img
              src={profileImage}
              alt={studentName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-600/20">
              {initial}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{studentName}</h2>
            {username && <p className="text-xs text-blue-600 font-medium">@{username}</p>}
            <p className="text-xs text-slate-500 mt-0.5">{location}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/student/profile"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            View Profile
          </Link>
          <Link
            to="/student/profile"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-100 text-xs">
        <div>
          <span className="text-slate-400 font-medium block mb-1">College & Degree</span>
          <p className="font-semibold text-slate-800">{primaryEducation.institution}</p>
          <p className="text-slate-600">{primaryEducation.degree} {primaryEducation.fieldOfStudy ? `• ${primaryEducation.fieldOfStudy}` : ""}</p>
        </div>

        <div>
          <span className="text-slate-400 font-medium block mb-1">Career Goal / Target Role</span>
          <p className="font-semibold text-blue-600 bg-blue-50/80 inline-block px-2.5 py-1 rounded-lg border border-blue-100">
            🎯 {careerGoal}
          </p>
        </div>

        <div>
          <span className="text-slate-400 font-medium block mb-1">Graduation Year</span>
          <p className="font-semibold text-slate-800">{primaryEducation.endYear || "2028"}</p>
        </div>

        <div>
          <span className="text-slate-400 font-medium block mb-1">Contact</span>
          <p className="text-slate-700">{email || "Not provided"}</p>
          {phone && <p className="text-slate-500 mt-0.5">{phone}</p>}
        </div>
      </div>

      {/* Bio */}
      <div className="pt-4">
        <span className="text-slate-400 text-xs font-medium block mb-1">Bio</span>
        <p className="text-xs text-slate-600 leading-relaxed">{bio}</p>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
