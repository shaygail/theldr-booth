"use client";

interface ReadyToggleProps {
  isReady: boolean;
  partnerReady: boolean;
  partnerName: string;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReadyToggle({
  isReady,
  partnerReady,
  partnerName,
  onToggle,
  disabled = false,
}: ReadyToggleProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center gap-6 w-full justify-center">
        <div className="flex flex-col items-center gap-1">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              isReady ? "bg-sage-500" : "bg-warm-300"
            }`}
          />
          <span className="text-xs text-warm-600">You</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              partnerReady ? "bg-sage-500" : "bg-warm-300"
            }`}
          />
          <span className="text-xs text-warm-600">{partnerName}</span>
        </div>
      </div>

      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-full max-w-xs py-4 px-6 rounded-2xl text-lg font-semibold transition-all ${
          isReady
            ? "bg-sage-500 text-white shadow-lg shadow-sage-500/30"
            : "bg-coral-500 text-white shadow-lg shadow-coral-500/30 hover:bg-coral-600"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isReady ? "✓ Ready — tap to un-ready" : "I'm ready!"}
      </button>

      {isReady && !partnerReady && (
        <p className="text-sm text-warm-600 text-center animate-pulse">
          Waiting for {partnerName} to get ready…
        </p>
      )}

      {isReady && partnerReady && (
        <p className="text-sm text-sage-600 font-medium text-center">
          Both ready! Get ready to smile…
        </p>
      )}
    </div>
  );
}
