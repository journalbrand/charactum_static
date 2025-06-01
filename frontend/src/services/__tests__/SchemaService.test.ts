import SchemaService from '../SchemaService';

declare const global: any;

describe('SchemaService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (SchemaService as any).nodeTypes.clear();
    (SchemaService as any).relationshipTypes.clear();
  });

  test('isValidNodeType loads schema when empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ types: [{ value: 'A' }] }),
    }).mockResolvedValueOnce({
      json: async () => ({ types: [{ value: 'REL' }] }),
    });

    const result = await SchemaService.isValidNodeType('A');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/schema/node-types');
  });

  test('isValidRelationshipType returns false for unknown type', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ types: [{ value: 'A' }] }) })
      .mockResolvedValueOnce({ json: async () => ({ types: [{ value: 'REL' }] }) });
    await SchemaService.isValidNodeType('A');
    const result = await SchemaService.isValidRelationshipType('OTHER');
    expect(result).toBe(false);
  });
});
