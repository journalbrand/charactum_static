jest.mock('d3', () => ({
  scaleOrdinal: () => (val: string) => `color-${val}`,
  schemeCategory10: []
}));

import { getNodeColor } from '../nodeColors';

describe('getNodeColor', () => {
  test('returns consistent color for same type', () => {
    const color1 = getNodeColor('TypeA');
    const color2 = getNodeColor('TypeA');
    expect(color1).toBe(color2);
  });

  test('returns different colors for different types', () => {
    const color1 = getNodeColor('TypeA');
    const color2 = getNodeColor('TypeB');
    expect(color1).not.toBe(color2);
  });
});
