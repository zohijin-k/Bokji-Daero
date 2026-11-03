export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="10" fill="var(--brand)" />
        <path
          d="M9 24c0-5 4-6 7-6s7-1 7-6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="0.1 5.5"
        />
        <circle cx="9" cy="24" r="2.6" fill="#ffffff" />
        <path d="M23 6v8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <path d="M23 6.5h5l-1.5 2 1.5 2h-5z" fill="#ffd37a" />
      </svg>
      <span className="text-[20px] font-extrabold tracking-tight text-ink">복지대로</span>
    </span>
  );
}

/** 지도 핀 모양의 안내 마스코트 */
export function Mascot({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="59" rx="13" ry="3" fill="#17212b" opacity="0.12" />
      <path
        d="M32 6c-11.6 0-20 8.4-20 19.4C12 39 32 56 32 56s20-17 20-30.6C52 14.4 43.6 6 32 6z"
        fill="#2ec4a0"
      />
      <path d="M32 6c-11.6 0-20 8.4-20 19.4 0 2 .4 4 1.2 6C16 22 23 14 34 14c7 0 12 3 15.4 7.4C47.6 12.6 40.6 6 32 6z" fill="#5ad8b9" />
      <circle cx="25.5" cy="25" r="3" fill="#17212b" />
      <circle cx="38.5" cy="25" r="3" fill="#17212b" />
      <circle cx="26.4" cy="24" r="1" fill="#ffffff" />
      <circle cx="39.4" cy="24" r="1" fill="#ffffff" />
      <ellipse cx="21" cy="31" rx="3" ry="2" fill="#ff9e9e" opacity="0.7" />
      <ellipse cx="43" cy="31" rx="3" ry="2" fill="#ff9e9e" opacity="0.7" />
      <path d="M28 31.5c2.2 2.4 5.8 2.4 8 0" fill="none" stroke="#17212b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M50 30l6-10" stroke="#17212b" strokeWidth="2" strokeLinecap="round" />
      <path d="M56 20l-7-2.5 2.6-4.8z" fill="#f7931e" />
    </svg>
  );
}
