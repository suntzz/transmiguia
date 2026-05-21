import { useEffect } from 'react';

import { announce } from '@/src/utils/accessibility';

export function useScreenAnnouncement(message: string) {
  useEffect(() => {
    void announce(message);
  }, [message]);
}
