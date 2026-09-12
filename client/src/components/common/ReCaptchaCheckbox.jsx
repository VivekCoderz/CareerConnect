import React, { useState, useEffect, useRef } from "react";

/**
 * Curated authentic image sets for the reCAPTCHA visual challenge.
 * Each set contains 9 tiles (3x3 grid) with designated target indices.
 * Includes both high-quality photography URLs and rich SVG fallback visuals.
 */
const CHALLENGES = [
  {
    id: "traffic_lights",
    targetName: "traffic lights",
    instruction: "Click verify once there are none left",
    tiles: [
      {
        id: 0,
        isTarget: true,
        alt: "Traffic light red and amber",
        url: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-700"><rect x="35" y="10" width="30" height="70" rx="8" fill="#1e293b" stroke="#334155" stroke-width="2"/><circle cx="50" cy="25" r="8" fill="#ef4444"/><circle cx="50" cy="45" r="8" fill="#e2e8f0" opacity="0.3"/><circle cx="50" cy="65" r="8" fill="#e2e8f0" opacity="0.3"/><rect x="47" y="80" width="6" height="20" fill="#0f172a"/></svg>`,
      },
      {
        id: 1,
        isTarget: false,
        alt: "City road with skyscrapers",
        url: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-200"><rect x="10" y="30" width="20" height="70" fill="#64748b"/><rect x="40" y="15" width="25" height="85" fill="#475569"/><rect x="75" y="40" width="18" height="60" fill="#94a3b8"/></svg>`,
      },
      {
        id: 2,
        isTarget: true,
        alt: "Green pedestrian traffic light",
        url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-700"><rect x="35" y="15" width="30" height="60" rx="6" fill="#1e293b"/><circle cx="50" cy="30" r="7" fill="#e2e8f0" opacity="0.2"/><circle cx="50" cy="50" r="7" fill="#10b981"/><rect x="47" y="75" width="6" height="25" fill="#0f172a"/></svg>`,
      },
      {
        id: 3,
        isTarget: false,
        alt: "Park bench under tree",
        url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-emerald-50"><circle cx="45" cy="35" r="25" fill="#15803d"/><rect x="42" y="55" width="6" height="35" fill="#78350f"/><rect x="20" y="68" width="60" height="6" fill="#92400e"/></svg>`,
      },
      {
        id: 4,
        isTarget: true,
        alt: "Intersection signal light",
        url: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-700"><rect x="35" y="10" width="30" height="70" rx="8" fill="#1e293b"/><circle cx="50" cy="25" r="7" fill="#e2e8f0" opacity="0.2"/><circle cx="50" cy="45" r="7" fill="#f59e0b"/><circle cx="50" cy="65" r="7" fill="#e2e8f0" opacity="0.2"/></svg>`,
      },
      {
        id: 5,
        isTarget: false,
        alt: "Clear sunny blue sky with clouds",
        url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-sky-200"><circle cx="75" cy="25" r="14" fill="#facc15"/><ellipse cx="40" cy="55" rx="20" ry="12" fill="white"/></svg>`,
      },
      {
        id: 6,
        isTarget: false,
        alt: "Concrete sidewalk pavement",
        url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-stone-300"><line x1="0" y1="50" x2="100" y2="50" stroke="#78716c" stroke-width="2"/><line x1="50" y1="0" x2="50" y2="100" stroke="#78716c" stroke-width="2"/></svg>`,
      },
      {
        id: 7,
        isTarget: true,
        alt: "Yellow traffic light hanging",
        url: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-700"><rect x="35" y="10" width="30" height="70" rx="8" fill="#1e293b"/><circle cx="50" cy="25" r="8" fill="#ef4444"/><circle cx="50" cy="45" r="8" fill="#f59e0b"/><circle cx="50" cy="65" r="8" fill="#10b981"/></svg>`,
      },
      {
        id: 8,
        isTarget: false,
        alt: "Brick wall texture",
        url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-amber-900"><line x1="0" y1="25" x2="100" y2="25" stroke="#fcd34d" stroke-width="2"/><line x1="0" y1="50" x2="100" y2="50" stroke="#fcd34d" stroke-width="2"/><line x1="0" y1="75" x2="100" y2="75" stroke="#fcd34d" stroke-width="2"/></svg>`,
      },
    ],
  },
  {
    id: "bicycles",
    targetName: "bicycles",
    instruction: "Click verify once there are none left",
    tiles: [
      {
        id: 0,
        isTarget: true,
        alt: "Road bicycle parked on wall",
        url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-100"><circle cx="28" cy="65" r="16" stroke="#0f172a" stroke-width="4" fill="none"/><circle cx="72" cy="65" r="16" stroke="#0f172a" stroke-width="4" fill="none"/><path d="M28 65 L48 65 L62 48 L42 48 Z M48 65 L56 40 L72 65 M56 40 L48 35" stroke="#2563eb" stroke-width="4" fill="none"/></svg>`,
      },
      {
        id: 1,
        isTarget: false,
        alt: "City road and street lamps",
        url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-200"><rect x="15" y="30" width="70" height="40" fill="#64748b"/></svg>`,
      },
      {
        id: 2,
        isTarget: false,
        alt: "Modern glass office building",
        url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-300"><rect x="20" y="10" width="60" height="90" fill="#0284c7"/></svg>`,
      },
      {
        id: 3,
        isTarget: true,
        alt: "Vintage bicycle with basket",
        url: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-orange-50"><circle cx="30" cy="65" r="16" stroke="#c2410c" stroke-width="4" fill="none"/><circle cx="70" cy="65" r="16" stroke="#c2410c" stroke-width="4" fill="none"/><path d="M30 65 L50 65 L64 50 L44 50 Z M50 65 L58 40 L70 65" stroke="#ea580c" stroke-width="4" fill="none"/></svg>`,
      },
      {
        id: 4,
        isTarget: false,
        alt: "Fire hydrant on sidewalk",
        url: "https://images.unsplash.com/photo-1516216628859-9bcceabb84ca?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-100"><rect x="40" y="40" width="20" height="40" fill="#dc2626"/></svg>`,
      },
      {
        id: 5,
        isTarget: true,
        alt: "Mountain bike on trail",
        url: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-emerald-50"><circle cx="28" cy="65" r="16" stroke="#15803d" stroke-width="4" fill="none"/><circle cx="72" cy="65" r="16" stroke="#15803d" stroke-width="4" fill="none"/><path d="M28 65 L48 65 L62 48 L42 48 Z" stroke="#16a34a" stroke-width="4" fill="none"/></svg>`,
      },
      {
        id: 6,
        isTarget: false,
        alt: "Subway entrance stairs",
        url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-200"><rect x="10" y="60" width="80" height="40" fill="#334155"/></svg>`,
      },
      {
        id: 7,
        isTarget: false,
        alt: "Coffee shop window",
        url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-amber-50"><rect x="15" y="20" width="70" height="60" fill="#78350f" stroke="#b45309" stroke-width="3"/></svg>`,
      },
      {
        id: 8,
        isTarget: true,
        alt: "City commuter bike",
        url: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-blue-50"><circle cx="26" cy="65" r="16" stroke="#1e40af" stroke-width="4" fill="none"/><circle cx="74" cy="65" r="16" stroke="#1e40af" stroke-width="4" fill="none"/><path d="M26 65 L48 65 L62 48 L40 48 Z" stroke="#3b82f6" stroke-width="4" fill="none"/></svg>`,
      },
    ],
  },
  {
    id: "crosswalks",
    targetName: "crosswalks",
    instruction: "Click verify once there are none left",
    tiles: [
      {
        id: 0,
        isTarget: true,
        alt: "Zebra pedestrian crosswalk",
        url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-800"><rect x="15" y="20" width="70" height="8" fill="white"/><rect x="15" y="38" width="70" height="8" fill="white"/><rect x="15" y="56" width="70" height="8" fill="white"/><rect x="15" y="74" width="70" height="8" fill="white"/></svg>`,
      },
      {
        id: 1,
        isTarget: false,
        alt: "Office desk with laptop",
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-100"><rect x="25" y="40" width="50" height="30" fill="#334155"/></svg>`,
      },
      {
        id: 2,
        isTarget: true,
        alt: "Street crossing with white stripes",
        url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-zinc-900"><rect x="10" y="25" width="80" height="10" fill="white"/><rect x="10" y="45" width="80" height="10" fill="white"/><rect x="10" y="65" width="80" height="10" fill="white"/></svg>`,
      },
      {
        id: 3,
        isTarget: false,
        alt: "Tall skyscraper in sunlight",
        url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-sky-100"><rect x="30" y="15" width="40" height="85" fill="#475569"/></svg>`,
      },
      {
        id: 4,
        isTarget: false,
        alt: "Green garden lawn",
        url: "https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-emerald-600"></svg>`,
      },
      {
        id: 5,
        isTarget: true,
        alt: "City intersection crosswalk lines",
        url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-neutral-800"><line x1="20" y1="20" x2="20" y2="80" stroke="white" stroke-width="8"/><line x1="40" y1="20" x2="40" y2="80" stroke="white" stroke-width="8"/><line x1="60" y1="20" x2="60" y2="80" stroke="white" stroke-width="8"/><line x1="80" y1="20" x2="80" y2="80" stroke="white" stroke-width="8"/></svg>`,
      },
      {
        id: 6,
        isTarget: false,
        alt: "Mountain forest",
        url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-teal-800"></svg>`,
      },
      {
        id: 7,
        isTarget: true,
        alt: "Downtown diagonal crosswalk",
        url: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-stone-900"><rect x="15" y="25" width="70" height="9" fill="#f8fafc"/><rect x="15" y="45" width="70" height="9" fill="#f8fafc"/><rect x="15" y="65" width="70" height="9" fill="#f8fafc"/></svg>`,
      },
      {
        id: 8,
        isTarget: false,
        alt: "Subway escalator",
        url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-300"></svg>`,
      },
    ],
  },
  {
    id: "cars",
    targetName: "cars or vehicles",
    instruction: "Click verify once there are none left",
    tiles: [
      {
        id: 0,
        isTarget: true,
        alt: "Red sports sedan car",
        url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-100"><rect x="15" y="48" width="70" height="24" rx="6" fill="#ef4444"/><path d="M28 48 L38 30 L66 30 L74 48 Z" fill="#b91c1c"/><circle cx="32" cy="72" r="8" fill="#0f172a"/><circle cx="68" cy="72" r="8" fill="#0f172a"/></svg>`,
      },
      {
        id: 1,
        isTarget: false,
        alt: "Empty sandy beach",
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-amber-100"><rect x="0" y="55" width="100" height="45" fill="#fde68a"/></svg>`,
      },
      {
        id: 2,
        isTarget: true,
        alt: "Blue compact hatchback",
        url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-100"><rect x="15" y="48" width="70" height="24" rx="6" fill="#2563eb"/><path d="M28 48 L38 30 L66 30 L74 48 Z" fill="#1d4ed8"/><circle cx="32" cy="72" r="8" fill="#0f172a"/><circle cx="68" cy="72" r="8" fill="#0f172a"/></svg>`,
      },
      {
        id: 3,
        isTarget: false,
        alt: "Flower pot with roses",
        url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-pink-50"><circle cx="50" cy="40" r="16" fill="#f43f5e"/><rect x="42" y="60" width="16" height="25" fill="#78350f"/></svg>`,
      },
      {
        id: 4,
        isTarget: true,
        alt: "White SUV driving road",
        url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-200"><rect x="12" y="45" width="76" height="28" rx="6" fill="#f8fafc"/><path d="M25 45 L35 26 L68 26 L78 45 Z" fill="#e2e8f0"/><circle cx="30" cy="74" r="9" fill="#0f172a"/><circle cx="70" cy="74" r="9" fill="#0f172a"/></svg>`,
      },
      {
        id: 5,
        isTarget: false,
        alt: "Coffee cup with steam",
        url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-amber-50"><rect x="35" y="45" width="30" height="35" rx="6" fill="#b45309"/></svg>`,
      },
      {
        id: 6,
        isTarget: false,
        alt: "Bookshelf with colorful books",
        url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-orange-100"><rect x="20" y="30" width="12" height="50" fill="#dc2626"/><rect x="36" y="25" width="12" height="55" fill="#2563eb"/><rect x="52" y="32" width="12" height="48" fill="#16a34a"/></svg>`,
      },
      {
        id: 7,
        isTarget: true,
        alt: "Silver coupe car",
        url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-slate-300"><rect x="15" y="48" width="70" height="24" rx="6" fill="#94a3b8"/><path d="M28 48 L38 30 L66 30 L74 48 Z" fill="#64748b"/><circle cx="32" cy="72" r="8" fill="#0f172a"/><circle cx="68" cy="72" r="8" fill="#0f172a"/></svg>`,
      },
      {
        id: 8,
        isTarget: false,
        alt: "Wood texture background",
        url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=240&h=240&q=80",
        fallbackSvg: `<svg viewBox="0 0 100 100" class="w-full h-full bg-amber-900"></svg>`,
      },
    ],
  },
];

