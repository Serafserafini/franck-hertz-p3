// Shared Plotly styling that follows the CSS variables (light/dark mode) and the language.
import { getLang } from './i18n.js';

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function colors() {
  return {
    fg: cssVar('--fg'), muted: cssVar('--muted'), grid: cssVar('--grid'), card: cssVar('--card'),
    c1: cssVar('--c1'), c2: cssVar('--c2'), c3: cssVar('--c3'),
  };
}

export function baseLayout(extra = {}) {
  const c = colors();
  const { xaxis = {}, yaxis = {}, ...rest } = extra;
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: c.fg, family: 'system-ui, sans-serif', size: 13 },
    margin: { l: 58, r: 16, t: rest.showlegend === false ? 14 : 40, b: 48 },
    xaxis: { gridcolor: c.grid, zerolinecolor: c.grid, linecolor: c.muted, ...xaxis },
    yaxis: { gridcolor: c.grid, zerolinecolor: c.grid, linecolor: c.muted, ...yaxis },
    legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom' }, // above the plot: never covers the x-axis title
    separators: getLang() === 'de' ? ',.' : '.,', // decimal comma in German
    ...rest,
  };
}

export const plotConfig = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
};
