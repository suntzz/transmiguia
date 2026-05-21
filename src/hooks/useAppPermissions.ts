import { useEffect, useState } from 'react';

import {
  AppPermissionsState,
  checkAppPermissions,
  requestAppPermissions,
} from '@/src/services/permissions.service';
import { speakManagedText } from '@/src/services/speechService';
import { announce } from '@/src/utils/accessibility';

const initialState: AppPermissionsState = {
  microphone: false,
  location: false,
  gpsEnabled: false,
};

export function useAppPermissions() {
  const [permissions, setPermissions] = useState<AppPermissionsState>(initialState);
  const [loading, setLoading] = useState(true);

  const refreshPermissions = async () => {
    setLoading(true);
    const result = await checkAppPermissions();
    setPermissions(result);
    setLoading(false);
  };

  const requestPermissions = async () => {
    setLoading(true);
    const result = await requestAppPermissions();
    setPermissions(result);
    setLoading(false);

    const message = result.location
      ? result.gpsEnabled
        ? 'Permisos concedidos.'
        : 'Permisos concedidos. Activa la ubicacion del dispositivo para continuar.'
      : 'Se requiere acceso a ubicacion para guiarte.';

    await announce(message);
    await speakManagedText(message, {
      key: 'app-permissions-status',
      minIntervalMs: 10000,
      interrupt: true,
    });

    return result;
  };

  useEffect(() => {
    void refreshPermissions();
  }, []);

  return {
    permissions,
    loading,
    refreshPermissions,
    requestPermissions,
  };
}
