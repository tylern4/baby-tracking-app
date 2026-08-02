import type { SVGProps } from 'react'

interface DiaperIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

const DIAPER_BODY =
  'M17.8 4 V8 C17.8 9.5 18.1 11 18.4 12.5 C18.7 14 18.5 15.2 18.2 16.2 C18 16.9 17.6 17.8 17.2 18.7 C16.9 19.3 16.2 19.4 15.6 18.9 C15.1 18.5 14.5 18.1 14 17.6 C13.4 17 12.7 16.2 12 15.7 C11.3 16.2 10.6 17 10 17.6 C9.5 18.1 8.9 18.5 8.4 18.9 C7.8 19.4 7.1 19.3 6.8 18.7 C6.4 17.8 6 16.9 5.8 16.2 C5.5 15.2 5.3 14 5.6 12.5 C5.9 11 6.2 9.5 6.2 8 V4 Z'

export function DiaperIcon({ size = 16, ...props }: DiaperIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={DIAPER_BODY} />
      <path d="M6.6 6.2 H17.4" />
      <path d="M6.2 4.6 L4 5.8" />
      <path d="M17.8 4.6 L20 5.8" />
    </svg>
  )
}
