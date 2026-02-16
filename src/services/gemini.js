import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Generates a pdfmake document definition. The model may restyle AND rewrite the resume using
 * the user's prompt as the primary source of truth.
 *
 * @param {string} userPrompt - The user's design/content request or instructions.
 * @param {string} resumeText - Raw resume text (fallback source).
 * @param {object|null} currentDocDef - Optional current pdfmake JSON (for iterative edits).
 * @returns {Promise<object>} - Parsed pdfmake docDefinition JSON.
 */
export async function generateResumeDesign(userPrompt, resumeText = "", currentDocDef = null) {
  try {
    const safeResumeText = (resumeText || "").slice(0, 9000);

    const prompt = `
You are an elite resume writer + graphic designer. Output **pdfmake docDefinition JSON only**.

USER PROMPT (primary source): "${userPrompt}"
FALLBACK RESUME TEXT (use if prompt lacks details):
"""
${safeResumeText}
"""
${currentDocDef ? `PREVIOUS DESIGN JSON (for iterative tweaks): ${JSON.stringify(currentDocDef)}` : "No previous design. Start fresh."}

CONTENT RULES:
- Derive names, contact, roles, achievements from the USER PROMPT when present; otherwise fall back to the provided resume text.
- Do NOT keep placeholder personas like "John Doe" unless the user explicitly asked.
- Single A4 page. If long, trim wording but preserve key facts and metrics.
- No nested documents or screenshots; one clean layout only.

FORMAT RULES:
- Return raw JSON (no markdown fences, no prose).
- Required keys: pageSize:"A4", pageMargins, content, styles, defaultStyle.
- Use a modern, readable layout (header, columns, accent color, clear hierarchy). Use Roboto font family.

JSON ONLY:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedText);
    return sanitizeDocDef(parsed);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate resume design. Please try again.");
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
