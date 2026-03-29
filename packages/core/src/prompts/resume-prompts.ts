const resumeExtractionRules = `
<extraction-rules>
- Extract unified keywords covering both technology skills and domain terms, normalized to canonical forms (e.g. "React.js", "ReactJS" → "React")
- Calculate total professional experience from the career history
- For work modes, extract any mentioned preferences; if not mentioned, default to all three modes (office, hybrid, remote)
- For location, extract the candidate's current city/country; use "Unknown" if not mentioned
- For relocation willingness, default to false if not mentioned
</extraction-rules>
`.trim();

const resumeTaskContext = `
<task-context>
You are an expert recruiter assistant. Your task is to analyze a resume/CV and extract structured profile information for talent matching.
</task-context>
`.trim();

export const structureResumePrompt = (opts: { readonly text: string }) => `
${resumeTaskContext}

${resumeExtractionRules}

<input-data>
${opts.text}
</input-data>
`;

export const structureResumePdfPrompt = `
${resumeTaskContext}

${resumeExtractionRules}

The resume is provided as a PDF attachment. Extract all relevant information from it.
`;
