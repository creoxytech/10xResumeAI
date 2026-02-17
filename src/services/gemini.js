import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

/**
 * Generates a resume design stream.
 * The model will output natural language thoughts/actions first, 
 * then a special separator, then the JSON.
 * 
 * @param {string} userPrompt 
 * @param {string} resumeText 
 * @param {object|null} currentDocDef 
 * @yields {string} - Text chunks of the response
 */
export async function* generateResumeDesignStream(userPrompt, resumeText = "", currentDocDef = null) {
  try {
    const safeResumeText = (resumeText || "").slice(0, 9000);

    const prompt = `
You are an expert AI Resume Agent.
You have two modes:
1. **Chat Mode**: Answer questions about resume writing (e.g., advice, tips).
2. **Action Mode**: Create or Update the resume PDF based on user requests.

USER PROMPT: "${userPrompt}"

FALLBACK RESUME TEXT:
"""
${safeResumeText}
"""
${currentDocDef ? `PREVIOUS DESIGN JSON: ${JSON.stringify(currentDocDef)}` : "No previous design."}

CRITICAL RULES:
- **IF THE USER REQUEST IMPLIES ANY CHANGE** to the document (adding, removing, editing, reformatting), YOU MUST ENTER ACTION MODE.
- **ACTION MODE OUTPUT FORMAT**:
  1. Start with a brief "Action Log" (e.g., "Adding software engineer role...", "Refining summary...").
  2. THEN, output the **ARTIFACT MARKER** and the **FULL, VALID JSON** for the resume.

  :::ARTIFACT:::
  :::JSON_START:::
  { ... valid pdfmake json ... }
  :::JSON_END:::

- **CHAT MODE OUTPUT FORMAT**:
  - Use **Markdown** for formatting.
  - Use **Headings (###)** for sections.
  - Use **Tables** to compare options or show before/after.
  - Use **Bullet points** or **Checklists** for action items.
  - Use **> Blockquotes** for tips, warnings, or key insights (these will be styled specially).
  - Use **\`Inline Code\`** for keywords or short snippets.
  - DO NOT output the JSON markers in Chat Mode.

- **JSON RULES**:
  - Must be valid pdfmake docDefinition.
  - Page size: A4.
  - Margins: [36, 36, 36, 36].
  - Use Roboto font.
  - **RETURN THE COMPLETE JSON**, not just a diff.
`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }

  } catch (error) {
    console.error("Gemini API Stream Error:", error);
    throw new Error("Failed to generate resume stream.");
  }
}

/**
 * Helper to extract JSON from the accumulated response text.
 * @param {string} fullText 
 * @returns {object|null} Parsed JSON or null if not found/invalid
 */
export function extractJsonFromResponse(fullText) {
  try {
    const startMarker = ":::JSON_START:::";
    const endMarker = ":::JSON_END:::";

    let jsonString = null;

    const startIndex = fullText.indexOf(startMarker);
    const endIndex = fullText.lastIndexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      jsonString = fullText.substring(startIndex + startMarker.length, endIndex).trim();
    } else {
      // Fallback: Attempt to find the last valid JSON object in the text
      const contentMarker = '"content"';
      const lastContentIndex = fullText.lastIndexOf(contentMarker);

      if (lastContentIndex !== -1) {
        const openBrace = fullText.lastIndexOf('{', lastContentIndex);
        const closeBrace = fullText.lastIndexOf('}');

        if (openBrace !== -1 && closeBrace !== -1 && openBrace < closeBrace) {
          jsonString = fullText.substring(openBrace, closeBrace + 1);
        }
      }
    }

    if (!jsonString) return null;

    // Sanitize: Remove markdown code blocks
    jsonString = jsonString
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Sanitize: Remove JS comments (common in LLM output)
    jsonString = jsonString.replace(/\/\/.*$/gm, ""); // Single line comments
    jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, ""); // Multi line comments

    try {
      const parsed = JSON.parse(jsonString);
      return sanitizeDocDef(parsed);
    } catch (e) {
      console.warn("Partial JSON parse failed, attempting naive fix for trailing commas...");
      // Naive fix for trailing commas: ,} -> } and ,] -> ]
      const fixedJson = jsonString.replace(/,(\s*[}\]])/g, '$1');
      try {
        const parsed = JSON.parse(fixedJson);
        return sanitizeDocDef(parsed);
      } catch (e2) {
        console.error("JSON Parse Error Details:", { error: e2.message, snippet: jsonString.slice(0, 100) + "..." });
        return null;
      }
    }
  } catch (e) {
    console.error("JSON Extraction Fatal Error:", e);
    return null;
  }
}

// Heuristic sanitizer to prevent "resume inside resume" duplications.
function sanitizeDocDef(doc) {
  if (!doc) return doc;

  // Normalize required fields
  doc.pageSize = "A4";
  if (!doc.pageMargins) doc.pageMargins = [36, 36, 36, 36];

  // Remove explicit page breaks the model may add
  if (typeof doc.pageBreakBefore === "function") delete doc.pageBreakBefore;

  if (!Array.isArray(doc.content)) return doc;

  const looksLikeResumeBlock = (block) => {
    if (!block) return false;
    const s = JSON.stringify(block).toLowerCase();
    return s.includes("experience") || s.includes("education") || s.includes("skills") || s.includes("projects");
  };

  // If multiple resume-like blocks exist, keep only the first to avoid stacked duplicate resumes.
  const resumeBlocks = doc.content.filter(looksLikeResumeBlock);
  if (resumeBlocks.length > 1) {
    doc.content = [resumeBlocks[0]];
  }

  return doc;
}
