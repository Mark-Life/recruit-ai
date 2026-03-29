"use client";

import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Core NDJSON streaming hook
// ---------------------------------------------------------------------------

interface StreamState<T> {
  data: Partial<T> | null;
  error: Error | null;
  isStreaming: boolean;
}

interface StreamOptions {
  body?: unknown;
  method?: string;
  url: string;
}

async function readNdjsonStream<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (parsed: Partial<T>) => void
) {
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        onChunk(JSON.parse(trimmed) as Partial<T>);
      }
    }
  }

  if (buffer.trim()) {
    onChunk(JSON.parse(buffer.trim()) as Partial<T>);
  }
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function useNdjsonStream<T>() {
  const [state, setState] = useState<StreamState<T>>({
    data: null,
    isStreaming: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (options: StreamOptions) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ data: null, isStreaming: true, error: null });

    try {
      const res = await fetch(options.url, {
        method: options.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      await readNdjsonStream<T>(reader, (parsed) => {
        setState((prev) => ({ ...prev, data: parsed }));
      });

      setState((prev) => ({ ...prev, isStreaming: false }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: toError(err),
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, start, cancel };
}

// ---------------------------------------------------------------------------
// Typed streaming mutation hooks
// ---------------------------------------------------------------------------

interface CreateJobStreamOutput {
  jd?: Partial<{
    summary: string;
    roleTitle: string;
    skills: readonly string[];
    keywords: readonly string[];
    seniority: string;
    employmentType: string;
    workMode: string;
    location: string;
    willingToSponsorRelocation: boolean;
    experienceYearsMin: number;
    experienceYearsMax: number;
  }>;
  questions?: Partial<{
    questions: readonly Partial<{
      field: string;
      question: string;
      reason: string;
      options: readonly string[];
    }>[];
  }>;
}

export function useExtractJobStream(jobId: string) {
  const stream = useNdjsonStream<CreateJobStreamOutput>();

  const mutate = useCallback(() => {
    stream.start({
      url: `/api/jobs/${jobId}/extract`,
    });
  }, [jobId, stream.start]);

  return { ...stream, mutate };
}

interface SubmitAnswersStreamOutput {
  employmentType?: string;
  id?: string;
  keywords?: readonly string[];
  location?: string;
  roleTitle?: string;
  seniority?: string;
  skills?: readonly string[];
  summary?: string;
  workMode?: string;
}

export function useSubmitAnswersStream(jobId: string) {
  const stream = useNdjsonStream<SubmitAnswersStreamOutput>();

  const mutate = useCallback(
    (answers: readonly { field: string; answer: string }[]) => {
      stream.start({
        url: `/api/jobs/${jobId}/answers`,
        body: { answers },
      });
    },
    [jobId, stream.start]
  );

  return { ...stream, mutate };
}

interface ResumeExtractionOutput {
  experienceYears?: number;
  keywords?: readonly string[];
  location?: string;
  name?: string;
  skills?: readonly string[];
  title?: string;
  willingToRelocate?: boolean;
  workModes?: readonly string[];
}

export function useExtractTalentStream(talentId: string) {
  const stream = useNdjsonStream<ResumeExtractionOutput>();

  const mutate = useCallback(() => {
    stream.start({
      url: `/api/talents/${talentId}/extract`,
    });
  }, [talentId, stream.start]);

  return { ...stream, mutate };
}
