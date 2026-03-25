import type { ReactNode } from "react";

type ActionModalTone = "default" | "success" | "danger" | "warning";

function getToneClasses(tone: ActionModalTone) {
  switch (tone) {
    case "success":
      return {
        hero: "bg-[linear-gradient(160deg,rgba(16,185,129,0.18),rgba(250,204,21,0.14))]",
        shell:
          "bg-[linear-gradient(145deg,rgba(244,252,246,0.98),rgba(255,248,234,0.98))]",
        chip: "text-emerald-700",
      };
    case "danger":
      return {
        hero: "bg-[linear-gradient(160deg,rgba(248,113,113,0.18),rgba(251,191,36,0.14))]",
        shell:
          "bg-[linear-gradient(145deg,rgba(255,245,245,0.98),rgba(255,248,234,0.98))]",
        chip: "text-rose-700",
      };
    case "warning":
      return {
        hero: "bg-[linear-gradient(160deg,rgba(250,204,21,0.22),rgba(253,186,116,0.18))]",
        shell:
          "bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(255,247,237,0.98))]",
        chip: "text-amber-700",
      };
    default:
      return {
        hero: "bg-[linear-gradient(160deg,rgba(16,185,129,0.18),rgba(59,130,246,0.12))]",
        shell:
          "bg-[linear-gradient(145deg,rgba(244,252,246,0.98),rgba(246,250,255,0.98))]",
        chip: "text-[rgb(var(--app-brand))]",
      };
  }
}

export default function ActionModal({
  chip,
  title,
  description,
  tone = "default",
  children,
  actions,
  onClose,
}: {
  chip: string;
  title: string;
  description: string;
  tone?: ActionModalTone;
  children?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}) {
  const toneClasses = getToneClasses(tone);
  const isCompact = !children;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`w-full ${isCompact ? "max-w-2xl" : "max-w-4xl"} overflow-hidden rounded-[2rem] border border-white/60 ${toneClasses.shell} shadow-[0_30px_90px_rgba(15,23,42,0.24)]`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`grid gap-0 ${isCompact ? "" : "lg:grid-cols-[0.92fr_1.08fr]"}`}>
          <div className={`${toneClasses.hero} p-6 lg:p-8`}>
            <div className={`app-chip bg-white/80 ${toneClasses.chip}`}>{chip}</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
              {title}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 app-muted">{description}</p>
            {isCompact && actions ? (
              <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
            ) : null}
          </div>

          {!isCompact ? (
            <div className="p-6 lg:p-8">
              {children}
              {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
