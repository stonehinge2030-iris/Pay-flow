// Small, hand-picked icon set as inline SVG components — keeps the bundle
// dependency-free while still giving the interface some visual polish.

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SendIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

export function BankIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 21h18" />
      <path d="M4 10h16" />
      <path d="M12 3 2 10h20L12 3Z" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
    </svg>
  );
}

export function ArrowUpRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function ArrowDownLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M17 7 7 17" />
      <path d="M16 17H7V8" />
    </svg>
  );
}

export function CardIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function HomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

export function ListIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 5-5" />
    </svg>
  );
}
