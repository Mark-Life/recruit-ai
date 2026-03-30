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
import { Effect } from "effect";
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
      return Effect.runPromise(
        client.jobs.createDraft({
          payload: {
            ...params,
            organizationId: OrganizationId.make(params.organizationId),
          },
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
        client.jobs.get({ path: { id: JobDescriptionId.make(id) } })
      );
    },
  });

export const useMatchesForJob = (jobId: string, strictFilters = false) =>
  useQuery({
    queryKey: ["jobs", jobId, "matches", { strictFilters }],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.jobs.matches({
          path: { id: JobDescriptionId.make(jobId) },
          urlParams: { strictFilters: strictFilters ? "true" : undefined },
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
        client.talents.createDraft({
          payload: {
            ...params,
            recruiterId: RecruiterId.make(params.recruiterId),
          },
        })
      );
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
      return Effect.runPromise(
        client.talents.get({ path: { id: TalentId.make(id) } })
      );
    },
  });

export const useConfirmKeywords = (talentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keywords: readonly string[]) => {
      const client = await getClient();
      return Effect.runPromise(
        client.talents.confirmKeywords({
          path: { id: TalentId.make(talentId) },
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

export const useMatchesForTalent = (talentId: string, strictFilters = false) =>
  useQuery({
    queryKey: ["talents", talentId, "matches", { strictFilters }],
    queryFn: async () => {
      const client = await getClient();
      return Effect.runPromise(
        client.talents.matches({
          path: { id: TalentId.make(talentId) },
          urlParams: { strictFilters: strictFilters ? "true" : undefined },
        })
      );
    },
    retry: 1,
  });

/** Imperative fetch for use outside React Query hooks */
export const fetchMatchesForTalent = async (talentId: string) => {
  const client = await getClient();
  return Effect.runPromise(
    client.talents.matches({
      path: { id: TalentId.make(talentId) },
      urlParams: {},
    })
  );
};

// ---------------------------------------------------------------------------
// Update mutations
// ---------------------------------------------------------------------------

// TODO: import these from @workspace/core instead of redeclaring
type WorkMode = "office" | "hybrid" | "remote";
type SeniorityLevel = "junior" | "mid" | "senior" | "lead" | "principal";
type EmploymentType = "full-time" | "contract" | "freelance";

export const useUpdateTalent = (talentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      title?: string;
      keywords?: readonly string[];
      experienceYears?: number;
      location?: string;
      workModes?: readonly WorkMode[];
      willingToRelocate?: boolean;
    }) => {
      const client = await getClient();
      return Effect.runPromise(
        client.talents.update({
          path: { id: TalentId.make(talentId) },
          payload,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talents", talentId] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
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
      seniority?: SeniorityLevel;
      employmentType?: EmploymentType;
      workMode?: WorkMode;
      location?: string;
      willingToSponsorRelocation?: boolean;
      experienceYearsMin?: number;
      experienceYearsMax?: number;
    }) => {
      const client = await getClient();
      return Effect.runPromise(
        client.jobs.update({
          path: { id: JobDescriptionId.make(jobId) },
          payload,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
};
