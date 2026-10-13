/**
 * ARCHIVO: components/discover/CategoryModal.tsx
 * DESCRIPCIÓN: Selector modal de categorías para la pantalla 'Descubrir'.
 * Permite al usuario elegir qué carruseles (Géneros, Listas curadas)
 * quiere ver en su muro principal.
 * Diseñado con una estética de tarjeta deslizable (Snap-to-bottom).
 */

import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, FlatList, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CATALOGO_CARRUSELES } from '../../constants/carruseles';

type Props = {
  visible: boolean;
  onClose: () => void;
  carruselesActivos: string[]; // Ids de los carruseles ya visibles
  onToggle: (id: string) => void; // Añadir o quitar
  fontFamily: string;
};

export const CategoryModal = React.memo(
  ({ visible, onClose, carruselesActivos, onToggle, fontFamily }: Props) => {
    const insets = useSafeAreaInsets();

    /** Gestión del botón atrás físico en Android */
    useEffect(() => {
      if (!visible) return;
      const backAction = () => {
        onClose();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [visible, onClose]);

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
          {/* 🔮 FONDO: Efecto de cristal oscuro que ocupa el 85% de la pantalla */}
          <BlurView
            intensity={100}
            tint="dark"
            style={[styles.modalBlur, { paddingBottom: insets.bottom + 10 }]}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { fontFamily }]}>Añadir Categorías</Text>
                  <Text style={[styles.modalSubtitle, { fontFamily }]}>
                    Personaliza tu pantalla de inicio
                  </Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
              </View>

              {/* LISTADO: Grid de categorías disponibles (2 columnas) */}
              <FlatList
                data={CATALOGO_CARRUSELES}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{ gap: 12 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: insets.bottom + 120, // Espacio para el botón flotante
                  paddingTop: 4,
                }}
                renderItem={({ item: def }) => {
                  const selected = carruselesActivos.includes(def.id);
                  return (
                    <Pressable
                      style={[styles.categoryTile, selected && styles.categoryTileSelected]}
                      onPress={() => onToggle(def.id)}
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={20}
                        color={selected ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                      />
                      <Text
                        style={[
                          styles.modalRowText,
                          { fontFamily, color: selected ? '#fff' : 'rgba(255,255,255,0.4)' },
                        ]}
                      >
                        {def.titulo}
                      </Text>
                    </Pressable>
                  );
                }}
              />

              {/* BOTÓN DE ACCIÓN FLOTANTE (Fijado al fondo del modal) */}
              <View style={[styles.floatingFooter, { bottom: insets.bottom + 20 }]}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.aceptarBtn,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                >
                  <Text style={[styles.aceptarText, { fontFamily }]}>Hecho</Text>
                </Pressable>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBlur: {
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
  },
  modalCard: { flex: 1, padding: 24 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  modalSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 12,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  categoryTileSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  modalRowText: { marginLeft: 10, fontSize: 14, fontWeight: '700' },
  floatingFooter: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  aceptarBtn: {
    backgroundColor: '#38bdf8',
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  aceptarText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
