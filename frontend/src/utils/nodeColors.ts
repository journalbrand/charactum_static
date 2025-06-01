import * as d3 from 'd3';

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

export function getNodeColor(type: string): string {
  return colorScale(type);
}
