/**
 * ARCHIVO: screens/BibliotecaTab.tsx
 * DESCRIPCIÓN: Pestaña de 'Biblioteca'. Permite visualizar y gestionar las películas
 * que el usuario ha marcado como 'Por Ver' o 'Vistas'. Incluye filtros avanzados por
 * plataforma de streaming, ordenación y búsqueda local.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Keyboard,
  BackHandler,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { Image } from 'expo-image';
import { useBiblioteca } from '../context/BibliotecaContext';
import { EsqueletoRejillaPosters } from '../components/common/Esqueleto';
import { IconoPalomitas } from '../components/iconos/IconosPropios';
import { fechaDeVista } from '../services/repositorioPeliculasUsuario';
import { HojaCuandoVista } from '../components/movie/HojaCuandoVista';
import * as Haptics from 'expo-haptics';
import { useQueries } from '@tanstack/react-query';
import { obtenerPlataformasES } from '../hooks/useDescubrir';
import type { PeliculaUsuario } from '../types';
import { posterUrl } from '../services/tmdbClient';
import { usePlataformasRegion } from '../hooks/usePlataformasRegion';
import * as preferences from '../storage/preferences';
import { COLORS, CardSurface } from '../theme/colors';
import { SHADOWS } from '../theme/theme';
import { FilterSortMenu } from '../components/FilterSortMenu';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { RatingBadge } from '../components/RatingBadge';
import { Pulsable } from '../components/common/Pulsable';

const UNA_SEMANA = 1000 * 60 * 60 * 24 * 7;

export function BibliotecaTab({
  fontFamily,
  onPeliculaClick,
  onPerfilClick,
  userFoto,
  resetToken = 0,
}: {
  fontFamily: string;
  onPeliculaClick: (movieId: number) => void;
  onPerfilClick?: () => void;
  userFoto?: string | null;
  resetToken?: number;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user } = useAuth();

  // ESTADOS DE UI Y FILTRADO
  const [seccion, setSeccion] = useState<0 | 1>(0); // 0: Por Ver, 1: Vistas
  // Peli vista cuya fecha se está cambiando (mantener pulsada en Vistas)
  const [cambiandoFecha, setCambiandoFecha] = useState<PeliculaUsuario | null>(null);
  const [orden, setOrden] = useState<'recientes' | 'alpha' | 'fecha_peli' | 'valoracion'>(
    'recientes',
  );
  const [platsSeleccionadas, setPlatsSeleccionadas] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPlatModal, setShowPlatModal] = useState(false);
  const [buscar, setBuscar] = useState(false);
  const [textoBuscar, setTextoBuscar] = useState('');

  // Plataformas que el usuario tiene contratadas (ids guardados en Ajustes), agrupadas por marca
  const [misPlatsIds, setMisPlatsIds] = useState<number[]>([]);
  const { data: plataformasRegion = [] } = usePlataformasRegion();
  const userPlats = useMemo(
    () =>
      plataformasRegion
        .map((g) => ({ name: g.name, ids: g.ids.filter((id) => misPlatsIds.includes(id)) }))
        .filter((g) => g.ids.length > 0),
    [plataformasRegion, misPlatsIds],
  );

  const searchInputRef = useRef<TextInput>(null);
  const scrollerRef = useRef<ScrollView>(null);

  // Biblioteca compartida de la sesión (una sola escucha de Firestore, siempre al día)
  const { porVer, vistas, cargando: cargandoBiblioteca } = useBiblioteca();

  // Efecto para scroll al inicio cuando se pulsa el icono de la tab dos veces
  useEffect(() => {
    if (resetToken > 0) {
      if (buscar) setBuscar(false);
      else scrollerRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [resetToken, buscar]);

  // Carga inicial de preferencias y plataformas disponibles
  useFocusEffect(
    useCallback(() => {
      void preferences.cargarPlataformas().then((ids) => setMisPlatsIds(ids.map(Number)));
      void preferences
        .cargarOrdenBiblioteca(seccion === 0 ? 'por_ver' : 'vistas')
        .then((s) => s && setOrden(s as any));
    }, [seccion]),
  );

  // Hasta la 3.0 las pelis se guardaban sin plataformas: al filtrar se piden a TMDB (en caché una semana)
  const sinPlataformas = useMemo(
    () =>
      platsSeleccionadas.length === 0
        ? []
        : [...porVer, ...vistas]
            .filter((p) => !p.providers?.flatrate?.length)
            .map((p) => p.idPelicula),
    [platsSeleccionadas.length, porVer, vistas],
  );
  const consultasPlataformas = useQueries({
    queries: sinPlataformas.map((id) => ({
      queryKey: ['plataformas', id],
      queryFn: () => obtenerPlataformasES(id),
      staleTime: UNA_SEMANA,
      gcTime: UNA_SEMANA,
      meta: { persistir: true },
    })),
  });
  const plataformasPedidas = useMemo(() => {
    const mapa: Record<number, number[]> = {};
    sinPlataformas.forEach((id, i) => {
      const datos = consultasPlataformas[i]?.data;
      if (datos) mapa[id] = datos.flatrate;
    });
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinPlataformas, consultasPlataformas.map((c) => c.dataUpdatedAt).join(',')]);

  /** Maneja la selección múltiple de plataformas para el filtrado */
  const togglePlataforma = (name: string) => {
    setPlatsSeleccionadas((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  /** 🧠 PROCESAMIENTO DE CONTENIDO:
   * Aplica filtros de texto, filtros de plataforma y ordenación
   * sobre la lista cargada de Firestore.
   */
  const renderContent = useMemo(() => {
    let raw = [...(seccion === 0 ? porVer : vistas)];

    // FILTRO 1: Por Plataforma de Streaming (si la peli se guardó sin plataformas, se usan las pedidas a TMDB)
    if (platsSeleccionadas.length > 0) {
      const allSelectedIds = userPlats
        .filter((up) => platsSeleccionadas.includes(up.name))
        .flatMap((up) => up.ids);
      const plataformasDe = (p: PeliculaUsuario) =>
        p.providers?.flatrate?.length
          ? p.providers.flatrate
          : (plataformasPedidas[p.idPelicula] ?? []);

      raw = raw.filter((p) => plataformasDe(p).some((id) => allSelectedIds.includes(id)));
    }

    // FILTRO 2: Búsqueda por Texto
    if (textoBuscar.trim()) {
      const q = textoBuscar.toLowerCase().trim();
      raw = raw.filter((p) => p.titulo.toLowerCase().includes(q));
    }

    // ORDENACIÓN
    if (orden === 'alpha') raw.sort((a, b) => a.titulo.localeCompare(b.titulo));
    else if (orden === 'fecha_peli')
      raw.sort((a, b) => (b.fechaLanzamiento || '').localeCompare(a.fechaLanzamiento || ''));
    else if (orden === 'valoracion') raw.sort((a, b) => (b.valoracion || 0) - (a.valoracion || 0));
    // Recientes: en Vistas, por cuándo se vio; en Por ver, por cuándo se añadió
    else if (seccion === 1) raw.sort((a, b) => fechaDeVista(b) - fechaDeVista(a));
    else raw.sort((a, b) => b.fechaAnadido - a.fechaAnadido);

    // AGRUPACIÓN TEMPORAL (solo en Vistas, por la fecha en que se vio)
    if (seccion === 1 && orden === 'recientes' && !textoBuscar) {
      const ahora = Date.now();
      const unaSemanaAtras = ahora - 7 * 24 * 60 * 60 * 1000;
      const unMesAtras = ahora - 30 * 24 * 60 * 60 * 1000;
      const semana = raw.filter((p) => fechaDeVista(p) > unaSemanaAtras);
      const mes = raw.filter(
        (p) => fechaDeVista(p) <= unaSemanaAtras && fechaDeVista(p) > unMesAtras,
      );
      const anteriores = raw.filter((p) => fechaDeVista(p) <= unMesAtras);
      return (
        <>
          {semana.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeaderText, { fontFamily }]}>Última semana</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <View style={styles.grid}>{semana.map(renderCard)}</View>
            </>
          )}
          {mes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeaderText, { fontFamily }]}>Último mes</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <View style={styles.grid}>{mes.map(renderCard)}</View>
            </>
          )}
          {anteriores.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeaderText, { fontFamily }]}>Anteriores</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              <View style={styles.grid}>{anteriores.map(renderCard)}</View>
            </>
          )}
          <Text style={[styles.pista, { fontFamily }]}>
            Mantén pulsada una peli para cambiar cuándo la viste.
          </Text>
        </>
      );
    }
    return <View style={styles.grid}>{raw.map(renderCard)}</View>;
  }, [
    seccion,
    porVer,
    vistas,
    orden,
    textoBuscar,
    platsSeleccionadas,
    userPlats,
    plataformasPedidas,
  ]);

  /** Renderiza cada tarjeta de película en el grid */
  function renderCard(p: any) {
    return (
      <View key={p.idPelicula} style={styles.gridItem}>
        <Pulsable
          style={[styles.card, SHADOWS.macLight]}
          onPress={() => onPeliculaClick(p.idPelicula)}
          onLongPress={
            seccion === 1
              ? () => {
                  void Haptics.selectionAsync();
                  setCambiandoFecha(p);
                }
              : undefined
          }
          delayLongPress={350}
        >
          <Image
            source={{ uri: posterUrl(p.rutaPoster, 'w342')! }}
            style={styles.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
          {/* Badge de valoración (Solo en sección de Vistas) */}
          {seccion === 1 && p.valoracion !== undefined && (
            <RatingBadge rating={p.valoracion} fontFamily={fontFamily} hideText />
          )}
        </Pulsable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔮 CABECERA GLASEADA DINÁMICA */}
      <View style={[styles.headerContainer, { height: insets.top + (buscar ? 230 : 150) }]}>
        <BlurView
          intensity={85}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glassOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.12)' }]} />
        <View style={styles.headerBorder} />

        <View style={[styles.headerRow, { top: Math.max(insets.top, 12) + 12 }]}>
          <Text style={[styles.titulo, { fontFamily, flex: 1 }]}>Biblioteca</Text>
          <View style={styles.actionsTopRow}>
            {/* Filtro de TV: Abre el modal de plataformas */}
            <Pulsable
              onPress={() => setShowPlatModal(true)}
              style={[styles.iconBtn, platsSeleccionadas.length > 0 && styles.iconBtnOn]}
              hitSlop={8}
            >
              <Ionicons
                name="tv-outline"
                size={26}
                color={platsSeleccionadas.length > 0 ? '#000' : '#fff'}
              />
            </Pulsable>
            {/* Ordenación: Abre menú contextual */}
            <Pulsable onPress={() => setShowSortMenu(true)} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="swap-vertical-outline" size={26} color="#fff" />
            </Pulsable>
            {/* Lupa: Activa el buscador local */}
            <Pulsable onPress={() => setBuscar(!buscar)} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="search-outline" size={28} color="#fff" />
            </Pulsable>
          </View>
        </View>

        {/* SELECTOR DE ESTADO (POR VER / VISTAS) */}
        <View style={[styles.tabsContainer, { top: Math.max(insets.top, 12) + 90 }]}>
          <Pulsable
            onPress={() => setSeccion(0)}
            style={[styles.tabBtn, seccion === 0 && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, { fontFamily }, seccion === 0 && styles.tabTextActive]}>
              POR VER
            </Text>
          </Pulsable>
          <View style={styles.tabDivider} />
          <Pulsable
            onPress={() => setSeccion(1)}
            style={[styles.tabBtn, seccion === 1 && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, { fontFamily }, seccion === 1 && styles.tabTextActive]}>
              VISTAS
            </Text>
          </Pulsable>
        </View>

        {buscar && (
          <View style={[styles.searchFieldContainer, SHADOWS.macLight]}>
            <TextInput
              ref={searchInputRef}
              value={textoBuscar}
              onChangeText={setTextoBuscar}
              placeholder="Buscar título..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={[styles.searchTextInput, { fontFamily }]}
              autoFocus
            />
          </View>
        )}
      </View>

      <View style={styles.webCenteringWrapper}>
        <ScrollView
          ref={scrollerRef}
          contentContainerStyle={{
            paddingTop: insets.top + (buscar ? 240 : 160),
            paddingBottom: 140,
            paddingHorizontal: 8,
          }}
        >
          {/* BARRA DE FILTROS ACTIVOS */}
          {platsSeleccionadas.length > 0 && (
            <View style={styles.activeFilterBar}>
              <Ionicons name="funnel" size={14} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.activeFilterText, { fontFamily }]} numberOfLines={1}>
                {platsSeleccionadas.join(', ')}
              </Text>
              <Pulsable
                onPress={() => setPlatsSeleccionadas([])}
                style={styles.clearFilterBtn}
                hitSlop={8}
              >
                <Text style={styles.clearFilterText}>BORRAR</Text>
              </Pulsable>
            </View>
          )}
          {cargandoBiblioteca ? (
            <EsqueletoRejillaPosters />
          ) : (seccion === 0 ? porVer : vistas).length === 0 ? (
            <View style={styles.vacio}>
              <IconoPalomitas size={56} />
              <Text style={[styles.vacioTitulo, { fontFamily }]}>
                {seccion === 0 ? 'Tu lista está vacía' : 'Aún no has marcado ninguna vista'}
              </Text>
              <Text style={[styles.vacioTexto, { fontFamily }]}>
                {seccion === 0
                  ? 'Desliza en Descubrir y guarda lo que te llame.'
                  : 'Cuando veas una peli, márcala como vista y valórala.'}
              </Text>
            </View>
          ) : (
            renderContent
          )}
        </ScrollView>
      </View>

      {/* 🛡️ MODAL: Selección de Plataformas */}
      <Modal visible={showPlatModal} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPlatModal(false)}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { fontFamily }]}>Filtrar plataformas</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Pulsable
                style={[styles.platItem, platsSeleccionadas.length === 0 && styles.platItemOn]}
                onPress={() => {
                  setPlatsSeleccionadas([]);
                  setShowPlatModal(false);
                }}
              >
                <Text
                  style={[
                    styles.platItemText,
                    platsSeleccionadas.length === 0 && { color: '#000' },
                  ]}
                >
                  Todas las plataformas
                </Text>
                {platsSeleccionadas.length === 0 && (
                  <Ionicons name="checkmark-circle" size={20} color="#000" />
                )}
              </Pulsable>
              {userPlats.map((p) => (
                <Pulsable
                  key={p.name}
                  style={[
                    styles.platItem,
                    platsSeleccionadas.includes(p.name) && styles.platItemOn,
                  ]}
                  onPress={() => togglePlataforma(p.name)}
                >
                  <Text
                    style={[
                      styles.platItemText,
                      platsSeleccionadas.includes(p.name) && { color: '#000' },
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Ionicons
                    name={platsSeleccionadas.includes(p.name) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={platsSeleccionadas.includes(p.name) ? '#000' : 'rgba(255,255,255,0.3)'}
                  />
                </Pulsable>
              ))}
            </ScrollView>
            <Pulsable style={styles.modalCloseBtn} onPress={() => setShowPlatModal(false)}>
              <Text style={styles.modalCloseText}>LISTO</Text>
            </Pulsable>
          </View>
        </Pressable>
      </Modal>

      {/* Cuándo la viste: las mismas tres opciones (mantener pulsada una peli en Vistas) */}
      <HojaCuandoVista pelicula={cambiandoFecha} onCerrar={() => setCambiandoFecha(null)} />

      {/* MENÚ DE ORDENACIÓN */}
      <FilterSortMenu
        visible={showSortMenu}
        onClose={() => setShowSortMenu(false)}
        title="Ordenar Biblioteca"
        options={[
          {
            label: 'Recientes',
            value: 'recientes',
            icon: 'time-outline',
            description: 'Últimas añadidas arriba.',
          },
          {
            label: 'Título (A-Z)',
            value: 'alpha',
            icon: 'text-outline',
            description: 'Por nombre alfabéticamente.',
          },
          {
            label: 'Lanzamiento',
            value: 'fecha_peli',
            icon: 'calendar-outline',
            description: 'Por año de estreno en cines.',
          },
          {
            label: 'Valoración',
            value: 'valoracion',
            icon: 'star-outline',
            description: 'Tus favoritas primero.',
          },
        ]}
        currentValue={orden}
        onSelect={(v) => {
          setOrden(v as any);
          setShowSortMenu(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pista: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  container: { flex: 1, backgroundColor: '#020617' },
  vacio: { alignItems: 'center', paddingHorizontal: 36, paddingTop: 48, gap: 12 },
  vacioTitulo: { color: '#F8FAFC', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  vacioTexto: { color: '#94A3B8', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  webCenteringWrapper: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    flex: 1,
  },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  headerRow: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center' },
  titulo: { color: '#fff', fontSize: 32, fontWeight: '800' },
  actionsTopRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnOn: { backgroundColor: COLORS.primary, borderRadius: 12 },
  tabsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabBtn: { paddingHorizontal: 20, height: '100%', justifyContent: 'center' },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  tabTextActive: { color: '#fff' },
  tabDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.8)' },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchFieldContainer: {
    position: 'absolute',
    top: 175,
    left: 20,
    right: 20,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  searchTextInput: { flex: 1, color: '#fff', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', padding: 4 },
  card: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 16,
    backgroundColor: CardSurface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  poster: { width: '100%', height: '100%' },
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionHeaderText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(105,223,217,0.2)',
    marginLeft: 16,
  },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(105,223,217,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  activeFilterText: { color: '#fff', fontSize: 13, flex: 1, fontWeight: '600' },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  clearFilterText: { color: COLORS.primary, fontSize: 11, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...SHADOWS.macLight,
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  platItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  platItemOn: { backgroundColor: COLORS.primary },
  platItemText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCloseBtn: {
    marginTop: 24,
    backgroundColor: '#fff',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
