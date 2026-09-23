// The app's single signature visual motif: a current-like flowing line,
// standing in for money moving between people. Used deliberately in just
// two places (the balance card, the auth screen) rather than as ambient
// decoration throughout — see styles.css for how opacity/color is set per
// context.
export default function FlowLine({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 40 C 40 10, 80 10, 110 40 C 140 70, 180 70, 210 40 C 240 10, 280 10, 310 40 C 335 63, 365 63, 400 38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
