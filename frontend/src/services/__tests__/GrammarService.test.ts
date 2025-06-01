import GrammarService from '../GrammarService';

declare const global: any;

describe('GrammarService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('listGrammars returns data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ grammars: ['a'], current: 'a' }) });
    const data = await GrammarService.listGrammars();
    expect(global.fetch).toHaveBeenCalledWith('/api/grammars');
    expect(data.current).toBe('a');
  });

  test('selectGrammar sends post', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ current: 'b' }) });
    await GrammarService.selectGrammar('b');
    expect(global.fetch).toHaveBeenCalledWith('/api/grammars/select', expect.any(Object));
  });
});