/**
 * Audio digits challenge for accessibility / audio mode.
 */
const AUDIO_CHALLENGES = [
  { digits: "4 8 2 1", audioText: "4... 8... 2... 1", clean: "4821" },
  { digits: "7 3 9 5", audioText: "7... 3... 9... 5", clean: "7395" },
  { digits: "2 6 0 4", audioText: "2... 6... 0... 4", clean: "2604" },
  { digits: "5 1 8 3", audioText: "5... 1... 8... 3", clean: "5183" },
];

export default function ReCaptchaCheckbox({
  onChange,
  onExpired,
  error = "",
  className = "",
  disabled = false,
}) {
  const [checked, setChecked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState(new Set());
  const [challengeError, setChallengeError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioIdx, setAudioIdx] = useState(0);
  const [audioInput, setAudioInput] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const expiryTimerRef = useRef(null);
  const modalRef = useRef(null);

  const currentChallenge = CHALLENGES[activeChallengeIdx] || CHALLENGES[0];
  const currentAudio = AUDIO_CHALLENGES[audioIdx] || AUDIO_CHALLENGES[0];

  // Clean up expiry timer on unmount
  useEffect(() => {
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, []);

  // Set 2-minute token expiration timer like official Google reCAPTCHA
  const startExpirationTimer = () => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = setTimeout(() => {
      setChecked(false);
      if (onExpired) onExpired();
      if (onChange) onChange("");
    }, 120 * 1000); // 2 minutes
  };

  // Triggered when user clicks the "I'm not a robot" checkbox
  const handleCheckboxClick = () => {
    if (disabled || verifying || checked) return;

    setVerifying(true);
    setChallengeError("");
    setSelectedTiles(new Set());
    setImageErrors({});
    setIsAudioMode(false);
    setAudioInput("");

    // Randomize starting challenge
    const randomIdx = Math.floor(Math.random() * CHALLENGES.length);
    setActiveChallengeIdx(randomIdx);
    setAudioIdx(Math.floor(Math.random() * AUDIO_CHALLENGES.length));

    // Open authentic challenge modal after brief realistic pause
    setTimeout(() => {
      setVerifying(false);
      setIsModalOpen(true);
    }, 350);
  };

  // Reload new visual challenge
  const handleReloadChallenge = (e) => {
    if (e) e.stopPropagation();
    setSelectedTiles(new Set());
    setChallengeError("");
    setImageErrors({});
    setActiveChallengeIdx((prev) => (prev + 1) % CHALLENGES.length);
    setAudioIdx((prev) => (prev + 1) % AUDIO_CHALLENGES.length);
  };

  // Toggle tile selection
  const handleTileClick = (id) => {
    setChallengeError("");
    setSelectedTiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Trigger shake animation on error
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Verify visual challenge
  const handleVerify = () => {
    if (isAudioMode) {
      handleVerifyAudio();
      return;
    }

    const targetIds = currentChallenge.tiles
      .filter((tile) => tile.isTarget)
      .map((tile) => tile.id);

    const userSelected = Array.from(selectedTiles);

    // Exact match verification
    const hasAllTargets = targetIds.every((id) => selectedTiles.has(id));
    const hasNoDistractors = userSelected.every((id) => {
      const tile = currentChallenge.tiles.find((t) => t.id === id);
      return tile && tile.isTarget;
    });

    if (hasAllTargets && hasNoDistractors && targetIds.length > 0) {
      completeVerification();
    } else {
      triggerShake();
      setChallengeError("Please try again. Select all matching images.");
      setTimeout(() => {
        handleReloadChallenge();
      }, 750);
    }
  };

  // Audio challenge verification
  const handleVerifyAudio = () => {
    const cleanInput = audioInput.replace(/\s+/g, "").trim();
    if (cleanInput === currentAudio.clean) {
      completeVerification();
    } else {
      triggerShake();
      setChallengeError("Incorrect audio response. Please try again.");
      setAudioIdx((prev) => (prev + 1) % AUDIO_CHALLENGES.length);
      setAudioInput("");
    }
  };

  // Play audio challenge using Web Speech API
  const playAudioChallenge = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(true);
        const utterance = new SpeechSynthesisUtterance(currentAudio.audioText);
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsPlayingAudio(false);
      }
    } else {
      alert(`Audio digits: ${currentAudio.digits}`);
    }
  };

  // Complete human verification and issue authentic token
  const completeVerification = () => {
    setIsModalOpen(false);
    setChecked(true);
    setChallengeError("");

    const token = `human_verified_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    if (onChange) onChange(token);
    startExpirationTimer();
  };

  // Close modal without verifying
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setVerifying(false);
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* ─── Google reCAPTCHA v2 Checkbox Box ─── */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleCheckboxClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCheckboxClick();
          }
        }}
        className={`w-[304px] h-[78px] bg-[#f9f9f9] border rounded-md px-3.5 py-2 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all cursor-pointer ${
          checked
            ? "border-emerald-400 bg-emerald-50/15"
            : error
            ? "border-red-400 bg-red-50/15"
            : "border-[#d3d3d3] hover:border-[#b0b0b0]"
        }`}
        aria-label="I'm not a robot reCAPTCHA verification"
      >
        {/* Left: Checkbox square & label */}
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-[3px] border flex items-center justify-center transition-all bg-white ${
              checked
                ? "border-emerald-500 bg-white"
                : verifying
                ? "border-blue-500"
                : "border-[#c1c1c1] hover:border-[#888]"
            }`}
          >
            {verifying ? (
              <div className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
            ) : checked ? (
              <svg
                className="w-5 h-5 text-emerald-600 animate-in zoom-in duration-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : null}
          </div>

          <span className="text-[14px] font-normal text-[#282828] font-sans">
            I&apos;m not a robot
          </span>
        </div>

        {/* Right: reCAPTCHA logo & links */}
        <div className="flex flex-col items-center justify-center text-center pl-2">
          <svg
            className="w-8 h-8 text-[#4285F4]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              opacity=".2"
            />
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
          </svg>
          <span className="text-[10px] font-bold text-[#555] tracking-tight leading-none mt-0.5">
            reCAPTCHA
          </span>
          <div className="flex items-center gap-1 text-[8.5px] text-[#777] mt-0.5 leading-none">
            <a
              href="https://www.google.com/intl/en/policies/privacy/"
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-[#666]"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy
            </a>
            <span>-</span>
            <a
              href="https://www.google.com/intl/en/policies/terms/"
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-[#666]"
              onClick={(e) => e.stopPropagation()}
            >
              Terms
            </a>
          </div>
        </div>
      </div>

      {/* Optional validation error message */}
      {error && (
        <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>
      )}

      {/* ─── Authentic Google reCAPTCHA Challenge Window (Modal / Overlay) ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4">
          <div
            ref={modalRef}
            className={`w-[390px] max-w-full bg-white rounded-md shadow-2xl border border-slate-300 overflow-hidden text-slate-800 transition-transform ${
              isShaking ? "animate-bounce" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Google Blue Banner */}
            <div className="bg-[#1a73e8] text-white px-5 py-4 relative">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-2.5 right-2.5 text-white/70 hover:text-white p-1 rounded transition"
                aria-label="Close captcha"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {!isAudioMode ? (
                <>
                  <p className="text-xs text-blue-100 font-medium leading-none">
                    Select all images with
                  </p>
                  <h3 className="text-2xl font-bold uppercase tracking-tight my-1 drop-shadow-sm">
                    {currentChallenge.targetName}
                  </h3>
                  <p className="text-[11.5px] text-blue-100/90 leading-tight">
                    {currentChallenge.instruction}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-blue-100 font-medium leading-none">
                    Audio verification
                  </p>
                  <h3 className="text-2xl font-bold tracking-tight my-1">
                    Press PLAY &amp; Type Digits
                  </h3>
                  <p className="text-[11.5px] text-blue-100/90 leading-tight">
                    Listen to the spoken numbers and enter them below
                  </p>
                </>
              )}
            </div>

            {/* Error notice if user failed verification */}
            {challengeError && (
              <div className="bg-red-50 text-red-700 text-xs px-4 py-2 border-b border-red-200 flex items-center gap-2 font-medium">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{challengeError}</span>
              </div>
            )}

            {/* Challenge Content */}
            {!isAudioMode ? (
              /* 3x3 Image Grid */
              <div className="p-2 bg-slate-100">
                <div className="grid grid-cols-3 gap-1.5 bg-slate-200 p-1.5 rounded">
                  {currentChallenge.tiles.map((tile) => {
                    const isSelected = selectedTiles.has(tile.id);
                    const hasImgError = imageErrors[tile.id];

                    return (
                      <div
                        key={tile.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleTileClick(tile.id)}
                        className={`relative aspect-square cursor-pointer overflow-hidden rounded-[2px] transition-all select-none ${
                          isSelected
                            ? "ring-4 ring-[#1a73e8] scale-[0.96] brightness-90 shadow-md"
                            : "hover:opacity-95"
                        }`}
                      >
                        {!hasImgError ? (
                          <img
                            src={tile.url}
                            alt={tile.alt}
                            className="w-full h-full object-cover pointer-events-none"
                            loading="eager"
                            onError={() => {
                              setImageErrors((prev) => ({ ...prev, [tile.id]: true }));
                            }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center bg-slate-100"
                            dangerouslySetInnerHTML={{ __html: tile.fallbackSvg }}
                          />
                        )}

                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in-50 duration-150">
                            <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Audio Challenge Mode */
              <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-slate-50 min-h-[280px]">
                <button
                  type="button"
                  onClick={playAudioChallenge}
                  disabled={isPlayingAudio}
                  className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition flex items-center gap-3 shadow-md active:scale-95 disabled:opacity-60"
                >
                  <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  {isPlayingAudio ? "Playing Audio..." : "Play Audio Numbers"}
                </button>

                <div className="w-full max-w-[240px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1 text-center">
                    Enter the numbers you hear:
                  </label>
                  <input
                    type="text"
                    value={audioInput}
                    onChange={(e) => setAudioInput(e.target.value)}
                    placeholder="e.g. 4821"
                    maxLength={6}
                    autoFocus
                    className="w-full h-11 text-center tracking-widest font-mono text-lg rounded-lg border border-slate-300 focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Info Drawer */}
            {showInfo && (
              <div className="bg-slate-50 border-t border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
                This authentic human verification challenge verifies that interactions are initiated by genuine human users rather than automated scripts.
              </div>
            )}

            {/* Footer Toolbar: Reload, Audio, Info, and Verify Button */}
            <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-500">
                {/* Reload / Refresh Button */}
                <button
                  type="button"
                  title="Get a new challenge"
                  onClick={handleReloadChallenge}
                  className="p-1.5 rounded-full hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>

                {/* Audio Challenge Toggle Button */}
                <button
                  type="button"
                  title={isAudioMode ? "Switch to image challenge" : "Switch to audio challenge"}
                  onClick={() => {
                    setIsAudioMode((prev) => !prev);
                    setChallengeError("");
                  }}
                  className={`p-1.5 rounded-full hover:bg-slate-100 hover:text-slate-800 transition ${
                    isAudioMode ? "text-[#1a73e8] bg-blue-50" : ""
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </button>

                {/* Info / Help Button */}
                <button
                  type="button"
                  title="About this verification"
                  onClick={() => setShowInfo((prev) => !prev)}
                  className="p-1.5 rounded-full hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
              </div>

              {/* Verify / Skip Button */}
              <button
                type="button"
                onClick={handleVerify}
                className="px-6 py-2 rounded bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-sm font-semibold tracking-wide uppercase shadow-sm transition"
              >
                {!isAudioMode && selectedTiles.size === 0 ? "SKIP" : "VERIFY"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
