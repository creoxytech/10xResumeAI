import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export class ResumeCreationAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.role = "resume_creator";
  }

  async process(userInput, context) {
    const prompt = `You are a resume creation specialist. Create a new resume based on user input.
    
User Input: "${userInput}"
Context: ${JSON.stringify(context)}

Return a JSON object with tool calls:
{
  "tools": [
    {
      "name": "create_resume_structure",
      "parameters": {
        "personalInfo": {...},
        "sections": [...],
        "template": "modern"
      }
    }
  ],
  "reasoning": "Why these tools are needed"
}`;

    const result = await this.model.generateContent(prompt);
    return this.parseResponse(result.response.text());
  }

  parseResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { tools: [], reasoning: "Failed to parse" };
    } catch {
      return { tools: [], reasoning: "Parse error" };
    }
  }
}

export class ResumeEditAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.role = "resume_editor";
  }

  async process(userInput, context) {
    const prompt = `You are a resume editing specialist. Edit existing resume based on user request.
    
User Input: "${userInput}"
Current Resume: ${JSON.stringify(context.currentResume)}
Context: ${JSON.stringify(context)}

Return JSON with tool calls for specific edits:
{
  "tools": [
    {
      "name": "update_resume_section",
      "parameters": {
        "section": "experience",
        "updates": {...}
      }
    }
  ],
  "reasoning": "What changes are being made"
}`;

    const result = await this.model.generateContent(prompt);
    return this.parseResponse(result.response.text());
  }

  parseResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { tools: [], reasoning: "Failed to parse" };
    } catch {
      return { tools: [], reasoning: "Parse error" };
    }
  }
}

export class ResumeDesignAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.role = "resume_designer";
  }

  async process(userInput, context) {
    const prompt = `You are a resume design specialist. Change layout, styling, and formatting.
    
User Input: "${userInput}"
Current Resume: ${JSON.stringify(context.currentResume)}

Return JSON with design tool calls:
{
  "tools": [
    {
      "name": "apply_template",
      "parameters": {
        "template": "professional",
        "colorScheme": "blue",
        "layout": "two-column"
      }
    }
  ],
  "reasoning": "Design changes being applied"
}`;

    const result = await this.model.generateContent(prompt);
    return this.parseResponse(result.response.text());
  }

  parseResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { tools: [], reasoning: "Failed to parse" };
    } catch {
      return { tools: [], reasoning: "Parse error" };
    }
  }
}

export class ResumeOptimizationAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.role = "resume_optimizer";
  }

  async process(userInput, context) {
    const prompt = `You are a resume optimization specialist. Improve ATS compatibility and content quality.
    
User Input: "${userInput}"
Current Resume: ${JSON.stringify(context.currentResume)}

Return JSON with optimization tool calls:
{
  "tools": [
    {
      "name": "optimize_keywords",
      "parameters": {
        "targetRole": "software engineer",
        "keywords": [...]
      }
    }
  ],
  "reasoning": "Optimizations being applied"
}`;

    const result = await this.model.generateContent(prompt);
    return this.parseResponse(result.response.text());
  }

  parseResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { tools: [], reasoning: "Failed to parse" };
    } catch {
      return { tools: [], reasoning: "Parse error" };
    }
  }
}