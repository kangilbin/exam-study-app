import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';

interface AdGateOverlayProps {
  isWaitingForAd: boolean;
  adBlockedCountdown: number | null;
  proceedImmediately: () => void;
}

export const AdGateOverlay = ({ isWaitingForAd, adBlockedCountdown, proceedImmediately }: AdGateOverlayProps) => {
  if (isWaitingForAd) {
    return (
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>잠시 후 광고가 시작됩니다...</Text>
        </View>
      </View>
    );
  }

  if (adBlockedCountdown !== null) {
    return (
      <View style={styles.overlay}>
        <View style={styles.box}>
          <MaterialCommunityIcons name="wifi-off" size={32} color={COLORS.gray[400]} />
          <Text style={styles.blockedTitle}>광고를 불러올 수 없습니다</Text>
          <Text style={styles.blockedSub}>
            {adBlockedCountdown > 0
              ? `${adBlockedCountdown}초 후 자동으로 진입합니다`
              : '진입 중...'}
          </Text>
          {adBlockedCountdown > 0 && (
            <Pressable style={styles.button} onPress={proceedImmediately}>
              <Text style={styles.buttonText}>지금 진입</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  blockedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  blockedSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});