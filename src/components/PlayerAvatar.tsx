interface PlayerAvatarProps {
  name: string;
  imageUri?: string | null;
  size?: number;
}

export function PlayerAvatar({ name, imageUri, size = 44 }: PlayerAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (imageUri) {
    return (
      <img
        className="player-avatar"
        src={imageUri}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="player-avatar player-avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || '?'}
    </span>
  );
}
