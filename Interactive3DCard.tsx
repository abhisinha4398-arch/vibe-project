import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type AriaRole,
  useRef,
} from "react";

type CardStyle = CSSProperties & {
  "--card-glow": string;
};

type Interactive3DCardProps = {
  children: ReactNode;
  className?: string;
  accent?: string;
  onClick?: () => void;
  ariaLabel?: string;
  role?: AriaRole;
  ariaModal?: boolean;
  ariaLabelledBy?: string;
};

export default function Interactive3DCard({
  children,
  className = "",
  accent = "#b9f566",
  onClick,
  ariaLabel,
  role,
  ariaModal,
  ariaLabelledBy,
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (
      !card ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const rotateY = (x - 0.5) * 14;
    const rotateX = (0.5 - y) * 12;

    card.style.setProperty("--rotate-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--rotate-y", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
    card.style.setProperty("--pointer-z", "18px");
  }

  function resetPointer() {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
    card.style.setProperty("--pointer-x", "50%");
    card.style.setProperty("--pointer-y", "25%");
    card.style.setProperty("--pointer-z", "0px");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  }

  return (
    <div
      ref={cardRef}
      className={`interactive-3d-card ${className}`}
      style={{ "--card-glow": accent } as CardStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role ?? (onClick ? "button" : undefined)}
      tabIndex={onClick ? 0 : role === "dialog" ? -1 : undefined}
      aria-label={ariaLabel}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
    >
      <div className="card-light" aria-hidden="true" />
      <div className="interactive-3d-card__content">{children}</div>
    </div>
  );
}
