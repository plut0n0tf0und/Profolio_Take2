import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={cn('text-primary', props.className)}
    >
      <circle cx="12" cy="12" r="10" className="text-primary" fill="currentColor" />
      <g className="text-primary-foreground" fill="currentColor" stroke="none">
        <path d="M11.2 8.5h2.4v7h-2.4v-7zm0 1.5v2.25h.9V8.5h-.9v1.5z" />
      </g>
    </svg>
  );
}