import { generateArcPath, generateQuadraticPath, getPointAlongCurve, isValidPath } from '../curve';

describe('curve utilities', () => {
  test('generateArcPath creates clockwise and counterclockwise arcs', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 0 };
    const clockwise = generateArcPath(start, end);
    const counter = generateArcPath(start, end, { orientation: 'counterclockwise' });

    expect(clockwise).toContain('A 150 150 0 0 1 100 0');
    expect(counter).toContain('A 150 150 0 0 0 100 0');
  });

  test('generateQuadraticPath returns correct control point', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };
    const path = generateQuadraticPath(start, end);
    expect(path).toBe('M 0 0 Q 0 0 100 100');
  });

  test('getPointAlongCurve returns point on curve', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 100 };
    const point = getPointAlongCurve(start, end, 0.5);
    expect(point.x).toBeCloseTo(25);
    expect(point.y).toBeCloseTo(25);
  });

  test('isValidPath returns boolean for parsed svg path', () => {
    const valid = isValidPath('M 0 0 L 10 10');
    const invalid = isValidPath('M 0 0 L');
    expect(valid).toBe(true);
    expect(typeof invalid).toBe('boolean');
  });
});
