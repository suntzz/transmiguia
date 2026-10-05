import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useAppPermissions } from '@/src/hooks/useAppPermissions';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { triggerSuccessHaptic, triggerWarningHaptic } from '@/src/services/hapticsService';
import { speakManagedText } from '@/src/services/speechService';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Permissions'>;

export function PermissionsScreen({ navigation }: Props) {
  const { permissions, requestPermissions } = useAppPermissions();
  const [isRequesting, setIsRequesting] = useState(false);

  useScreenAnnouncement('Configuración de permisos. Revisa el estado de ubicación y micrófono.');

  const handleRequest = async () => {
    setIsRequesting(true);
    const updated = await requestPermissions();
    setIsRequesting(false);

    if (updated.location && updated.microphone) {
      await triggerSuccessHaptic();
      await speakManagedText('Todos los permisos necesarios fueron concedidos exitosamente.', {
        key: 'perms-granted',
        minIntervalMs: 0,
        interrupt: true,
      });
    } else {
      await triggerWarningHaptic();
      await speakManagedText('Algunos permisos aún están pendientes. Puedes activarlos en cualquier momento.', {
        key: 'perms-pending',
        minIntervalMs: 0,
        interrupt: true,
      });
    }
  };

  const allGranted = permissions.location && permissions.microphone;

  return (
    <ScreenContainer showDemoBanner={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Permisos de la Aplicación
          </Text>
          <Text style={styles.subtitle}>
            Para orientarte de manera segura y sin barreras, la aplicación requiere acceso a ubicación y voz.
          </Text>
        </View>

        {/* Permissions Cards List */}
        <View style={styles.permissionsList}>
          {/* Card 1: Location */}
          <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Permiso de Ubicación: ${permissions.location ? 'Concedido' : 'Pendiente'}. Permite calcular la estación más cercana y guiar tu caminata.`}
            style={styles.permissionCard}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconWrap, permissions.location ? styles.iconGranted : styles.iconPending]}>
                <MaterialIcons
                  name="my-location"
                  size={22}
                  color={permissions.location ? colors.success : colors.warning}
                />
              </View>
              <View style={[styles.statusBadge, permissions.location ? styles.badgeGranted : styles.badgePending]}>
                <Text style={[styles.statusBadgeText, permissions.location ? styles.badgeTextGranted : styles.badgeTextPending]}>
                  {permissions.location ? 'CONCEDIDO' : 'PENDIENTE'}
                </Text>
              </View>
            </View>

            <Text style={styles.permissionName}>Ubicación GPS en tiempo real</Text>
            <Text style={styles.permissionDesc}>
              Detecta tu posición geográfica para encontrar tu estación de origen, trazar tu ruta a pie y calcular la llegada a tu destino.
            </Text>
          </View>

          {/* Card 2: Microphone */}
          <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Permiso de Micrófono: ${permissions.microphone ? 'Concedido' : 'Pendiente'}. Permite decir el destino hablando.`}
            style={styles.permissionCard}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconWrap, permissions.microphone ? styles.iconGranted : styles.iconPending]}>
                <MaterialIcons
                  name="mic"
                  size={22}
                  color={permissions.microphone ? colors.success : colors.warning}
                />
              </View>
              <View style={[styles.statusBadge, permissions.microphone ? styles.badgeGranted : styles.badgePending]}>
                <Text style={[styles.statusBadgeText, permissions.microphone ? styles.badgeTextGranted : styles.badgeTextPending]}>
                  {permissions.microphone ? 'CONCEDIDO' : 'PENDIENTE'}
                </Text>
              </View>
            </View>

            <Text style={styles.permissionName}>Micrófono y Reconocimiento de Voz</Text>
            <Text style={styles.permissionDesc}>
              Te permite decir el nombre de tu estación (por ejemplo, &quot;Calle 100&quot; o &quot;Portal Norte&quot;) sin necesidad de escribir en el teclado.
            </Text>
          </View>

          {/* Card 3: Haptics (System-enabled) */}
          <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Vibración Háptica: Activo. Alertas táctiles al aproximarte a estaciones."
            style={styles.permissionCard}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconWrap, styles.iconGranted]}>
                <MaterialIcons name="vibration" size={22} color={colors.success} />
              </View>
              <View style={[styles.statusBadge, styles.badgeGranted]}>
                <Text style={[styles.statusBadgeText, styles.badgeTextGranted]}>ACTIVO</Text>
              </View>
            </View>

            <Text style={styles.permissionName}>Respuesta Háptica Sensorial</Text>
            <Text style={styles.permissionDesc}>
              Genera pulsos de vibración para advertirte con 1 parada de anticipación que debes prepararte para descender.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {!allGranted ? (
            <AccessibleButton
              label={isRequesting ? 'Solicitando...' : 'Conceder Permisos'}
              subtitle="Activar acceso a ubicación y micrófono"
              variant="primary"
              size="large"
              icon="verified-user"
              hint="Toca para mostrar el diálogo del sistema operativo y permitir los permisos"
              accessibilityLabel="Conceder Permisos. Activar acceso a ubicación y micrófono."
              onPress={handleRequest}
            />
          ) : (
            <AccessibleButton
              label="Todo Listo para Navegar"
              subtitle="Ir a la pantalla principal"
              variant="primary"
              size="large"
              icon="check-circle"
              hint="Todos los permisos están activos. Toca para continuar a la aplicación."
              accessibilityLabel="Todo Listo para Navegar. Ir al inicio."
              onPress={() => navigation.navigate('Home')}
            />
          )}

          <AccessibleButton
            label="Ir a la Pantalla Principal"
            subtitle="Continuar a la app de TransMilenio"
            variant="secondary"
            icon="home"
            hint="Ir a la pantalla de inicio"
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
  header: {
    gap: 4,
    paddingVertical: spacing.xs,
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

  permissionsList: {
    gap: spacing.sm,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.subtle,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGranted: {
    backgroundColor: '#ECFDF5',
  },
  iconPending: {
    backgroundColor: colors.accentLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeGranted: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.success,
  },
  badgePending: {
    backgroundColor: colors.accentLight,
    borderColor: colors.warning,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextGranted: {
    color: colors.success,
  },
  badgeTextPending: {
    color: colors.warning,
  },

  permissionName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  permissionDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
