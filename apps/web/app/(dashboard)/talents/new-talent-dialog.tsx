"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowRightIcon,
  FileTextIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MOCK_REDIRECT_DELAY_MS = 800;
const MAX_FILE_SIZE_MB = 10;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB;

export function NewTalentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      resumeText: "",
      resumeFile: null as File | null,
    },
    onSubmit: async () => {
      // TODO: call POST /api/talents with name + resumeText or resumeFile
      await new Promise<void>((resolve) => {
        setTimeout(resolve, MOCK_REDIRECT_DELAY_MS);
      });
      setOpen(false);
      router.push("/talents/tal-3" as Route);
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setInputMode("text");
    }
    setOpen(next);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" />
          New Talent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>New Talent</DialogTitle>
            <DialogDescription>
              Upload a resume and we'll extract skills, experience, and match
              against open positions automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
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
          </div>

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit} type="submit">
                  {isSubmitting ? (
                    "Processing..."
                  ) : (
                    <>
                      Submit & Extract
                      <ArrowRightIcon className="ml-1 size-4" />
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

// ---------------------------------------------------------------------------

const KB = BYTES_PER_KB;
const MB = BYTES_PER_MB;

function formatFileSize(bytes: number): string {
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / KB)} KB`;
}
