// Unread notification count on a sidebar's Notifications item. Sits at the end of the row,
// or on the icon's corner when the sidebar is collapsed. The parent button must be `relative`.
const UnreadBadge = ({ count = 0, collapsed = false, active = false }) => {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
        collapsed ? "absolute top-1 right-1" : "ml-auto"
      } ${active ? "bg-white text-slate-900" : "bg-rose-600 text-white"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
};

export default UnreadBadge;
