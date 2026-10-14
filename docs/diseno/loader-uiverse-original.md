# Loader de Uiverse · fuente original

> Fuente: https://uiverse.io/andrew-manzyk/fast-vampirebat-53 (andrew-manzyk, Uiverse.io · MIT)
> Copiado por Álvaro el 14 de octubre de 2026. **Es la referencia: se reproduce, no se interpreta.**

## La figura

No es una estrella de 5 puntas: es un **destello de 4 puntas** con los lados cóncavos (curvos hacia dentro).
Un solo `path`, en un `viewBox="0 0 100 100"`:

```
M63,37c-6.7-4-4-27-13-27s-6.3,23-13,27-27,4-27,13,20.3,9,27,13,4,27,13,27,6.3-23,13-27,27-4,27-13-20.3-9-27-13Z
```

## Las 7 capas, en este orden

Todas usan el MISMO path de arriba. Lo que da el aspecto de joya es la superposición:

1. `fill="currentColor"` — el color base (en la web, `--fill-color: #5c3d99`).
2. `fill="url(#gradient-1)"` — sombra inferior.
3. El **brillo**: `fill="none" stroke="white" opacity="0.3" stroke-width="3" filter="url(#shine)" mask="url(#mask)"`.
4. `fill="url(#gradient-2)"` — luz superior.
5. `fill="url(#gradient-3)"` — luz derecha.
6. `fill="url(#gradient-4)"` — luz inferior ancha.
7. `fill="url(#gradient-5)"` — velo oscuro de abajo arriba.

## Definiciones

```xml
<filter id="shine"><feGaussianBlur stdDeviation="3"/></filter>

<mask id="mask">
  <path d="…el mismo path…" fill="white"/>
</mask>

<radialGradient id="gradient-1" cx="50" cy="66" fx="50" fy="66" r="30"
                gradientTransform="translate(0 35) scale(1 0.5)" gradientUnits="userSpaceOnUse">
  <stop offset="0%"   stop-color="black" stop-opacity="0.3"/>
  <stop offset="50%"  stop-color="black" stop-opacity="0.1"/>
  <stop offset="100%" stop-color="black" stop-opacity="0"/>
</radialGradient>

<radialGradient id="gradient-2" cx="55" cy="20" fx="55" fy="20" r="30" gradientUnits="userSpaceOnUse">
  <stop offset="0%"   stop-color="white" stop-opacity="0.3"/>
  <stop offset="50%"  stop-color="white" stop-opacity="0.1"/>
  <stop offset="100%" stop-color="white" stop-opacity="0"/>
</radialGradient>

<radialGradient id="gradient-3" cx="85" cy="50" fx="85" fy="50" xlink:href="#gradient-2"/>

<radialGradient id="gradient-4" cx="50" cy="58" fx="50" fy="58" r="60"
                gradientTransform="translate(0 47) scale(1 0.2)" xlink:href="#gradient-3"/>

<linearGradient id="gradient-5" x1="50" y1="90" x2="50" y2="10" gradientUnits="userSpaceOnUse">
  <stop offset="0%"  stop-color="black" stop-opacity="0.2"/>
  <stop offset="40%" stop-color="black" stop-opacity="0"/>
</linearGradient>
```

`gradient-3` y `gradient-4` heredan las paradas de `gradient-2` vía `xlink:href`; en react-native-svg
hay que escribirlas otra vez.

## Contenedor

```css
.loader {
  --fill-color: #5c3d99;
  --shine-color: #5c3d9933;
  transform: scale(0.5);
  width: 100px;
  height: auto;
  position: relative;
  filter: drop-shadow(0 0 10px var(--shine-color));
}
```

El movimiento (`flowe-one`, `flowe-two`, `flowe-three`, 1 s lineal infinito, retrasos 0 / 0,3 / 0,6 s)
está en `loader-referencia.md`.

## Al llevarlo a react-native-svg

- Los **ids se repiten** en los tres SVG del original. En React Native tienen que ser únicos por instancia,
  o un gradiente pisa al otro.
- `feGaussianBlur` tiene soporte limitado. Si no funciona, imita el brillo con un trazo blanco suave
  y poca opacidad, pero compruébalo antes de descartarlo.
- `drop-shadow` del contenedor → sombra nativa o una capa de halo detrás.
- `currentColor` es el color que decida Álvaro (morado original `#5c3d99` o turquesa `#69DFD9`).
