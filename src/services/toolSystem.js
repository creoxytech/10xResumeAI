import { ArtifactService } from './artifactService';
import { supabase } from '../supabaseClient';
import pdfMake from 'pdfmake/build/pdfmake';

export class ToolSystem {
  static async generatePdf(params) {
    const { content, userId, conversationId, title } = params;
    
    try {
      // Generate PDF using pdfMake
      const docDefinition = typeof content === 'string' 
        ? JSON.parse(content) 
        : content;
      
      const pdfDoc = pdfMake.createPdf(docDefinition);
      
      return new Promise((resolve, reject) => {
        pdfDoc.getBlob(async (blob) => {
          try {
            const url = URL.createObjectURL(blob);
            
            // Store artifact
            const artifact = await ArtifactService.createArtifact({
              type: 'pdf',
              title: title || 'Generated PDF',
              code: JSON.stringify(docDefinition),
              metadata: { 
                url, 
                size: blob.size,
                mimeType: 'application/pdf'
              },
              user_id: userId,
              conversation_id: conversationId
            });
            
            resolve({ artifact, url, blob });
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  static async generateCode(params) {
    const { code, type, title, userId, conversationId } = params;
    
    const artifact = await ArtifactService.createArtifact({
      type: type || 'javascript',
      title: title || 'Generated Code',
      code,
      metadata: { language: type },
      user_id: userId,
      conversation_id: conversationId
    });
    
    return { artifact };
  }

  static async renderArtifact(artifactId) {
    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', artifactId)
      .single();
    
    if (!artifact) throw new Error('Artifact not found');
    
    switch (artifact.type) {
      case 'pdf':
        return { type: 'pdf', url: artifact.metadata.url };
      case 'javascript':
        return { type: 'code', code: artifact.code };
      default:
        return { type: 'text', content: artifact.code };
    }
  }

  static async executeTools(toolCalls, context) {
    const results = [];
    
    for (const call of toolCalls) {
      try {
        let result;
        
        switch (call.name) {
          case 'generate_pdf':
            result = await this.generatePdf({ ...call.parameters, ...context });
            break;
          case 'generate_code':
            result = await this.generateCode({ ...call.parameters, ...context });
            break;
          case 'render_artifact':
            result = await this.renderArtifact(call.parameters.artifactId);
            break;
          default:
            throw new Error(`Unknown tool: ${call.name}`);
        }
        
        results.push({ call, result, success: true });
      } catch (error) {
        results.push({ call, error: error.message, success: false });
      }
    }
    
    return results;
  }
}