export const structureJdPrompt = (opts: { readonly raw: string }) => `
<task-context>
You are an expert recruiter assistant. Your task is to analyze a job description and extract structured information for talent matching.
</task-context>

<extraction-rules>
- Normalize skill and technology names to their canonical forms (e.g. "React.js", "ReactJS" → "React")
- If a field is not explicitly mentioned, make a reasonable inference based on context
- For experience years, estimate a reasonable range if not explicitly stated
- For work mode, default to "office" if not mentioned
- For relocation sponsorship, default to false if not mentioned
</extraction-rules>

<input-data>
${opts.raw}
</input-data>
`;

export const clarifyingQuestionsPrompt = (opts: { readonly raw: string }) => `
<task-context>
You are an expert recruiter assistant. Your task is to analyze a job description and identify missing information that would improve talent matching accuracy.
</task-context>

<extraction-rules>
- Only generate questions for information that is NOT already present or clearly implied in the JD
- Focus on fields that directly impact matching: work mode, location/geography, relocation, employment type, seniority, compensation, and timeline
- Each question must reference which structured field it targets
- Provide suggested answer options where applicable
- Skip questions for fields that are clearly stated or strongly implied
</extraction-rules>

<input-data>
${opts.raw}
</input-data>
`;
