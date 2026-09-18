import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../config/firebase";

const GoogleAccountAvatar = ({ user }) => {
  const [firebasePhoto, setFirebasePhoto] = useState(auth.currentUser?.photoURL || "");
  const [failedUrls, setFailedUrls] = useState([]);
  const src = [firebasePhoto, user?.profileImage].find((url) => url && !failedUrls.includes(url));

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setFirebasePhoto(currentUser?.photoURL || "");
  }), []);

  if (src) {
    return (
      <img
        src={src}
        alt={user?.fullName || "Google account"}
        referrerPolicy="no-referrer"
        onError={() => setFailedUrls((urls) => [...urls, src])}
        className="w-10 h-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-10 h-10 shrink-0 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm" aria-label={user?.fullName || "Google account"}>
      {user?.fullName?.[0]?.toUpperCase() || "U"}
    </div>
  );
};

export default GoogleAccountAvatar;
