import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>;
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8] transition-all disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
      {...props}
    />
  );
}

type SelectOption = string | { label: string; value: string; disabled?: boolean };

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export function SelectInput({ options, className = "", ...props }: SelectInputProps) {
  return (
    <select
      className={`w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8] transition-all appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
      {...props}
    >
      {options.map((option) => {
        const normalized = typeof option === "string" ? { label: option, value: option, disabled: false } : option;
        return (
          <option key={normalized.value} value={normalized.value} disabled={normalized.disabled}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

export function TextAreaInput({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8] transition-all resize-none disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
      {...props}
    />
  );
}
