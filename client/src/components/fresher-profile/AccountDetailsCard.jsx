import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BadgeCheck, LoaderCircle, Pencil } from "lucide-react";
import { updateUserProfile } from "../../redux/features/authSlice";
import { getProfile, updateProfile } from "../../services/userService";
import EmailChangeModal from "./EmailChangeModal";
import { card, errorMessage, fieldError, input, linkButton, outlineButton, primaryButton } from "./profileUi";

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

// Name and email live on the account, not the fresher profile, so they save on their own.
const AccountDetailsCard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [emailVerified, setEmailVerified] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [notice, setNotice] = useState("");

  // The signed-in user in Redux doesn't carry isEmailVerified; the account record does.
  useEffect(() => {
    getProfile()
      .then((res) => setEmailVerified(Boolean(res?.user?.isEmailVerified)))
      .catch(() => {});
  }, []);

  const startEditing = () => {
    setNameInput(user?.fullName || "");
    setNameError("");
    setNotice("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setNameError("");
  };

  const saveName = async (e) => {
    e.preventDefault();
    const fullName = nameInput.trim().replace(/\s+/g, " ");
    if (!fullName) return setNameError("Name is required");
    if (fullName.length < 2 || fullName.length > 50) return setNameError("Name must be 2 to 50 characters");
    if (/[<>]/.test(fullName)) return setNameError("Name can only contain letters, spaces and punctuation");
    if (fullName === user?.fullName) return setEditing(false);

    setSavingName(true);
    setNameError("");
    try {
      const res = await updateProfile({ fullName });
      const saved = res.user;
      dispatch(updateUserProfile({ fullName: saved.fullName, firstName: saved.firstName, lastName: saved.lastName }));
      setEditing(false);
      setNotice("Name updated");
    } catch (err) {
      setNameError(errorMessage(err, "Failed to update name. Please try again."));
    } finally {
      setSavingName(false);
    }
  };

  const handleEmailChanged = (updatedUser) => {
    dispatch(updateUserProfile(updatedUser));
    setEmailVerified(true);
    setEditing(false);
    setNotice("Email updated");
  };

  const handleSignedInAgain = (authToken) => {
    if (authToken) localStorage.setItem("careerconnect_token", authToken);
  };

  return (
    <section className={`${card} mb-6`}>
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 shrink-0 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-semibold"
          aria-hidden="true"
        >
          {initialsOf(editing ? nameInput || user?.fullName : user?.fullName)}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={saveName} className="space-y-2">
              <label htmlFor="account-name" className="sr-only">Full name</label>
              <input
                id="account-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={50}
                autoFocus
                placeholder="Your full name"
                className={input(Boolean(nameError))}
              />
              {nameError && <p className={fieldError}>{nameError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={savingName} className={`${primaryButton} px-4 py-2 text-xs`}>
                  {savingName && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
                <button type="button" onClick={cancelEditing} disabled={savingName} className={`${outlineButton} px-4 py-2 text-xs`}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="font-semibold text-neutral-100 truncate">{user?.fullName || "—"}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="text-sm text-neutral-400 truncate">{user?.email}</span>
            {emailVerified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#5DCAA5]/15 text-[#5DCAA5] text-[11px] font-semibold">
                <BadgeCheck className="w-3 h-3" />
                Verified
              </span>
            )}
            {editing && (
              <button type="button" onClick={() => setEmailModalOpen(true)} className={`${linkButton} text-xs`}>
                Change email
              </button>
            )}
          </div>
          {notice && !editing && <p className="text-xs text-[#5DCAA5] mt-1.5">{notice}</p>}
        </div>

        {!editing && (
          <button type="button" onClick={startEditing} className={`${outlineButton} px-3 py-1.5 text-xs shrink-0`}>
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {emailModalOpen && (
        <EmailChangeModal
          currentEmail={user?.email}
          onClose={() => setEmailModalOpen(false)}
          onEmailChanged={handleEmailChanged}
          onSignedInAgain={handleSignedInAgain}
        />
      )}
    </section>
  );
};

export default AccountDetailsCard;
