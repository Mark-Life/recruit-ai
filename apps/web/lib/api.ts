"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  JobDescriptionId,
  OrganizationId,
  RecruiterId,
  TalentId,
} from "@workspace/core/domain/models/ids";
import { Effect, Stream } from "effect";
import { getClient } from "./api-client";

export type {
  JobStatus,
  StructuredJd as Job,
  UpdateJobInput,
} from "@workspace/core/domain/models/job-description";
export type {
  Match,
  ScoreBreakdown,
} from "@workspace/core/domain/models/match";
export type {
  Talent,
  TalentStatus,
  UpdateTalentInput,
} from "@workspace/core/domain/models/talent";

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const useJobs = () =>
  useSuspenseQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.listJobs());
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
      return Effect.runPromise(
        client.createDraftJob({
          ...params,
          organizationId: OrganizationId.make(params.organizationId),
        })
      );
    },
  });

export const useJob = (id: string) =>
  useSuspenseQuery({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.getJob({ id: JobDescriptionId.make(id) })
      );
    },
  });

export const useMatchesForJob = (jobId: string, strictFilters = false) =>
  useQuery({
    queryKey: ["jobs", jobId, "matches", { strictFilters }],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.getJobMatches({
          id: JobDescriptionId.make(jobId),
          strictFilters,
        })
      );
    },
    retry: 1,
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
      return Effect.runPromise(
        client.createDraftTalent({
          ...params,
          recruiterId: RecruiterId.make(params.recruiterId),
        })
      );
    },
  });

export const useTalents = () =>
  useSuspenseQuery({
    queryKey: ["talents"],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.listTalents());
    },
  });

export const useTalent = (id: string) =>
  useSuspenseQuery({
    queryKey: ["talents", id],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(client.getTalent({ id: TalentId.make(id) }));
    },
  });

export const useConfirmKeywords = (talentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keywords: readonly string[]) => {
      const client = await getClient();
      return Effect.runPromise(
        client.confirmKeywords({
          id: TalentId.make(talentId),
          keywords: [...keywords],
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talents", talentId] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    },
  });
};

export const useMatchesForTalent = (talentId: string, strictFilters = false) =>
  useQuery({
    queryKey: ["talents", talentId, "matches", { strictFilters }],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.getTalentMatches({
          id: TalentId.make(talentId),
          strictFilters,
        })
      );
    },
    retry: 1,
  });

/** Imperative fetch for use outside React Query hooks */
export const fetchMatchesForTalent = async (talentId: string) => {
  const client = await getClient();
  return Effect.runPromise(
    client.getTalentMatches({ id: TalentId.make(talentId) })
  );
};

// ---------------------------------------------------------------------------
// Update mutations
// ---------------------------------------------------------------------------

export const useUpdateTalent = (talentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      title?: string;
      keywords?: readonly string[];
      experienceYears?: number;
      location?: string;
      workModes?: readonly ("office" | "hybrid" | "remote")[];
      willingToRelocate?: boolean;
    }) => {
      const client = await getClient();
      return Effect.runPromise(
        client.updateTalent({ id: TalentId.make(talentId), ...payload })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talents", talentId] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    },
  });
};

export const useSubmitAnswers = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      answers: readonly { field: string; answer: string }[]
    ) => {
      const client = await getClient();
      const stream = client.submitAnswers({
        id: JobDescriptionId.make(jobId),
        answers: [...answers],
      });
      await Effect.runPromise(Stream.runDrain(stream));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
};

export const useUpdateJob = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      summary?: string;
      roleTitle?: string;
      keywords?: readonly string[];
      seniority?: "junior" | "mid" | "senior" | "lead" | "principal";
      employmentType?: "full-time" | "contract" | "freelance";
      workMode?: "office" | "hybrid" | "remote";
      location?: string;
      willingToSponsorRelocation?: boolean;
      experienceYearsMin?: number;
      experienceYearsMax?: number;
    }) => {
      const client = await getClient();
      return Effect.runPromise(
        client.updateJob({ id: JobDescriptionId.make(jobId), ...payload })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
};
