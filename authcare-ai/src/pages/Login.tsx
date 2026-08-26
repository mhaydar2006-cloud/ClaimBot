import { useState } from "react";
import { ArrowRight, Lock, Mail, Shield, Sparkles } from "lucide-react";
import { FieldLabel } from "@/components/common/FormControls";
import { DEMO_USER } from "@/data/mockData";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  backendMode?: boolean;
}

export function Login({ onLogin, backendMode = false }: LoginProps) {
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(backendMode ? "" : "demo-password");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-[#0B1F3A] p-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
          <circle cx="100" cy="150" r="200" fill="#3B82F6" />
          <circle cx="500" cy="600" r="280" fill="#1D4ED8" />
          <circle cx="550" cy="120" r="120" fill="#60A5FA" />
          <circle cx="50" cy="700" r="180" fill="#2563EB" />
          <rect x="280" y="80" width="8" height="60" rx="4" fill="#93C5FD" opacity="0.6" />
          <rect x="258" y="102" width="52" height="8" rx="4" fill="#93C5FD" opacity="0.6" />
          <rect x="440" y="300" width="6" height="44" rx="3" fill="#93C5FD" opacity="0.5" />
          <rect x="421" y="319" width="44" height="6" rx="3" fill="#93C5FD" opacity="0.5" />
          <rect x="120" y="400" width="5" height="36" rx="2.5" fill="#BAE6FD" opacity="0.4" />
          <rect x="104" y="416" width="36" height="5" rx="2.5" fill="#BAE6FD" opacity="0.4" />
          <polyline
            points="0,420 80,420 110,360 140,480 170,420 220,420 250,380 280,460 310,420 600,420"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="2"
            opacity="0.3"
          />
        </svg>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D5FA8] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-semibold">ClaimBot</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-200 text-sm mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Lebanese provider-side workflow
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Cleaner insurance requests,
            <br />
            less back-and-forth.
          </h2>
          <p className="text-blue-200 text-base leading-relaxed">
            ClaimBot helps Lebanese healthcare teams prepare medical insurance and pre-authorization requests by checking documentation readiness before submission.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: "Core service families", value: "5" },
              { label: "TPA rule layers", value: "4" },
              { label: "Market focus", value: "Lebanon" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-blue-300 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-400 text-xs">
          MVP prototype - synthetic/de-identified data only - optional AI rewrite endpoint
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#EEF3FA]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#1A5FA8] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-900 text-lg font-semibold">ClaimBot</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in to your account</h1>
          <p className="text-gray-500 text-sm mb-8">
            Claim readiness support for Lebanese healthcare teams
          </p>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setLoginError("");
              setSubmitting(true);
              const error = await onLogin(email, password);
              if (error) setLoginError(error);
              setSubmitting(false);
            }}
            className="space-y-4"
          >
            <div>
              <FieldLabel>Work email</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Password</FieldLabel>
                <span className="text-xs text-gray-400 font-medium">{backendMode ? "Backend authentication" : "Demo authentication"}</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#1A5FA8] hover:bg-[#154e8e] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {loginError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{loginError}</div>}

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-xs text-gray-500">
            {backendMode ? "Persistent backend mode is enabled. The browser keeps the session token only for this tab/session." : "Backend is not configured; this sign-in remains a local demo gate."}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            {backendMode ? "Use only synthetic/de-identified data unless the backend PHI controls have been explicitly configured and reviewed." : "Demo login only. No authentication or real patient data is connected."}
          </p>
        </div>
      </div>
    </div>
  );
}
