import { ResumeCreationAgent, ResumeEditAgent, ResumeDesignAgent, ResumeOptimizationAgent } from '../agents/resumeAgents';
import { ToolExecutor } from './toolExecutor';
import { ContextManager } from './contextManager';

export class AgentOrchestrator {
  constructor() {
    this.agents = {
      creator: new ResumeCreationAgent(),
      editor: new ResumeEditAgent(),
      designer: new ResumeDesignAgent(),
      optimizer: new ResumeOptimizationAgent()
    };
    this.toolExecutor = new ToolExecutor();
    this.contextManager = new ContextManager();
  }

  async processRequest(userInput, sessionContext) {
    try {
      // Load conversation context
      const context = await this.contextManager.getContext(sessionContext.conversationId);
      
      // Determine which agent to use
      const agentType = this.determineAgent(userInput, context);
      const agent = this.agents[agentType];
      
      // Get agent response with tool calls
      const agentResponse = await agent.process(userInput, {
        ...context,
        userInput,
        sessionContext
      });
      
      // Execute tools
      const toolResults = await this.toolExecutor.executeBatch(
        agentResponse.tools,
        sessionContext
      );
      
      // Update context
      await this.contextManager.updateContext(sessionContext.conversationId, {
        userInput,
        agentType,
        toolResults,
        timestamp: new Date().toISOString()
      });
      
      return {
        agentType,
        reasoning: agentResponse.reasoning,
        toolResults,
        artifacts: toolResults.filter(r => r.success && r.artifact)
      };
    } catch (error) {
      throw new Error(`Orchestration failed: ${error.message}`);
    }
  }

  determineAgent(userInput, context) {
    const input = userInput.toLowerCase();
    
    // Check for design/layout requests
    if (input.includes('design') || input.includes('template') || input.includes('layout') || 
        input.includes('color') || input.includes('style')) {
      return 'designer';
    }
    
    // Check for editing requests
    if (input.includes('edit') || input.includes('change') || input.includes('update') || 
        input.includes('modify') || input.includes('fix')) {
      return 'editor';
    }
    
    // Check for optimization requests
    if (input.includes('optimize') || input.includes('ats') || input.includes('keywords') || 
        input.includes('improve')) {
      return 'optimizer';
    }
    
    // Default to creator for new resumes or unclear requests
    return 'creator';
  }

  async getAgentCapabilities() {
    return {
      creator: "Creates new resumes from scratch",
      editor: "Edits and modifies existing resume content",
      designer: "Changes layout, templates, and visual design",
      optimizer: "Optimizes for ATS and improves content quality"
    };
  }
}