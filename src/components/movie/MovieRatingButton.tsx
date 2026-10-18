/**
 * Tu nota de una peli vista, en la ficha. Una cosa y clara: los destellos (o «Nefasta», o
 * «Ponle nota»). Al tocarlo se cambia la nota. La fecha de vista no se enseña aquí: se cambia
 * manteniendo pulsada la peli en la Biblioteca.
 *
 * Va encima de la foto de la peli, que puede ser de cualquier color: por eso lleva una base
 * oscura propia y el borde en el color de marca (nada de dorado, que no pega con el destello).
 * El recuadro se ajusta al contenido en vez de ocupar todo el ancho.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PeliculaUsuario } from '../../types';
import { Destello } from '../common/Destello';
import { COLOR_DESTELLO, COLOR_DESTELLO_APAGADO } from '../common/Cargando';
import { Pulsable } from '../common/Pulsable';

type Props = {
  peliculaUsuario: PeliculaUsuario | null;
  onPress: () => void;
  fontFamily: string;
};

const LADO = 30;

export const MovieRatingButton = React.memo(({ peliculaUsuario, onPress, fontFamily }: Props) => {
  if (!peliculaUsuario || peliculaUsuario.estado !== 'vista') return null;
  const { valoracion } = peliculaUsuario;

  const contenido =
    valoracion === -1 ? (
      <Text style={[styles.texto, { fontFamily }]}>💩 Nefasta</Text>
    ) : valoracion > 0 ? (
      <View style={styles.fila}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Destello
            key={n}
            lado={LADO}
            color={n <= valoracion ? COLOR_DESTELLO : COLOR_DESTELLO_APAGADO}
          />
        ))}
      </View>
    ) : (
      <View style={styles.fila}>
        <Destello lado={22} color={COLOR_DESTELLO} />
        <Text style={[styles.texto, { fontFamily }]}>Ponle nota</Text>
      </View>
    );

  return (
    <View style={styles.centrado}>
      <Pulsable
        style={styles.boton}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          valoracion === -1
            ? 'Tu nota: nefasta. Cambiar'
            : valoracion > 0
              ? `Tu nota: ${valoracion} de 5. Cambiar`
              : 'Ponle nota'
        }
      >
        {contenido}
      </Pulsable>
    </View>
  );
});

const styles = StyleSheet.create({
  centrado: { alignItems: 'center', marginTop: 12 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    // Base oscura: la foto de detrás puede ser de cualquier color
    backgroundColor: 'rgba(2,6,23,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(105,223,217,0.35)',
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  texto: { color: '#F8FAFC', fontSize: 15, fontWeight: '600', marginLeft: 4 },
});
