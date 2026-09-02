import ProfileCompletion from "./ProfileCompletion";

const ProfileHeader = ({ profile, onEdit }) => {
  const user = profile?.userId || {};
  const fullName = user?.fullName || profile?.fullName || "Student";
  const username = user?.username || profile?.username;
  const initial = fullName.charAt(0).toUpperCase();

  const education = profile?.education?.[0];
  const location = profile?.location?.city
    ? `${profile.location.city}${profile.location.state ? `, ${profile.location.state}` : ""}`
    : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-3xl flex items-center justify-center shadow-md shadow-blue-600/20">
              {initial}
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              {fullName}
            </h1>

            {username && (
              <p className="text-xs font-semibold text-blue-600">@{username}</p>
            )}

            {education && (
              <p className="text-xs text-slate-600 font-medium">
                {education.degree} {education.fieldOfStudy ? `• ${education.fieldOfStudy}` : ""}
              </p>
            )}

            {location && (
              <p className="text-xs text-slate-500">{location}</p>
            )}
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-center"
          >
            Edit Profile
          </button>
        )}
      </div>

      <ProfileCompletion percentage={profile?.profileCompletion || 0} />
    </div>
  );
};

export default ProfileHeader;