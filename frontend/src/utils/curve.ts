/**
 * @file curve.ts
 * @description Utility functions for generating curved paths in SVG
 * @dependencies None
 * @tests curve_test.test.ts
 */

interface Point {
    x: number;
    y: number;
}

interface CurveOptions {
    curvature?: number;  // Controls the curve's bend (0-1)
    orientation?: 'clockwise' | 'counterclockwise';
    offset?: number;     // Offset from midpoint for quadratic curves
}

/**
 * Generates an SVG path string for an arc between two points
 * @param start Starting point coordinates
 * @param end Ending point coordinates
 * @param options Curve configuration options
 * @returns SVG path string
 */
export function generateArcPath(
    start: Point,
    end: Point,
    options: CurveOptions = {}
): string {
    const {
        curvature = 0.5,
        orientation = 'clockwise'
    } = options;

    // Calculate the distance between points
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate the radius based on distance and curvature
    const radius = distance * (1 + curvature);

    // Determine sweep flag based on orientation
    const sweepFlag = orientation === 'clockwise' ? 1 : 0;

    return [
        'M', start.x, start.y,
        'A', radius, radius, 0, 0, sweepFlag,
        end.x, end.y
    ].join(' ');
}

/**
 * Generates an SVG path string for a quadratic curve between two points
 * @param start Starting point coordinates
 * @param end Ending point coordinates
 * @param options Curve configuration options
 * @returns SVG path string
 */
export function generateQuadraticPath(
    start: Point,
    end: Point,
    options: CurveOptions = {}
): string {
    const { offset = 50 } = options;

    // Calculate midpoint
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Calculate control point with offset
    const controlX = midX - offset;
    const controlY = midY - offset;

    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}

/**
 * Calculates the point at a given percentage along a curved path
 * @param start Starting point coordinates
 * @param end Ending point coordinates
 * @param percentage Position along the curve (0-1)
 * @param options Curve configuration options
 * @returns Point coordinates
 */
export function getPointAlongCurve(
    start: Point,
    end: Point,
    percentage: number,
    options: CurveOptions = {}
): Point {
    const { offset = 50 } = options;

    // Calculate control point
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const controlX = midX - offset;
    const controlY = midY - offset;

    // Quadratic Bezier formula
    const t = Math.max(0, Math.min(1, percentage));
    const t1 = 1 - t;

    return {
        x: t1 * t1 * start.x + 2 * t1 * t * controlX + t * t * end.x,
        y: t1 * t1 * start.y + 2 * t1 * t * controlY + t * t * end.y
    };
}

/**
 * Validates if a path string is a valid SVG path
 * @param pathString SVG path string to validate
 * @returns boolean indicating if path is valid
 */
export function isValidPath(pathString: string): boolean {
    try {
        const parser = new DOMParser();
        const svg = parser.parseFromString(
            `<svg><path d="${pathString}"/></svg>`,
            'image/svg+xml'
        );
        return !svg.querySelector('parsererror');
    } catch (e) {
        return false;
    }
} 