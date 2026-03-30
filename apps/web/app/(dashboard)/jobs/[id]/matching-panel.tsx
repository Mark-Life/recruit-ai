import { CheckIcon, SearchIcon, SparklesIcon } from "lucide-react";

/** Panel shown while the matching process is running. */
export const MatchingPanel = () => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
    <div className="relative">
      <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
      <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
        <SearchIcon className="size-7 text-primary" />
      </div>
    </div>

    <div className="flex flex-col items-center gap-2 text-center">
      <h3 className="font-semibold text-base">Analyzing & Matching</h3>
      <p className="max-w-xs text-muted-foreground text-sm">
        Running vector similarity search and scoring talents against this job
        description.
      </p>
    </div>

    <div className="flex flex-col gap-3 pt-2">
      <AnalysisStep done label="Extracting keywords and requirements" />
      <AnalysisStep done label="Generating embedding vector" />
      <AnalysisStep active label="Searching talent pool" />
      <AnalysisStep label="Scoring and ranking matches" />
    </div>
  </div>
);

const AnalysisStep = ({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) => {
  const renderIcon = () => {
    if (done) {
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3" />
        </div>
      );
    }
    if (active) {
      return (
        <div className="flex size-5 items-center justify-center">
          <SparklesIcon className="size-4 animate-pulse text-primary" />
        </div>
      );
    }
    return (
      <div className="size-5 rounded-full border border-border bg-muted" />
    );
  };

  const labelClassName = () => {
    if (done) {
      return "text-muted-foreground text-sm line-through";
    }
    if (active) {
      return "font-medium text-foreground text-sm";
    }
    return "text-muted-foreground text-sm";
  };

  return (
    <div className="flex items-center gap-2.5">
      {renderIcon()}
      <span className={labelClassName()}>{label}</span>
    </div>
  );
};
