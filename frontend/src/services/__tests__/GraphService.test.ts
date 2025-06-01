import GraphService from '../GraphService';

declare const global: any;

describe('GraphService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('createNode sends POST request and returns data', async () => {
    const node = { id: '1', elementId: '1', name: 'A', type: 'Test', description: 'd' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => node,
    });

    const result = await GraphService.createNode({ type: 'Test', name: 'A', description: 'd' } as any);

    expect(global.fetch).toHaveBeenCalledWith('/api/nodes', expect.objectContaining({ method: 'POST' }));
    expect(result).toEqual(node);
  });

  test('deleteNode returns true on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    const res = await GraphService.deleteNode('123');
    expect(global.fetch).toHaveBeenCalledWith('/api/nodes/123', expect.objectContaining({ method: 'DELETE' }));
    expect(res).toBe(true);
  });

  test('deleteNode throws on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'bad' })
    });
    await expect(GraphService.deleteNode('123')).rejects.toThrow('bad');
  });
});
