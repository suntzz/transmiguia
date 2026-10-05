import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  useScreenAnnouncement('Bienvenido a TransMilenio Accesible. Conoce las tres ayudas sensoriales de la aplicación.');

  return (
    <ScreenContainer showDemoBanner={false}>
      <View style={styles.container}>
        {/* Top Brand Bar */}
        <View style={styles.topBar}>
          <View
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="TRANSMILENIO ACCESIBLE"
            style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <MaterialIcons name="directions-bus" size={20} color={colors.textInverse} />
            </View>
            <Text allowFontScaling={true} style={styles.brandTitle}>
              TransMilenio Accesible
            </Text>
          </View>

          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>BIENVENIDO</Text>
          </View>
        </View>

        {/* Hero Welcome Card */}
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="accessible" size={28} color={colors.primary} />
          </View>
          <Text allowFontScaling={true} style={styles.title}>
            Tu guía de viaje accesible
          </Text>
          <Text allowFontScaling={true} style={styles.subtitle}>
            Diseñada especialmente para personas con discapacidad visual con asistencia sensorial por voz, vibración y GPS en Bogotá.
          </Text>
        </View>

        {/* Feature Cards: 3 Sensory Feedback Pillars */}
        <View style={styles.featuresList}>
          {/* Feature 1: Voice */}
          <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Función 1: Navegación por Voz. Instrucciones narradas paso a paso para caminar, abordar y descender."
            style={styles.featureCard}>
            <View style={[styles.featureIconWrap, styles.iconVoice]}>
              <MaterialIcons name="record-voice-over" size={22} color={colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text allowFontScaling={true} style={styles.featureTitle}>
                Guía por Voz
              </Text>
              <Text allowFontScaling={true} style={styles.featureDescription}>
                Escucha indicaciones claras de orientación en cada rampa, torniquete y plataforma.
              </Text>
            </View>
          </View>

          {/* Feature 2: Vibration */}
          <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Función 2: Alertas por Vibración. Pulsos táctiles hápticos antes de llegar a tu estación de destino."
            style={styles.featureCard}>
            <View style={[styles.featureIconWrap, styles.iconHaptic]}>
              <MaterialIcons name="vibration" size={22} color={colors.accentText} />
            </View>
            <View style={styles.featureContent}>
              <Text allowFontScaling={true} style={styles.featureTitle}>
                Alertas por Vibración
              </Text>
              <Text allowFontScaling={true} style={styles.featureDescription}>
                Pulsos táctiles distintivos que te advierten con una parada de anticipación para bajar.
              </Text>
            </View>
          </View>

          {/* Feature 3: GPS */}
          <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Función 3: Monitoreo GPS. Conteo en tiempo real de estaciones del sistema TransMilenio."
            style={styles.featureCard}>
            <View style={[styles.featureIconWrap, styles.iconGps]}>
              <MaterialIcons name="my-location" size={22} color={colors.success} />
            </View>
            <View style={styles.featureContent}>
              <Text allowFontScaling={true} style={styles.featureTitle}>
                Seguimiento en Ruta
              </Text>
              <Text allowFontScaling={true} style={styles.featureDescription}>
                Monitoreo automático de paradas recorridas y estaciones de transbordo.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <AccessibleButton
            label="Configurar Permisos"
            subtitle="Activar ubicación GPS y micrófono"
            variant="primary"
            size="large"
            icon="security"
            hint="Abre la pantalla de configuración de permisos requeridos"
            accessibilityLabel="Configurar Permisos. Activar ubicación GPS y micrófono."
            onPress={() => navigation.navigate('Permissions')}
          />

          <AccessibleButton
            label="Ir a la Pantalla Principal"
            subtitle="Comenzar a explorar estaciones y rutas"
            variant="secondary"
            icon="home"
            hint="Ir directamente a la pantalla de inicio"
            accessibilityLabel="Ir a la Pantalla Principal"
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  stepBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stepBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  featuresList: {
    gap: spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.subtle,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconVoice: {
    backgroundColor: colors.primaryLight,
  },
  iconHaptic: {
    backgroundColor: colors.accentLight,
  },
  iconGps: {
    backgroundColor: '#ECFDF5',
  },
  featureContent: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  actionGroup: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
