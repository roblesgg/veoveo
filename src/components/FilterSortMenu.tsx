import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBorder, GlassSurface } from '../theme/colors';

export type FilterSortOption = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: FilterSortOption[];
  currentValue: string | number;
  onSelect: (value: any) => void;
  /** Optional second section for filters */
  filters?: FilterSortOption[];
  currentFilter?: string | number | null;
  selectedFilters?: (string | number)[];
  onSelectFilter?: (value: any) => void;
  onToggleFilter?: (value: any) => void;
  filterTitle?: string;
  multiSelect?: boolean;
  children?: React.ReactNode;
};

const { height: screenHeight } = Dimensions.get('window');

const Container = Platform.OS === 'ios' ? BlurView : View;

export function FilterSortMenu({
  visible,
  onClose,
  title,
  options,
  currentValue,
  onSelect,
  filters,
  currentFilter,
  selectedFilters = [],
  onSelectFilter,
  onToggleFilter,
  filterTitle,
  multiSelect = false,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <View style={[styles.sheet, { maxHeight: screenHeight * 0.8 }]}>
        <Container
          intensity={100}
          tint="dark"
          style={[styles.sheetInner, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.handle} />

          <Text style={styles.sheetTitle}>{title}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
          >
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.item, currentValue === opt.value && styles.itemActive]}
                onPress={() => {
                  onSelect(opt.value);
                  if (!filters) onClose();
                }}
              >
                <View
                  style={[styles.iconWrap, currentValue === opt.value && styles.iconWrapActive]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={currentValue === opt.value ? '#020617' : 'rgba(255,255,255,0.9)'}
                  />
                </View>
                <View style={styles.itemText}>
                  <Text
                    style={[styles.itemLabel, currentValue === opt.value && styles.itemLabelActive]}
                  >
                    {opt.label}
                  </Text>
                  {opt.description && <Text style={styles.itemDesc}>{opt.description}</Text>}
                </View>
                {currentValue === opt.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#69DFD9" />
                )}
              </Pressable>
            ))}

            {filters && filters.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sheetTitle}>{filterTitle || 'Filtrar por'}</Text>
                {filters.map((opt) => {
                  const isActive = multiSelect
                    ? selectedFilters.includes(opt.value)
                    : currentFilter === opt.value;

                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.item, isActive && styles.itemActive]}
                      onPress={() => {
                        if (multiSelect) {
                          onToggleFilter?.(opt.value);
                        } else {
                          onSelectFilter?.(opt.value);
                          onClose();
                        }
                      }}
                    >
                      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                        <Ionicons
                          name={opt.icon}
                          size={22}
                          color={isActive ? '#020617' : 'rgba(255,255,255,0.9)'}
                        />
                      </View>
                      <View style={styles.itemText}>
                        <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                          {opt.label}
                        </Text>
                        {opt.description && <Text style={styles.itemDesc}>{opt.description}</Text>}
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={24} color="#69DFD9" />}
                    </Pressable>
                  );
                })}
              </>
            )}

            {children}
          </ScrollView>
        </Container>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sheetInner: {
    padding: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(15,15,25,0.95)',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '900',
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemActive: {
    backgroundColor: 'rgba(105,223,217,0.15)',
    borderColor: 'rgba(105,223,217,0.4)',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconWrapActive: {
    backgroundColor: '#69DFD9',
  },
  itemText: { flex: 1 },
  itemLabel: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
  },
  itemLabelActive: {
    color: '#fff',
  },
  itemDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 20,
  },
});
