import { useId } from 'react';

// A point star in the current text color: filled while the point is still available,
// outlined once spent, or half filled for a redemption's half point
export default function Star({
  size = 12,
  filled = true,
  half = false,
}: {
  size?: number;
  filled?: boolean;
  half?: boolean;
}) {
  // An id safe to use in url(#…), for the half fill's gradient
  const gradientId = `star-half-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const fill = half ? `url(#${gradientId})` : filled ? 'currentColor' : 'none';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {half && (
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z" />
    </svg>
  );
}
