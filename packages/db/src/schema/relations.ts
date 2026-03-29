import { defineRelations } from "drizzle-orm";
import { jobDescriptions } from "./job-descriptions";
import { organizations } from "./organizations";
import { recruiters } from "./recruiters";
import { talents } from "./talents";

const schema = { jobDescriptions, organizations, recruiters, talents };

export const relations = defineRelations(schema, (r) => ({
  talents: {
    recruiter: r.one.recruiters({
      from: r.talents.recruiterId,
      to: r.recruiters.id,
    }),
  },
  jobDescriptions: {
    organization: r.one.organizations({
      from: r.jobDescriptions.organizationId,
      to: r.organizations.id,
    }),
  },
  recruiters: {
    talents: r.many.talents(),
  },
  organizations: {
    jobDescriptions: r.many.jobDescriptions(),
  },
}));
