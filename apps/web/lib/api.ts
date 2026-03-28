"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { StructuredJd } from "@workspace/core/domain/models/job-description";
import type { Match } from "@workspace/core/domain/models/match";
import type { Talent } from "@workspace/core/domain/models/talent";

export type { JobStatus } from "@workspace/core/domain/models/job-description";
export type {
  Match,
  ScoreBreakdown,
} from "@workspace/core/domain/models/match";
export type {
  Talent,
  TalentStatus,
} from "@workspace/core/domain/models/talent";

/** Alias for StructuredJd — used throughout the frontend as "Job". */
export type Job = StructuredJd;

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function resolveUrl(path: string): string {
  if (typeof window !== "undefined") {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(url), init);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useJobs() {
  return useSuspenseQuery({
    queryKey: ["jobs"],
    queryFn: () => fetchJson<readonly Job[]>("/api/jobs"),
  });
}

export function useJob(id: string) {
  return useSuspenseQuery({
    queryKey: ["jobs", id],
    queryFn: () => fetchJson<Job>(`/api/jobs/${id}`),
  });
}

export function useMatchesForJob(jobId: string) {
  return useSuspenseQuery({
    queryKey: ["jobs", jobId, "matches"],
    queryFn: () => fetchJson<readonly Match[]>(`/api/jobs/${jobId}/matches`),
  });
}

// ---------------------------------------------------------------------------
// Talents
// ---------------------------------------------------------------------------

export function useTalents() {
  return useSuspenseQuery({
    queryKey: ["talents"],
    queryFn: () => fetchJson<readonly Talent[]>("/api/talents"),
  });
}

export function useTalent(id: string) {
  return useSuspenseQuery({
    queryKey: ["talents", id],
    queryFn: () => fetchJson<Talent>(`/api/talents/${id}`),
  });
}

export function useConfirmSkills(talentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skills: readonly string[]) =>
      fetchJson<Talent>(`/api/talents/${talentId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talents", talentId] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    },
  });
}

export function useMatchesForTalent(talentId: string) {
  return useSuspenseQuery({
    queryKey: ["talents", talentId, "matches"],
    queryFn: () =>
      fetchJson<readonly Match[]>(`/api/talents/${talentId}/matches`),
  });
}
