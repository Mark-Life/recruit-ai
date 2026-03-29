"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Effect } from "effect";
import { getClient } from "./api-client";

export type {
  JobStatus,
  StructuredJd as Job,
} from "@workspace/core/domain/models/job-description";
export type {
  Match,
  ScoreBreakdown,
} from "@workspace/core/domain/models/match";
export type {
  Talent,
  TalentStatus,
} from "@workspace/core/domain/models/talent";

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export function useJobs() {
  return useSuspenseQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.list());
    },
  });
}

export function useCreateDraftJob() {
  return useMutation({
    mutationFn: async (params: {
      rawText: string;
      title: string;
      organizationId: string;
    }) => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.createDraft({ payload: params }));
    },
  });
}

export function useJob(id: string) {
  return useSuspenseQuery({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.get({ path: { id } }));
    },
  });
}

export function useMatchesForJob(jobId: string) {
  return useSuspenseQuery({
    queryKey: ["jobs", jobId, "matches"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.matches({ path: { id: jobId } }));
    },
  });
}

// ---------------------------------------------------------------------------
// Talents
// ---------------------------------------------------------------------------

export function useCreateDraftTalent() {
  return useMutation({
    mutationFn: async (params: {
      name: string;
      resumeText?: string;
      resumePdfBase64?: string;
      recruiterId: string;
    }) => {
      const client = await getClient();
      return Effect.runPromise(client.talents.createDraft({ payload: params }));
    },
  });
}

export function useTalents() {
  return useSuspenseQuery({
    queryKey: ["talents"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.talents.list());
    },
  });
}

export function useTalent(id: string) {
  return useSuspenseQuery({
    queryKey: ["talents", id],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.talents.get({ path: { id } }));
    },
  });
}

export function useConfirmKeywords(talentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keywords: readonly string[]) => {
      const client = await getClient();
      return Effect.runPromise(
        client.talents.confirmKeywords({
          path: { id: talentId },
          payload: { keywords: [...keywords] },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talents", talentId] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    },
  });
}

export function useMatchesForTalent(talentId: string) {
  return useSuspenseQuery({
    queryKey: ["talents", talentId, "matches"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.talents.matches({ path: { id: talentId } })
      );
    },
  });
}

/** Imperative fetch for use outside React Query hooks */
export async function fetchMatchesForTalent(talentId: string) {
  const client = await getClient();
  return Effect.runPromise(client.talents.matches({ path: { id: talentId } }));
}
