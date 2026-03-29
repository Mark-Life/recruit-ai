"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowRightIcon, FileTextIcon, UploadIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useCreateDraftTalent } from "@/lib/api";
import { SEED_RECRUITER_ID } from "@/lib/seed-constants";

const MAX_FILE_SIZE_MB = 10;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB;

export interface DraftInfo {
  fileName?: string;
  id: string;
  inputMode: "text" | "pdf";
  name: string;
  resumeText?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FormPhase({
  onCreated,
}: {
  onCreated: (draft: DraftInfo) => void;
}) {
  const createDraft = useCreateDraftTalent();
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      resumeText: "",
      resumeFile: null as File | null,
    },
    onSubmit: async ({ value }) => {
      let resumeText: string | undefined;
      let resumePdfBase64: string | undefined;

      if (inputMode === "pdf" && value.resumeFile) {
        resumePdfBase64 = await fileToBase64(value.resumeFile);
      } else {
        resumeText = value.resumeText;
      }

      const result = await createDraft.mutateAsync({
        name: value.name,
        resumeText,
        resumePdfBase64,
        recruiterId: SEED_RECRUITER_ID,
      });

      window.history.replaceState(null, "", `/talents/new?id=${result.id}`);
      onCreated({
        id: result.id,
        name: value.name,
        inputMode,
        resumeText: inputMode === "text" ? value.resumeText : undefined,
        fileName: value.resumeFile?.name,
      });
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="New Talent" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-lg p-6">
          <p className="mb-6 text-muted-foreground text-sm">
            Upload a resume and we'll extract keywords, experience, and match
            against open positions automatically.
          </p>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : "Full name is required",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="talent-name">Full name</Label>
                  <Input
                    id="talent-name"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="flex flex-col gap-2">
              <Label>Resume / CV</Label>
              <Tabs
                onValueChange={(v) => setInputMode(v as "text" | "pdf")}
                value={inputMode}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="text">
                    <FileTextIcon className="size-3.5" />
                    Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="pdf">
                    <UploadIcon className="size-3.5" />
                    Upload PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text">
                  <form.Field
                    name="resumeText"
                    validators={{
                      onSubmit: ({ value }) =>
                        inputMode === "text" && !value.trim()
                          ? "Resume text is required"
                          : undefined,
                    }}
                  >
                    {(field) => (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          className="min-h-48 resize-none text-sm leading-relaxed"
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Paste the resume text here..."
                          value={field.state.value}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-destructive text-xs">
                            {field.state.meta.errors[0]}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>
                </TabsContent>

                <TabsContent value="pdf">
                  <form.Field
                    name="resumeFile"
                    validators={{
                      onSubmit: ({ value }) =>
                        inputMode === "pdf" && !value
                          ? "Please select a PDF file"
                          : undefined,
                    }}
                  >
                    {(field) => (
                      <ResumeFileInput
                        error={
                          field.state.meta.errors.length > 0
                            ? String(field.state.meta.errors[0])
                            : undefined
                        }
                        file={field.state.value}
                        fileInputRef={fileInputRef}
                        onFileChange={(file) => field.handleChange(file)}
                      />
                    )}
                  </form.Field>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end pt-2">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit} type="submit">
                    {isSubmitting ? (
                      "Creating..."
                    ) : (
                      <>
                        Submit & Extract
                        <ArrowRightIcon className="ml-1 size-4" />
                      </>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF file input with drag-and-drop zone
// ---------------------------------------------------------------------------

function ResumeFileInput({
  file,
  onFileChange,
  fileInputRef,
  error,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  fileInputRef: { current: HTMLInputElement | null };
  error?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string>();

  function validateAndSet(f: File) {
    setFileError(undefined);
    if (f.type !== "application/pdf") {
      setFileError("Only PDF files are accepted");
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    onFileChange(f);
  }

  function handleDrop(e: {
    preventDefault: () => void;
    dataTransfer: DataTransfer;
  }) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      validateAndSet(f);
    }
  }

  function handleFileInput(e: { target: { files: FileList | null } }) {
    const f = e.target.files?.[0];
    if (f) {
      validateAndSet(f);
    }
  }

  function handleRemove() {
    onFileChange(null);
    setFileError(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const displayError = fileError ?? error;

  if (file) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-sm">{file.name}</span>
            <span className="text-muted-foreground text-xs">
              {formatFileSize(file.size)}
            </span>
          </div>
          <button
            aria-label="Remove file"
            className="rounded-full p-1 hover:bg-muted"
            onClick={handleRemove}
            type="button"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className={`flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/40"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDrop={handleDrop}
        type="button"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <UploadIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-medium text-sm">
            Drop your PDF here or click to browse
          </span>
          <span className="text-muted-foreground text-xs">
            PDF only, up to {MAX_FILE_SIZE_MB}MB
          </span>
        </div>
      </button>
      <input
        accept="application/pdf"
        className="hidden"
        onChange={handleFileInput}
        ref={fileInputRef}
        type="file"
      />
      {displayError && (
        <p className="text-destructive text-xs">{displayError}</p>
      )}
    </div>
  );
}

const KB = BYTES_PER_KB;
const MB = BYTES_PER_MB;

function formatFileSize(bytes: number): string {
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / KB)} KB`;
}
