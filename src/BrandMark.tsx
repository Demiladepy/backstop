type BrandMarkProps = {
  size?: number
  className?: string
  title?: string
}

/** Document-frame corners with a protective stop-bar (the backstop). */
export function BrandMark({
  size = 28,
  className = 'brand-mark',
  title = 'Backstop',
}: BrandMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" className="brand-mark-plate" />
      <path
        className="brand-mark-geometry"
        d="M7 7h9v2.25H9.25V16H7V7zm18 18h-9v-2.25h6.75V16H25v9zM12.25 19h7.5v2.15h-7.5z"
      />
    </svg>
  )
}
