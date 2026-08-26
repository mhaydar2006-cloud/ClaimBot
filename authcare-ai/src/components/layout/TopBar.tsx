import { Plus } from "lucide-react";
import { Button } from "@/components/common/Button";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onNew?: () => void;
}

export function TopBar({ title, subtitle, onNew }: TopBarProps) {
  return (
    <header className="no-print bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>

      {onNew && (
        <Button onClick={onNew} icon={<Plus className="w-4 h-4" />}>
          New Request
        </Button>
      )}
    </header>
  );
}
