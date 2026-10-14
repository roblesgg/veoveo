/**
 * Tu nota de una peli vista, en la ficha. Una cosa y clara: las estrellas (o «Nefasta», o
 * «Ponle nota»). Al tocarlo se cambia la nota. La fecha de vista no se enseña aquí: se cambia
 * manteniendo pulsada la peli en la Biblioteca.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeliculaUsuario } from '../../types';
import { Destello } from '../common/Destello';
import { COLOR_DESTELLO, COLOR_DESTELLO_APAGADO } from '../common/Cargando';

type Props = {
  peliculaUsuario: PeliculaUsuario | null;
  onPress: () => void;
  fontFamily: string;
};

const ORO = '#FFD700';

export const MovieRatingButton = React.memo(({ peliculaUsuario, onPress, fontFamily }: Props) => {
  if (!peliculaUsuario || peliculaUsuario.estado !== 'vista') return null;
  const { valoracion } = peliculaUsuario;

  const contenido =
    valoracion === -1 ? (
      <Text style={[styles.texto, { fontFamily }]}>💩 Nefasta</Text>
    ) : valoracion > 0 ? (
      <View style={styles.estrellas}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Destello
            key={n}
            lado={22}
            color={n <= valoracion ? COLOR_DESTELLO : COLOR_DESTELLO_APAGADO}
          />
        ))}
      </View>
    ) : (
      <Text style={[styles.texto, { fontFamily }]}>Ponle nota</Text>
    );

  return (
    <Pressable
      style={({ pressed }) => [styles.boton, pressed && { opacity: 0.75 }]}
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
    </Pressable>
  );
});

const styles = StyleSheet.create({
  boton: {
    marginTop: 12,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  estrellas: { flexDirection: 'row', gap: 6 },
  texto: { color: ORO, fontSize: 15, fontWeight: '600' },
});
