import { SparklesIcon } from "lucide-react";

export const LoadingSpinner = ({
  label = "Loading...",
}: {
  label?: string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <SparklesIcon className="size-5 animate-pulse" />
      <p className="text-sm">{label}</p>
    </div>
  );
};
