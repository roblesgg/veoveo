/**
 * Iconos propios de VeoVeo (manual de marca): claqueta y palomitas.
 * Mismo estilo que Tabler: rejilla de 24, trazo de 2 px, extremos y uniones redondeados.
 * Las palomitas solo en tamaño grande (≥ 32): en pequeño se confunden con una papelera.
 */
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { size?: number; color?: string; strokeWidth?: number };

export function IconoClaqueta({ size = 24, color = '#94A3B8', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={10} width={18} height={10} rx={2} />
      <Path d="M3.6 9.2 18.2 4.6a1 1 0 0 1 1.25.66l.6 1.9" />
      <Path d="M8 7.6 9.6 5.9" />
      <Path d="M12.6 6.2 14.2 4.5" />
      <Path d="M3 14h18" />
    </Svg>
  );
}

export function IconoPalomitas({ size = 48, color = '#69DFD9', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.2 11.5a2.8 2.8 0 0 1 1.3-5.3 3.4 3.4 0 0 1 6.5-1.4 2.9 2.9 0 0 1 3.9 4.1 2.6 2.6 0 0 1-.1 2.6" />
      <Path d="M10.6 8.6a2.4 2.4 0 0 1 3.3 0" />
      <Path d="M5.5 11.5h13l-1.7 8.7a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8z" />
      <Path d="M10.2 12v9" />
      <Path d="M13.8 12v9" />
    </Svg>
  );
}
