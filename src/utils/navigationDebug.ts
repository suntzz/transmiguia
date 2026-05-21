export function logNavigationEvent(event: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.info('[NavDebug]', event, details);
    return;
  }

  console.info('[NavDebug]', event);
}
