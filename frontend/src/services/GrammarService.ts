class GrammarService {
  async listGrammars() {
    const res = await fetch('/api/grammars');
    if (!res.ok) throw new Error('Failed to list grammars');
    return res.json();
  }

  async selectGrammar(name: string) {
    const res = await fetch('/api/grammars/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to select grammar');
    return res.json();
  }

  async getGrammar(name: string) {
    const res = await fetch(`/api/grammars/${name}`);
    if (!res.ok) throw new Error('Failed to get grammar');
    return res.json();
  }

  async updateGrammar(name: string, data: any) {
    const res = await fetch(`/api/grammars/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update grammar');
    return res.json();
  }

  async duplicateGrammar(name: string, newName: string) {
    const res = await fetch('/api/grammars/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, new_name: newName })
    });
    if (!res.ok) throw new Error('Failed to duplicate grammar');
    return res.json();
  }

  async deleteGrammar(name: string) {
    const res = await fetch(`/api/grammars/${name}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete grammar');
    return res.json();
  }
}

export default new GrammarService();
