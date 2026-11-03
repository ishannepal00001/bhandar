// Logo: The Bhandar mark, a download arrow dropping into a tray, drawn in the app's three colours; public/favicon.svg
//   is the same drawing with the colours written out.
function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <rect width="24" height="24" className="fill-primary dark:fill-night-primary" />
      <path
        d="M12 5v8.5M8 10l4 4 4-4"
        fill="none"
        strokeWidth="2"
        strokeLinecap="square"
        className="stroke-night-accent dark:stroke-accent"
      />
      <path
        d="M6 15.5V19h12v-3.5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="square"
        className="stroke-background dark:stroke-night-background"
      />
    </svg>
  )
}

export default Logo
