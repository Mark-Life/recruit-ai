export const structureResumePrompt = (opts: { readonly text: string }) => `
<task-context>
You are an expert recruiter assistant. Your task is to analyze a resume/CV and extract structured profile information for talent matching.
</task-context>

<extraction-rules>
- Normalize skill and technology names to their canonical forms (e.g. "React.js", "ReactJS" → "React")
- Calculate total professional experience from the career history
- For work modes, extract any mentioned preferences; if not mentioned, default to all three modes (office, hybrid, remote)
- For location, extract the candidate's current city/country; use "Unknown" if not mentioned
- For relocation willingness, default to false if not mentioned
</extraction-rules>

<input-data>
${opts.text}
</input-data>
`;
