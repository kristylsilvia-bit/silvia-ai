import type { SVGProps } from "react";

/*
 * Inline icon set ported from the prototype. Each is a bare SVG so stylesheet
 * rules can size them exactly as designed.
 */

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SparkIcon({ opacity, ...props }: IconProps & { opacity?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2.5l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.4 6.4 19.6l1.4-6.3L3 9l6.4-.6L12 2.5z"
        fill="#fff"
        opacity={opacity}
      />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} strokeLinejoin={undefined} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} strokeLinejoin={undefined} {...props}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

export function CollapseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

export function CpuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
      <path d="M19.4 15a1.8 1.8 0 00.36 2l.06.06a2.2 2.2 0 01-3.11 3.11l-.06-.06a1.8 1.8 0 00-2-.36 1.8 1.8 0 00-1.1 1.65V21.5a2.2 2.2 0 01-4.4 0v-.09a1.8 1.8 0 00-1.1-1.65 1.8 1.8 0 00-2 .36l-.06.06a2.2 2.2 0 01-3.11-3.11l.06-.06a1.8 1.8 0 00.36-2 1.8 1.8 0 00-1.65-1.1H1.5a2.2 2.2 0 010-4.4h.09a1.8 1.8 0 001.65-1.1 1.8 1.8 0 00-.36-2l-.06-.06a2.2 2.2 0 013.11-3.11l.06.06a1.8 1.8 0 002 .36h.02a1.8 1.8 0 001.08-1.65V2.5a2.2 2.2 0 014.4 0v.09a1.8 1.8 0 001.1 1.65 1.8 1.8 0 002-.36l.06-.06a2.2 2.2 0 013.11 3.11l-.06.06a1.8 1.8 0 00-.36 2v.02a1.8 1.8 0 001.65 1.08h.09a2.2 2.2 0 010 4.4h-.09A1.8 1.8 0 0019.4 15z" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} strokeLinejoin={undefined} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4} {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M21 12a9 9 0 11-2.64-6.36" />
      <path d="M21 4v6h-6" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8} {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} strokeLinejoin={undefined} {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8} {...props}>
      <path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-4-.9L3 21l1.9-4.9A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M4 8a2 2 0 012-2h2.2l1.4-2h4.8l1.4 2H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  );
}

export function PenIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

export function DocIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  );
}

export function PaperclipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M21.4 11.1l-9.2 9.2a5 5 0 01-7.1-7.1l9.2-9.2a3.3 3.3 0 014.7 4.7l-9.2 9.2a1.7 1.7 0 01-2.4-2.4l8.5-8.5" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.1} {...props}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2} strokeLinejoin={undefined} {...props}>
      <path d="M12 8v5M12 16.5v.5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/** Animated-friendly waveform: bars are styled/animated via CSS. */
export function WaveformIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect className="wf-bar wf-1" x="3" y="9" width="2.6" height="6" rx="1.3" />
      <rect className="wf-bar wf-2" x="8.2" y="5" width="2.6" height="14" rx="1.3" />
      <rect className="wf-bar wf-3" x="13.4" y="7" width="2.6" height="10" rx="1.3" />
      <rect className="wf-bar wf-4" x="18.6" y="10" width="2.6" height="4" rx="1.3" />
    </svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M9 9v3a3 3 0 005.1 2.1M15 9.3V6a3 3 0 00-5.6-1.5" />
      <path d="M5 11a7 7 0 0010.6 6M19 11a7 7 0 01-.6 2.8M12 18v3M8 21h8" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function PhoneEndIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 9.5c-3.6 0-6.9 1.1-9.5 3a2 2 0 00-.6 2.6l1 1.8a1.6 1.6 0 002 .7l2.8-1.1a1.6 1.6 0 001-1.5v-1.3a13.5 13.5 0 016.6 0v1.3c0 .67.4 1.27 1 1.5l2.8 1.1a1.6 1.6 0 002-.7l1-1.8a2 2 0 00-.6-2.6c-2.6-1.9-5.9-3-9.5-3z" />
    </svg>
  );
}

export function TranscriptIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M12 17v5M7 4h10l-1.2 6.2 2.7 3.3a1 1 0 01-.8 1.5H6.3a1 1 0 01-.8-1.5l2.7-3.3z" />
    </svg>
  );
}

export function PinFilledIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 17v5M7 4h10l-1.2 6.2 2.7 3.3a1 1 0 01-.8 1.5H6.3a1 1 0 01-.8-1.5l2.7-3.3z" />
    </svg>
  );
}

export function CloudCheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M17.5 18.5h-11a4.5 4.5 0 01-.4-9A6 6 0 0118 8.7a4.9 4.9 0 01-.5 9.8z" />
      <path d="M9 13.5l2.2 2.2 4-4.2" />
    </svg>
  );
}

export function CloudOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M17.5 18.5h-11a4.5 4.5 0 01-1.7-8.7M9.3 5.4A6 6 0 0118 8.7a4.9 4.9 0 012.8 8.3" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function CloudSyncIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} {...props}>
      <path d="M17.5 18.5h-11a4.5 4.5 0 01-.4-9A6 6 0 0118 8.7a4.9 4.9 0 01-.5 9.8z" />
      <path d="M9.5 13.5a2.6 2.6 0 014.9-.9M14.5 15.5a2.6 2.6 0 01-4.9.9" />
    </svg>
  );
}

export function VoiceBadgeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="4" y="9.5" width="2.4" height="5" rx="1.2" />
      <rect x="8.4" y="6.5" width="2.4" height="11" rx="1.2" />
      <rect x="12.8" y="4" width="2.4" height="16" rx="1.2" />
      <rect x="17.2" y="8" width="2.4" height="8" rx="1.2" />
    </svg>
  );
}
