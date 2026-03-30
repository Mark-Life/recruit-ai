export const structureJdPrompt = (opts: { readonly raw: string }) => `
<task-context>
You are an expert recruiter assistant. Your task is to analyze a job description and extract structured information for talent matching.
</task-context>

<extraction-rules>
- Extract unified keywords covering both technology skills and domain terms, normalized to canonical forms (e.g. "React.js", "ReactJS" → "React")
- If a field is not explicitly mentioned, make a reasonable inference based on context
- For experience years, estimate a reasonable range if not explicitly stated
- For work mode, default to "office" if not mentioned
- For relocation sponsorship, default to false if not mentioned
</extraction-rules>

<input-data>
${opts.raw}
</input-data>
`;

export const clarifyingQuestionsPrompt = (opts: {
  readonly raw: string;
  readonly extracted?: {
    readonly roleTitle?: string;
    readonly seniority?: string;
    readonly employmentType?: string;
    readonly workMode?: string;
    readonly location?: string;
    readonly willingToSponsorRelocation?: boolean;
    readonly experienceYearsMin?: number;
    readonly experienceYearsMax?: number;
  };
}) => `
<task-context>
You are an expert recruiter assistant. Your task is to analyze a job description and identify missing information that would improve talent matching accuracy.
</task-context>

<extraction-rules>
- Only generate questions for information that is NOT already present or clearly implied in the JD
- Focus on fields that directly impact matching: work mode, location/geography, relocation, employment type, seniority, compensation, and timeline
- Each question must reference which structured field it targets
- Provide suggested answer options where applicable
- Skip questions for fields that are clearly stated or strongly implied
- Do NOT ask about fields that already have confident values in the extracted data below
</extraction-rules>

<input-data>
${opts.raw}
</input-data>
${
  opts.extracted
    ? `
<already-extracted>
The following fields were already extracted from the job description. Do not ask questions about fields that have meaningful, non-default values here:
- Role title: ${opts.extracted.roleTitle ?? "unknown"}
- Seniority: ${opts.extracted.seniority ?? "unknown"}
- Employment type: ${opts.extracted.employmentType ?? "unknown"}
- Work mode: ${opts.extracted.workMode ?? "unknown"}
- Location: ${opts.extracted.location ?? "unknown"}
- Relocation sponsorship: ${opts.extracted.willingToSponsorRelocation ?? "unknown"}
- Experience range: ${opts.extracted.experienceYearsMin ?? "?"}–${opts.extracted.experienceYearsMax ?? "?"} years
</already-extracted>`
    : ""
}
`;
