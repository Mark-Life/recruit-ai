"use client";

import type {
  CreateJobStreamData,
  ExtractTalentStreamData,
} from "@workspace/api/rpc";
import { JobDescriptionId, TalentId } from "@workspace/core/domain/models/ids";
import { Effect, Stream } from "effect";
import { useCallback, useRef, useState } from "react";
import { getClient } from "./api-client";

// ---------------------------------------------------------------------------
// Shared state shape
// ---------------------------------------------------------------------------

interface StreamState<T> {
  data: T | null;
  error: Error | null;
  isStreaming: boolean;
}

const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

// ---------------------------------------------------------------------------
// Job extraction stream
// ---------------------------------------------------------------------------

export const useExtractJobStream = (jobId: string) => {
  const [state, setState] = useState<StreamState<CreateJobStreamData>>({
    data: null,
    isStreaming: false,
    error: null,
  });
  const cancelledRef = useRef(false);

  const mutate = useCallback(async () => {
    cancelledRef.current = false;
    setState({ data: null, isStreaming: true, error: null });

    try {
      const client = await getClient();
      const stream = client.extractJob({
        id: JobDescriptionId.make(jobId),
      });

      await Effect.runPromise(
        Stream.runForEach(stream, (chunk) =>
          Effect.sync(() => {
            if (!cancelledRef.current) {
              setState((prev) => ({
                ...prev,
                data: chunk,
              }));
            }
          })
        )
      );

      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    } catch (err) {
      if (cancelledRef.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: toError(err),
      }));
    }
  }, [jobId]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, mutate, cancel };
};

// ---------------------------------------------------------------------------
// Talent extraction stream
// ---------------------------------------------------------------------------

export const useExtractTalentStream = (talentId: string) => {
  const [state, setState] = useState<StreamState<ExtractTalentStreamData>>({
    data: null,
    isStreaming: false,
    error: null,
  });
  const cancelledRef = useRef(false);

  const mutate = useCallback(async () => {
    cancelledRef.current = false;
    setState({ data: null, isStreaming: true, error: null });

    try {
      const client = await getClient();
      const stream = client.extractTalent({
        id: TalentId.make(talentId),
      });

      await Effect.runPromise(
        Stream.runForEach(stream, (chunk) =>
          Effect.sync(() => {
            if (!cancelledRef.current) {
              setState((prev) => ({
                ...prev,
                data: chunk,
              }));
            }
          })
        )
      );

      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    } catch (err) {
      if (cancelledRef.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: toError(err),
      }));
    }
  }, [talentId]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, mutate, cancel };
};
