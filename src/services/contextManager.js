import { supabase } from '../supabaseClient';

export class ContextManager {
  constructor() {
    this.contextCache = new Map();
  }

  async getContext(conversationId) {
    // Check cache first
    if (this.contextCache.has(conversationId)) {
      return this.contextCache.get(conversationId);
    }

    try {
      // Load conversation history
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // Load artifacts for this conversation
      const { data: artifacts } = await supabase
        .from('artifacts')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('updated_at', { ascending: false });

      // Load user profile/preferences
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      const context = {
        conversationHistory: messages || [],
        artifacts: artifacts || [],
        currentResume: artifacts?.find(a => a.type === 'resume'),
        userProfile: profile,
        previousInputs: this.extractUserInputs(messages || []),
        resumeVersions: artifacts?.filter(a => a.type === 'resume') || [],
        lastActivity: new Date().toISOString()
      };

      // Cache the context
      this.contextCache.set(conversationId, context);
      
      return context;
    } catch (error) {
      console.error('Failed to load context:', error);
      return this.getEmptyContext();
    }
  }

  async updateContext(conversationId, update) {
    try {
      // Get current context
      const context = await this.getContext(conversationId);
      
      // Update context
      const updatedContext = {
        ...context,
        conversationHistory: [
          ...context.conversationHistory,
          {
            role: 'system',
            content: JSON.stringify(update),
            created_at: update.timestamp
          }
        ],
        lastActivity: update.timestamp,
        lastAgentType: update.agentType
      };

      // Update artifacts if any were created
      if (update.toolResults) {
        const newArtifacts = update.toolResults
          .filter(r => r.success && r.result.artifact)
          .map(r => r.result.artifact);
        
        updatedContext.artifacts = [...context.artifacts, ...newArtifacts];
        
        // Update current resume if a resume artifact was created/updated
        const resumeArtifact = newArtifacts.find(a => a.type === 'resume');
        if (resumeArtifact) {
          updatedContext.currentResume = resumeArtifact;
          updatedContext.resumeVersions = [
            resumeArtifact,
            ...context.resumeVersions.filter(r => r.id !== resumeArtifact.id)
          ];
        }
      }

      // Store user profile updates
      await this.updateUserProfile(conversationId, update);

      // Update cache
      this.contextCache.set(conversationId, updatedContext);
      
      return updatedContext;
    } catch (error) {
      console.error('Failed to update context:', error);
      throw error;
    }
  }

  async updateUserProfile(conversationId, update) {
    try {
      // Extract user information from the update
      const profileData = this.extractProfileData(update);
      
      if (Object.keys(profileData).length > 0) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            conversation_id: conversationId,
            ...profileData,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
    }
  }

  extractUserInputs(messages) {
    return messages
      .filter(m => m.role === 'user')
      .map(m => ({
        text: m.text,
        timestamp: m.created_at
      }))
      .slice(-10); // Keep last 10 user inputs
  }

  extractProfileData(update) {
    const profileData = {};
    
    // Extract personal information from tool results
    if (update.toolResults) {
      update.toolResults.forEach(result => {
        if (result.success && result.toolCall.name === 'create_resume_structure') {
          const params = result.toolCall.parameters;
          if (params.personalInfo) {
            profileData.name = params.personalInfo.name;
            profileData.title = params.personalInfo.title;
            profileData.contact = params.personalInfo.contact;
          }
        }
      });
    }

    // Extract preferences from user input patterns
    if (update.userInput) {
      const input = update.userInput.toLowerCase();
      
      // Detect preferred templates
      if (input.includes('professional')) profileData.preferredTemplate = 'professional';
      if (input.includes('creative')) profileData.preferredTemplate = 'creative';
      if (input.includes('modern')) profileData.preferredTemplate = 'modern';
      
      // Detect target roles
      if (input.includes('software engineer')) profileData.targetRole = 'software engineer';
      if (input.includes('product manager')) profileData.targetRole = 'product manager';
      if (input.includes('data analyst')) profileData.targetRole = 'data analyst';
    }

    return profileData;
  }

  getEmptyContext() {
    return {
      conversationHistory: [],
      artifacts: [],
      currentResume: null,
      userProfile: null,
      previousInputs: [],
      resumeVersions: [],
      lastActivity: new Date().toISOString()
    };
  }

  async clearContext(conversationId) {
    this.contextCache.delete(conversationId);
  }

  async getResumeHistory(conversationId) {
    const context = await this.getContext(conversationId);
    return context.resumeVersions.map(resume => ({
      id: resume.id,
      version: resume.version,
      title: resume.title,
      template: resume.metadata?.template,
      updatedAt: resume.updated_at,
      changes: resume.metadata?.lastUpdate
    }));
  }

  async getConversationSummary(conversationId) {
    const context = await this.getContext(conversationId);
    
    return {
      totalMessages: context.conversationHistory.length,
      userInputs: context.previousInputs.length,
      resumeVersions: context.resumeVersions.length,
      currentTemplate: context.currentResume?.metadata?.template,
      lastActivity: context.lastActivity,
      userProfile: context.userProfile
    };
  }
}