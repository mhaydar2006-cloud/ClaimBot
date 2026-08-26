import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { READINESS_LOADING_STEPS } from "@/data/mockData";

interface ReadinessLoadingProps {
  onComplete: () => void;
}

export function ReadinessLoading({ onComplete }: ReadinessLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = READINESS_LOADING_STEPS.map((_, index) =>
      window.setTimeout(() => setCurrentStep(index + 1), (index + 1) * 320),
    );
    const done = window.setTimeout(onComplete, READINESS_LOADING_STEPS.length * 320 + 180);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(done);
    };
  }, [onComplete]);

  const progress = Math.round((currentStep / READINESS_LOADING_STEPS.length) * 100);

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A5FA8] to-[#0B3D78] flex items-center justify-center shadow-xl">
          <ClipboardCheck className="w-10 h-10 text-white" />
        </div>
        <div className="absolute inset-0 rounded-2xl ring-4 ring-[#1A5FA8]/20 animate-ping" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Documentation Readiness Check</h2>
      <p className="text-gray-500 text-sm text-center mb-8">
        Running deterministic rules against the selected Lebanon payer/TPA workflow
      </p>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="h-full bg-[#1A5FA8] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="w-full space-y-3">
        {READINESS_LOADING_STEPS.map((label, index) => {
          const done = index + 1 <= currentStep;
          const active = index + 1 === currentStep + 1;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : active ? (
                  <Loader2 className="w-5 h-5 text-[#1A5FA8] animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                )}
              </div>
              <span className={`text-sm ${done ? "text-gray-700" : active ? "text-gray-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
