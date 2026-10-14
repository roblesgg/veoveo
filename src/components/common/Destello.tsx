/**
 * El destello de VeoVeo: un único dibujo para el loader y para valorar.
 * Reproducción fiel del original de Uiverse (andrew-manzyk, MIT; fuente completa en
 * docs/diseno/loader-uiverse-original.md): destello de 4 puntas con los lados cóncavos y las
 * SIETE capas del mismo path que le dan el aspecto de joya, en este orden:
 *   1 color base · 2 sombra inferior · 3 brillo (trazo blanco desenfocado, recortado con máscara)
 *   4 luz superior · 5 luz derecha · 6 luz inferior ancha · 7 velo oscuro de abajo arriba
 * Los ids de degradados, máscara y filtros llevan sufijo por instancia: en react-native-svg un id
 * repetido hace que un degradado pise a otro (en el original se repiten).
 * `halo` imita el drop-shadow del contenedor original (desenfoque del color de brillo detrás).
 */
import { useRef } from 'react';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export const DESTELLO =
  'M63,37c-6.7-4-4-27-13-27s-6.3,23-13,27-27,4-27,13,20.3,9,27,13,4,27,13,27,6.3-23,13-27,27-4,27-13-20.3-9-27-13Z';

let contador = 0;

type Props = {
  lado: number;
  /** Color base (currentColor del original) */
  color: string;
  /** Color del halo de detrás (en el original, el base al 20 %); sin él, no hay halo */
  brillo?: string;
};

// Las paradas blancas de g2 (g3 y g4 las heredan en el original). Como lista de Stop, no como
// fragmento: react-native-svg busca los Stop entre los hijos directos del degradado.
const lucesBlancas = () => [
  <Stop key="0" offset="0%" stopColor="white" stopOpacity={0.3} />,
  <Stop key="50" offset="50%" stopColor="white" stopOpacity={0.1} />,
  <Stop key="100" offset="100%" stopColor="white" stopOpacity={0} />,
];

export function Destello({ lado, color, brillo }: Props) {
  const id = useRef(`destello${++contador}`).current;
  const u = (nombre: string) => `${id}-${nombre}`;
  const url = (nombre: string) => `url(#${u(nombre)})`;
  return (
    <Svg width={lado} height={lado} viewBox="0 0 100 100">
      <Defs>
        <Filter id={u('brillo')}>
          <FeGaussianBlur stdDeviation={3} />
        </Filter>
        {brillo ? (
          <Filter id={u('halo')} x="-30%" y="-30%" width="160%" height="160%">
            <FeGaussianBlur stdDeviation={5} />
          </Filter>
        ) : null}
        <Mask id={u('mascara')}>
          <Path d={DESTELLO} fill="white" />
        </Mask>
        <RadialGradient
          id={u('g1')}
          cx="50"
          cy="66"
          fx="50"
          fy="66"
          r="30"
          gradientTransform="translate(0 35) scale(1 0.5)"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor="black" stopOpacity={0.3} />
          <Stop offset="50%" stopColor="black" stopOpacity={0.1} />
          <Stop offset="100%" stopColor="black" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id={u('g2')}
          cx="55"
          cy="20"
          fx="55"
          fy="20"
          r="30"
          gradientUnits="userSpaceOnUse"
        >
          {lucesBlancas()}
        </RadialGradient>
        {/* g3 y g4 heredan las paradas de g2 en el original (xlink:href): aquí se repiten */}
        <RadialGradient
          id={u('g3')}
          cx="85"
          cy="50"
          fx="85"
          fy="50"
          r="30"
          gradientUnits="userSpaceOnUse"
        >
          {lucesBlancas()}
        </RadialGradient>
        <RadialGradient
          id={u('g4')}
          cx="50"
          cy="58"
          fx="50"
          fy="58"
          r="60"
          gradientTransform="translate(0 47) scale(1 0.2)"
          gradientUnits="userSpaceOnUse"
        >
          {lucesBlancas()}
        </RadialGradient>
        <LinearGradient id={u('g5')} x1="50" y1="90" x2="50" y2="10" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="black" stopOpacity={0.2} />
          <Stop offset="40%" stopColor="black" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Halo (el drop-shadow del contenedor original) */}
      {brillo ? <Path d={DESTELLO} fill={brillo} filter={url('halo')} /> : null}
      {/* 1 color base */}
      <Path d={DESTELLO} fill={color} />
      {/* 2 sombra inferior */}
      <Path d={DESTELLO} fill={url('g1')} />
      {/* 3 brillo: trazo blanco desenfocado y recortado con la máscara */}
      <Path
        d={DESTELLO}
        fill="none"
        stroke="white"
        opacity={0.3}
        strokeWidth={3}
        filter={url('brillo')}
        mask={url('mascara')}
      />
      {/* 4 luz superior · 5 luz derecha · 6 luz inferior ancha · 7 velo oscuro */}
      <Path d={DESTELLO} fill={url('g2')} />
      <Path d={DESTELLO} fill={url('g3')} />
      <Path d={DESTELLO} fill={url('g4')} />
      <Path d={DESTELLO} fill={url('g5')} />
    </Svg>
  );
}
