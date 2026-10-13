/**
 * Paleta de VeoVeo (manual de marca: _marca/drip-garage-recursos/manual-productos/veoveo.md).
 * Celeste = acción principal. Turquesa = Match, destacados y brillos
 * (sustituye al índigo y al morado anteriores; decisión de Álvaro del 13-10-2026).
 */

export const COLORS = {
  primary: '#38bdf8', // Celeste: botones, enlaces y pestaña activa
  accent: '#69DFD9', // Turquesa: Match, destacados y brillos
  onAccent: '#020617', // Texto sobre turquesa o celeste
  background: '#020617', // Noche
  surface: '#0f172a', // Slate 900
  card: '#1e293b', // Slate 800
  text: '#f8fafc', // Slate 50
  textMuted: '#94a3b8', // Slate 400
  error: '#ef4444', // Red 500
  success: '#22c55e', // Green 500
};

export const GRADIENTS = {
  main: ['#020617', '#1E1B4B'] as const,
  card: ['rgba(30, 41, 59, 0.5)', 'rgba(15, 23, 42, 0.8)'] as const,
};

export const GLASS = {
  surface: 'rgba(15, 23, 42, 0.95)',
  border: 'rgba(255, 255, 255, 0.18)',
  white: 'rgba(255, 255, 255, 0.25)',
};

// Legacy Exports for compatibility
export const GradientTop = COLORS.background;
export const GradientBottom = '#1E1B4B';
export const CardSurface = COLORS.surface;
export const GlassSurface = GLASS.surface;
export const GlassBorder = GLASS.border;
export const GlassWhite = GLASS.white;
export const AccentColor = COLORS.primary;
export const AccentBorder = GLASS.border;
