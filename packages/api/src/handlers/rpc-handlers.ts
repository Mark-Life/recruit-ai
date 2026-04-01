import { JobOrchestrationService } from "@workspace/core/services/job-orchestration-service";
import { JobQueryService } from "@workspace/core/services/job-query-service";
import { TalentOrchestrationService } from "@workspace/core/services/talent-orchestration-service";
import { TalentQueryService } from "@workspace/core/services/talent-query-service";
import { Effect } from "effect";
import { AppRpcs } from "../rpc";

export const AppRpcsLive = AppRpcs.toLayer(
  Effect.gen(function* () {
    const jobQuery = yield* JobQueryService;
    const jobOrch = yield* JobOrchestrationService;
    const talentQuery = yield* TalentQueryService;
    const talentOrch = yield* TalentOrchestrationService;

    return {
      healthCheck: () =>
        Effect.sync(() => ({
          status: "ok" as const,
          timestamp: new Date().toISOString(),
        })),

      listJobs: () => jobQuery.listJobs(),

      getJob: ({ id }) => jobQuery.getJob(id),

      getJobMatches: ({ id, strictFilters }) =>
        jobQuery.getMatches(id, {
          strictFilters: strictFilters ?? false,
        }),

      createDraftJob: ({ rawText, title, organizationId }) =>
        jobOrch.createDraft({ rawText, title, organizationId }),

      updateJob: ({ id, ...data }) => jobOrch.updateJob(id, data),

      extractJob: ({ id }) => jobOrch.extractJob(id),

      submitAnswers: ({ id, answers }) => jobOrch.submitAnswers(id, answers),

      listTalents: () => talentQuery.listTalents(),

      getTalent: ({ id }) => talentQuery.getTalent(id),

      getTalentMatches: ({ id, strictFilters }) =>
        talentQuery.getMatches(id, {
          strictFilters: strictFilters ?? false,
        }),

      createDraftTalent: ({ name, resumeText, resumePdfBase64, recruiterId }) =>
        talentOrch.createDraft({
          name,
          resumeText,
          resumePdfBase64,
          recruiterId,
        }),

      updateTalent: ({ id, ...data }) => talentOrch.updateTalent(id, data),

      confirmKeywords: ({ id, keywords }) =>
        talentOrch.confirmKeywords(id, keywords),

      extractTalent: ({ id }) => talentOrch.extractTalent(id),
    };
  })
);
