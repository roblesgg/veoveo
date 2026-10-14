# Loader de referencia (elegido por Álvaro, 14-10-2026)

Origen: Uiverse.io, autor **andrew-manzyk**. Tres piezas (peonzas) que caen desde arriba,
escalonadas, con escala y giro, y se desvanecen abajo. Se reproduce **fielmente** el movimiento en
`src/components/common/LoaderCaida.tsx` (Reanimated, hilo de UI). Las mejoras se proponen al lado,
nunca en su lugar.

Adaptación:
- Distancias: pensadas para una caja de 100 px a escala 0,5. En la app se calculan sobre el tamaño
  del loader (unidad = tamaño / 100), así valen los tres tamaños (pequeño, mediano y grande).
- `drop-shadow`: halo detrás de cada pieza.
- Color: el original es morado `#5c3d99` (fuera de la paleta). Álvaro elige entre ese y turquesa
  `#69DFD9` con halo `#69DFD933`.
- Forma: el original es una peonza (su SVG no venía en la referencia; se dibuja una aproximada).
  Se proponen también palomita y claqueta con el mismo movimiento; Álvaro elige.
- Reducir movimiento: fundido simple.

```css
.loader { --fill-color:#5c3d99; --shine-color:#5c3d9933; transform:scale(.5);
  width:100px; height:auto; position:relative;
  filter: drop-shadow(0 0 10px var(--shine-color)); }
.loader #pegtopone   { position:absolute; animation: flowe-one 1s linear infinite; }
.loader #pegtoptwo   { position:absolute; opacity:0; transform:scale(0) translateY(-200px) translateX(-100px);
                       animation: flowe-two 1s linear infinite; animation-delay:.3s; }
.loader #pegtopthree { position:absolute; opacity:0; transform:scale(0) translateY(-200px) translateX(100px);
                       animation: flowe-three 1s linear infinite; animation-delay:.6s; }

@keyframes flowe-one {
  0%   { transform:scale(.5)  translateY(-200px); opacity:0 }
  25%  { transform:scale(.75) translateY(-100px); opacity:1 }
  50%  { transform:scale(1)   translateY(0px);    opacity:1 }
  75%  { transform:scale(.5)  translateY(50px);   opacity:1 }
  100% { transform:scale(0)   translateY(100px);  opacity:0 } }

@keyframes flowe-two {
  0%   { transform:scale(.5) rotateZ(-10deg) translateY(-200px) translateX(-100px); opacity:0 }
  25%  { transform:scale(1)  rotateZ(-5deg)  translateY(-100px) translateX(-50px);  opacity:1 }
  50%  { transform:scale(1)  rotateZ(0deg)   translateY(0px)    translateX(-25px);  opacity:1 }
  75%  { transform:scale(.5) rotateZ(5deg)   translateY(50px)   translateX(0px);    opacity:1 }
  100% { transform:scale(0)  rotateZ(10deg)  translateY(100px)  translateX(25px);   opacity:0 } }

@keyframes flowe-three {
  0%   { transform:scale(.5) rotateZ(10deg)  translateY(-200px) translateX(100px); opacity:0 }
  25%  { transform:scale(1)  rotateZ(5deg)   translateY(-100px) translateX(50px);  opacity:1 }
  50%  { transform:scale(1)  rotateZ(0deg)   translateY(0px)    translateX(25px);  opacity:1 }
  75%  { transform:scale(.5) rotateZ(-5deg)  translateY(50px)   translateX(0px);   opacity:1 }
  100% { transform:scale(0)  rotateZ(-10deg) translateY(100px)  translateX(-25px); opacity:0 } }
```
