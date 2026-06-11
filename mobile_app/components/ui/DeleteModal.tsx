import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';
import { tr } from '../../shared/i18n';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeleteModal: React.FC<Props> = ({ visible, onConfirm, onCancel, loading }) => {
  const { language, darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: palette.card }]}>
          <Text style={[styles.title, { color: palette.text }]}>
            {tr(language, 'deleteConfirm')}
          </Text>
          <Text style={[styles.sub, { color: palette.textMuted }]}>
            {tr(language, 'cannotUndo')}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.btn, { borderColor: palette.border, borderWidth: 1 }]}
            >
              <Text style={{ color: palette.text, fontWeight: '600' }}>
                {tr(language, 'cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={[styles.btn, { backgroundColor: Colors.error }]}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {loading ? '...' : tr(language, 'delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 300,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
  },
});
