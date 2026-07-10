interface LogoProps {
  variant?: 'light' | 'dark';
  size?: number;
}

export default function Logo({ variant = 'light', size = 26 }: LogoProps) {
  const ringColor = variant === 'dark' ? '#3FD6CE' : '#0EA5A0';
  const textColor = variant === 'dark' ? '#FFFFFF' : '#131A2B';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="12" fill="none" stroke={ringColor} strokeWidth="1.5" opacity="0.35" />
        <circle cx="14" cy="14" r="8" fill="none" stroke={ringColor} strokeWidth="1.5" opacity="0.65" />
        <circle cx="14" cy="14" r="3.5" fill={ringColor} />
      </svg>
      <span
        className="font-display font-bold"
        style={{ color: textColor, fontSize: size < 22 ? 14 : 18 }}
      >
        SmartAttend
      </span>
    </div>
  );
}