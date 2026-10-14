/**
 * Hoja para denunciar a un usuario, un mensaje o un grupo: motivo, detalle opcional y,
 * si se denuncia a una persona, la opción de bloquearla a la vez.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconCheck, IconFlag } from '@tabler/icons-react-native';
import {
  denunciar,
  MAX_DETALLE_DENUNCIA,
  MOTIVOS_DENUNCIA,
  type MotivoDenuncia,
  type ObjetoDenuncia,
} from '../../services/repositorioDenuncias';
import { bloquearUsuario } from '../../services/repositorioSocial';
import { COLORS } from '../../theme/colors';
import { FUENTES } from '../../theme/useMontserrat';
import { BotonPrincipal } from './Botones';
import { CampoTexto } from './Campos';
import { FondoCristal } from './FondoCristal';
import { HojaBase } from './HojaBase';
import { Pulsable } from './Pulsable';

type Props = {
  /** null = cerrada */
  objeto: ObjetoDenuncia | null;
  /** Para los textos: «Denunciar a Ana», «Denunciar el grupo» */
  titulo: string;
  /** Nombre de la persona a la que se ofrece bloquear (solo usuario o mensaje) */
  nombreBloqueo?: string;
  onCerrar: () => void;
  /** Tras bloquear (por ejemplo, para salir de su perfil) */
  onBloqueado?: () => void;
};

export function HojaDenuncia({ objeto, titulo, nombreBloqueo, onCerrar, onBloqueado }: Props) {
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [detalle, setDetalle] = useState('');
  const [bloquear, setBloquear] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, empieza de cero
  const abierta = Boolean(objeto);
  useEffect(() => {
    if (!abierta) return;
    setMotivo(null);
    setDetalle('');
    setBloquear(false);
    setEnviada(false);
    setError(null);
  }, [abierta]);

  const puedeBloquear = Boolean(objeto && objeto.tipo !== 'chat' && nombreBloqueo);

  const enviar = async () => {
    if (!objeto || !motivo) return;
    setEnviando(true);
    setError(null);
    try {
      await denunciar(objeto, motivo, detalle);
      if (bloquear && puedeBloquear) await bloquearUsuario(objeto.contra);
      setEnviada(true);
    } catch {
      setError('No hemos podido enviar la denuncia. Revisa la conexión.');
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = () => {
    const bloqueado = enviada && bloquear && puedeBloquear;
    onCerrar();
    if (bloqueado) onBloqueado?.();
  };

  return (
    <HojaBase visible={Boolean(objeto)} onCerrar={cerrar}>
      <View style={[styles.hoja, { paddingBottom: insets.bottom + 20 }]}>
        <FondoCristal />
        {enviada ? (
          <View style={styles.gracias}>
            <IconFlag size={44} color={COLORS.primary} strokeWidth={1.6} />
            <Text style={styles.titulo}>Gracias por avisarnos</Text>
            <Text style={styles.texto}>
              Revisaremos la denuncia y actuaremos si incumple las normas de VeoVeo. Quien has
              denunciado no sabrá que has sido tú.
              {bloquear && puedeBloquear ? `\n\nHas bloqueado a ${nombreBloqueo}.` : ''}
            </Text>
            <BotonPrincipal texto="Cerrar" onPress={cerrar} estilo={styles.boton} />
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.texto}>¿Qué pasa? No se lo diremos a nadie.</Text>
            <View style={styles.motivos}>
              {MOTIVOS_DENUNCIA.map((m) => {
                const marcado = motivo === m.id;
                return (
                  <Pulsable
                    key={m.id}
                    style={[styles.motivo, marcado && styles.motivoOn]}
                    onPress={() => setMotivo(m.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: marcado }}
                  >
                    <View style={[styles.radio, marcado && styles.radioOn]} />
                    <Text style={styles.motivoTexto}>{m.texto}</Text>
                  </Pulsable>
                );
              })}
            </View>
            <CampoTexto
              value={detalle}
              onChangeText={setDetalle}
              placeholder="Cuéntanos más (opcional)"
              estilo={styles.campo}
              multiline
              maxLength={MAX_DETALLE_DENUNCIA}
            />
            {puedeBloquear && (
              <Pulsable
                style={styles.filaBloqueo}
                onPress={() => setBloquear((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: bloquear }}
              >
                <View style={[styles.casilla, bloquear && styles.casillaOn]}>
                  {bloquear && <IconCheck size={16} color={COLORS.onAccent} strokeWidth={3} />}
                </View>
                <Text style={styles.motivoTexto}>Bloquear también a {nombreBloqueo}</Text>
              </Pulsable>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <BotonPrincipal
              texto="Enviar denuncia"
              estilo={styles.boton}
              desactivado={!motivo}
              cargando={enviando}
              onPress={() => void enviar()}
            />
          </ScrollView>
        )}
      </View>
    </HojaBase>
  );
}

const styles = StyleSheet.create({
  hoja: {
    maxHeight: '90%',
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  titulo: { color: COLORS.text, fontSize: 20, fontFamily: FUENTES.titulo, textAlign: 'center' },
  texto: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginTop: 6,
  },
  motivos: { marginTop: 16, gap: 8 },
  motivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  motivoOn: { borderColor: COLORS.primary, backgroundColor: 'rgba(105,223,217,0.08)' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  radioOn: { borderColor: COLORS.primary, borderWidth: 6 },
  motivoTexto: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: FUENTES.texto },
  campo: { marginTop: 14, maxHeight: 140 },
  filaBloqueo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    marginTop: 12,
  },
  boton: { marginTop: 18 },
  gracias: { alignItems: 'center', gap: 6, paddingVertical: 10 },
});
