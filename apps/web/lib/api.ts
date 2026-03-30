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

export const useJobs = () =>
  useSuspenseQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.list());
    },
  });

export const useCreateDraftJob = () =>
  useMutation({
    mutationFn: async (params: {
      rawText: string;
      title: string;
      organizationId: string;
    }) => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.createDraft({ payload: params }));
    },
  });

export const useJob = (id: string) =>
  useSuspenseQuery({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.get({ path: { id } }));
    },
  });

export const useMatchesForJob = (jobId: string) =>
  useSuspenseQuery({
    queryKey: ["jobs", jobId, "matches"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.jobs.matches({ path: { id: jobId } }));
    },
  });

// ---------------------------------------------------------------------------
// Talents
// ---------------------------------------------------------------------------

export const useCreateDraftTalent = () =>
  useMutation({
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

export const useTalents = () =>
  useSuspenseQuery({
    queryKey: ["talents"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.talents.list());
    },
  });

export const useTalent = (id: string) =>
  useSuspenseQuery({
    queryKey: ["talents", id],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.talents.get({ path: { id } }));
    },
  });

export const useConfirmKeywords = (talentId: string) => {
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
};

export const useMatchesForTalent = (talentId: string) =>
  useSuspenseQuery({
    queryKey: ["talents", talentId, "matches"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.talents.matches({ path: { id: talentId } })
      );
    },
  });

/** Imperative fetch for use outside React Query hooks */
export const fetchMatchesForTalent = async (talentId: string) => {
  const client = await getClient();
  return Effect.runPromise(client.talents.matches({ path: { id: talentId } }));
};
