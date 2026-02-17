import { supabase } from '../supabaseClient';

export class ArtifactService {
  static async createArtifact(data) {
    const { data: artifact, error } = await supabase
      .from('artifacts')
      .insert({
        type: data.type,
        title: data.title,
        code: data.code,
        metadata: data.metadata,
        user_id: data.user_id,
        conversation_id: data.conversation_id,
        version: 1
      })
      .select()
      .single();
    
    if (error) throw error;
    return artifact;
  }

  static async updateArtifact(id, data) {
    const { data: current } = await supabase
      .from('artifacts')
      .select('version')
      .eq('id', id)
      .single();

    const { data: artifact, error } = await supabase
      .from('artifacts')
      .update({
        code: data.code,
        metadata: data.metadata,
        version: (current?.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return artifact;
  }

  static async getArtifacts(userId) {
    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async deleteArtifact(id) {
    const { error } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}