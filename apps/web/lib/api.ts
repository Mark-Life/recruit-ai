"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Shared types — mirror domain models for frontend use
// ---------------------------------------------------------------------------

export type JobStatus = "draft" | "refining" | "matching" | "ready";
export type TalentStatus = "uploaded" | "extracting" | "reviewing" | "matched";

export interface Job {
  createdAt: string;
  employmentType: string;
  experienceYearsMax: number;
  experienceYearsMin: number;
  id: string;
  keywords: readonly string[];
  location: string;
  organizationId: string;
  rawText: string;
  roleTitle: string;
  seniority: string;
  skills: readonly string[];
  status: JobStatus;
  summary: string;
  willingToSponsorRelocation: boolean;
  workMode: string;
}

export interface Talent {
  createdAt: string;
  experienceYears: number;
  id: string;
  keywords: readonly string[];
  location: string;
  name: string;
  recruiterId: string;
  skills: readonly string[];
  status: TalentStatus;
  title: string;
  willingToRelocate: boolean;
  workModes: readonly string[];
}

export interface ScoreBreakdown {
  constraintFit: number;
  experienceFit: number;
  keywordOverlap: number;
  semanticSimilarity: number;
}

export interface Match {
  breakdown: ScoreBreakdown;
  id: string;
  jobDescriptionId: string;
  recruiterId: string;
  talentId: string;
  totalScore: number;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => fetchJson<readonly Job[]>("/api/jobs"),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => fetchJson<Job>(`/api/jobs/${id}`),
  });
}

export function useMatchesForJob(jobId: string) {
  return useQuery({
    queryKey: ["jobs", jobId, "matches"],
    queryFn: () => fetchJson<readonly Match[]>(`/api/jobs/${jobId}/matches`),
  });
}

// ---------------------------------------------------------------------------
// Talents
// ---------------------------------------------------------------------------

export function useTalents() {
  return useQuery({
    queryKey: ["talents"],
    queryFn: () => fetchJson<readonly Talent[]>("/api/talents"),
  });
}

export function useTalent(id: string) {
  return useQuery({
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
  return useQuery({
    queryKey: ["talents", talentId, "matches"],
    queryFn: () =>
      fetchJson<readonly Match[]>(`/api/talents/${talentId}/matches`),
  });
}
