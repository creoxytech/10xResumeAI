import { ArtifactService } from './artifactService';
import pdfMake from 'pdfmake/build/pdfmake';

export class ToolExecutor {
  constructor() {
    this.tools = {
      create_resume_structure: this.createResumeStructure.bind(this),
      update_resume_section: this.updateResumeSection.bind(this),
      apply_template: this.applyTemplate.bind(this),
      optimize_keywords: this.optimizeKeywords.bind(this),
      generate_pdf: this.generatePdf.bind(this),
      store_artifact: this.storeArtifact.bind(this),
      version_artifact: this.versionArtifact.bind(this)
    };
  }

  async executeBatch(toolCalls, context) {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        const tool = this.tools[toolCall.name];
        if (!tool) {
          throw new Error(`Unknown tool: ${toolCall.name}`);
        }
        
        const result = await tool(toolCall.parameters, context);
        results.push({
          toolCall,
          result,
          success: true
        });
      } catch (error) {
        results.push({
          toolCall,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  async createResumeStructure(params, context) {
    const resumeData = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: this.buildResumeContent(params),
      styles: this.getResumeStyles(params.template || 'modern'),
      defaultStyle: { font: 'Helvetica' }
    };

    // Store as artifact
    const artifact = await ArtifactService.createArtifact({
      type: 'resume',
      title: `${params.personalInfo?.name || 'Resume'} - ${params.template || 'Modern'}`,
      code: JSON.stringify(resumeData),
      metadata: { template: params.template, version: 1 },
      user_id: context.userId,
      conversation_id: context.conversationId
    });

    return { resumeData, artifact };
  }

  async updateResumeSection(params, context) {
    // Get current resume
    const currentArtifact = await this.getCurrentResume(context);
    if (!currentArtifact) {
      throw new Error('No resume found to update');
    }

    const resumeData = JSON.parse(currentArtifact.code);
    
    // Apply updates to specific section
    this.applySectionUpdates(resumeData, params.section, params.updates);

    // Version the artifact
    const updatedArtifact = await ArtifactService.updateArtifact(currentArtifact.id, {
      code: JSON.stringify(resumeData),
      metadata: { ...currentArtifact.metadata, lastUpdate: params.section }
    });

    return { resumeData, artifact: updatedArtifact };
  }

  async applyTemplate(params, context) {
    const currentArtifact = await this.getCurrentResume(context);
    if (!currentArtifact) {
      throw new Error('No resume found to redesign');
    }

    const resumeData = JSON.parse(currentArtifact.code);
    
    // Apply new template styles
    resumeData.styles = this.getResumeStyles(params.template);
    if (params.colorScheme) {
      this.applyColorScheme(resumeData.styles, params.colorScheme);
    }
    if (params.layout) {
      this.applyLayout(resumeData, params.layout);
    }

    const updatedArtifact = await ArtifactService.updateArtifact(currentArtifact.id, {
      code: JSON.stringify(resumeData),
      metadata: { 
        ...currentArtifact.metadata, 
        template: params.template,
        colorScheme: params.colorScheme,
        layout: params.layout
      }
    });

    return { resumeData, artifact: updatedArtifact };
  }

  async optimizeKeywords(params, context) {
    const currentArtifact = await this.getCurrentResume(context);
    if (!currentArtifact) {
      throw new Error('No resume found to optimize');
    }

    const resumeData = JSON.parse(currentArtifact.code);
    
    // Apply keyword optimization
    this.enhanceWithKeywords(resumeData, params.keywords, params.targetRole);

    const updatedArtifact = await ArtifactService.updateArtifact(currentArtifact.id, {
      code: JSON.stringify(resumeData),
      metadata: { 
        ...currentArtifact.metadata, 
        optimizedFor: params.targetRole,
        keywords: params.keywords
      }
    });

    return { resumeData, artifact: updatedArtifact };
  }

  async generatePdf(params, context) {
    const resumeData = params.resumeData || JSON.parse(params.resumeCode);
    
    return new Promise((resolve, reject) => {
      const pdfDoc = pdfMake.createPdf(resumeData);
      pdfDoc.getBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({ url, blob, size: blob.size });
      });
    });
  }

  buildResumeContent(params) {
    const { personalInfo, sections } = params;
    const content = [];

    // Header
    if (personalInfo) {
      content.push(
        { text: personalInfo.name || 'Your Name', style: 'header', alignment: 'center' },
        { text: personalInfo.title || 'Professional Title', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] }
      );

      if (personalInfo.contact) {
        content.push({
          columns: [
            { text: personalInfo.contact.phone || '', style: 'contact' },
            { text: personalInfo.contact.email || '', style: 'contact', alignment: 'right' }
          ],
          margin: [0, 0, 0, 20]
        });
      }
    }

    // Sections
    if (sections) {
      sections.forEach(section => {
        content.push(
          { text: section.title.toUpperCase(), style: 'sectionHeader' },
          ...this.buildSectionContent(section)
        );
      });
    }

    return content;
  }

  buildSectionContent(section) {
    switch (section.type) {
      case 'experience':
        return section.items.map(item => [
          { text: item.title, style: 'jobTitle', margin: [0, 10, 0, 5] },
          { text: item.duration, style: 'duration', margin: [0, 0, 0, 10] },
          { ul: item.bullets || [], style: 'bulletPoints' }
        ]).flat();
      
      case 'skills':
        return [{ text: section.content, style: 'skills' }];
      
      default:
        return [{ text: section.content || '', style: 'normal' }];
    }
  }

  getResumeStyles(template) {
    const baseStyles = {
      header: { fontSize: 24, bold: true },
      subheader: { fontSize: 16, italics: true },
      contact: { fontSize: 10 },
      sectionHeader: { fontSize: 14, bold: true, margin: [0, 15, 0, 8] },
      jobTitle: { fontSize: 12, bold: true },
      duration: { fontSize: 10, italics: true },
      bulletPoints: { fontSize: 11, margin: [20, 0, 0, 0] },
      skills: { fontSize: 11 }
    };

    switch (template) {
      case 'professional':
        return {
          ...baseStyles,
          header: { ...baseStyles.header, color: '#1e40af' },
          sectionHeader: { ...baseStyles.sectionHeader, color: '#1e40af' }
        };
      
      case 'creative':
        return {
          ...baseStyles,
          header: { ...baseStyles.header, color: '#7c3aed' },
          sectionHeader: { ...baseStyles.sectionHeader, color: '#7c3aed' }
        };
      
      default:
        return {
          ...baseStyles,
          header: { ...baseStyles.header, color: '#2563eb' },
          sectionHeader: { ...baseStyles.sectionHeader, color: '#2563eb' }
        };
    }
  }

  async getCurrentResume(context) {
    const artifacts = await ArtifactService.getArtifacts(context.userId);
    return artifacts.find(a => a.type === 'resume' && a.conversation_id === context.conversationId);
  }

  applySectionUpdates(resumeData, section, updates) {
    // Implementation for updating specific resume sections
    // This would modify the resumeData content based on the section and updates
  }

  applyColorScheme(styles, colorScheme) {
    const colors = {
      blue: '#2563eb',
      green: '#059669',
      purple: '#7c3aed',
      red: '#dc2626'
    };
    
    const color = colors[colorScheme] || colors.blue;
    styles.header.color = color;
    styles.sectionHeader.color = color;
  }

  applyLayout(resumeData, layout) {
    // Implementation for different layout structures
    // This would restructure the content based on layout type
  }

  enhanceWithKeywords(resumeData, keywords, targetRole) {
    // Implementation for keyword optimization
    // This would enhance content with relevant keywords
  }
}