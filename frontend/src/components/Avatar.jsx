export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function Avatar({ user, size = 32, title }) {
  if (!user) return null;
  return (
    <span
      className="avatar"
      title={title ?? user.name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: user.avatar_color }}
    >
      {initials(user.name)}
    </span>
  );
}
