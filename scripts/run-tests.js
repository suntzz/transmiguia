const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('assert');

// 1. Module Resolution & Mocks
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native') {
    return path.resolve(process.cwd(), 'scripts/mocks/react-native.mjs');
  }
  if (request === 'expo-constants') {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-constants.mjs');
  }
  if (request.startsWith('expo-file-system')) {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-file-system.mjs');
  }
  if (request === 'expo-location') {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-location.mjs');
  }
  if (request === 'expo-speech') {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-speech.mjs');
  }
  if (request === 'expo-haptics') {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-haptics.mjs');
  }
  if (request === '@react-navigation/native') {
    return path.resolve(process.cwd(), 'scripts/mocks/react-navigation-native.mjs');
  }
  if (request === '@react-navigation/native-stack') {
    return path.resolve(process.cwd(), 'scripts/mocks/react-navigation-native-stack.mjs');
  }
  if (request === 'react-native-safe-area-context') {
    return path.resolve(process.cwd(), 'scripts/mocks/react-native-safe-area-context.mjs');
  }
  if (request === 'react-native-gesture-handler') {
    return path.resolve(process.cwd(), 'scripts/mocks/react-native-gesture-handler.mjs');
  }
  if (request === 'react-native-maps') {
    return path.resolve(process.cwd(), 'scripts/mocks/react-native-maps.mjs');
  }
  if (request === 'expo-speech-recognition') {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-speech-recognition.mjs');
  }
  if (request === '@expo/vector-icons' || request.startsWith('@expo/vector-icons/')) {
    return path.resolve(process.cwd(), 'scripts/mocks/expo-vector-icons.mjs');
  }

  let target = request;
  if (target.startsWith('@/')) {
    const rel = target.replace(/^@\//, '');
    target = path.resolve(process.cwd(), rel);
  } else if (target.startsWith('.')) {
    const baseDir = parent && parent.filename ? path.dirname(parent.filename) : process.cwd();
    target = path.resolve(baseDir, target);
  }

  const exts = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.js'];
  for (const ext of exts) {
    const candidate = target + ext;
    if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// 2. TypeScript compilation hook
const compileTs = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  module._compile(transpiled, filename);
};
require.extensions['.ts'] = compileTs;
require.extensions['.tsx'] = compileTs;

// 3. Test Runner Framework
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const pendingPromises = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[1m\x1b[34m[SUITE]\x1b[0m \x1b[1m${suiteName}\x1b[0m`);
  fn();
}

function test(testName, fn) {
  totalTests += 1;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      const p = res
        .then(() => {
          passedTests += 1;
          console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
        })
        .catch((error) => {
          failedTests += 1;
          console.error(`  \x1b[31m✗\x1b[0m ${testName}`);
          console.error(`    \x1b[31mError:\x1b[0m ${error.message}`);
        });
      pendingPromises.push(p);
      return;
    }
    passedTests += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } catch (error) {
    failedTests += 1;
    console.error(`  \x1b[31m✗\x1b[0m ${testName}`);
    console.error(`    \x1b[31mError:\x1b[0m ${error.message}`);
  }
}

async function runAllSuites() {
  console.log('='.repeat(60));
  console.log('  TRANSMIGUIA - SUITE DE PRUEBAS AUTOMATIZADAS');
  console.log('='.repeat(60));

  // --- Suite 1: Core Geo & Distance ---
  describe('Core Geoespacial (Haversine & Distance)', () => {
    const { calculateDistanceInMeters } = require('@/src/core/geo/distance.ts');

    test('Calcula distancia correcta con objetos GeoPoint', () => {
      const bolivar = { latitude: 4.5981, longitude: -74.0758 };
      const parque93 = { latitude: 4.6767, longitude: -74.0483 };
      const d = calculateDistanceInMeters(bolivar, parque93);
      assert(d > 7500 && d < 9500, `Distancia esperada ~8.5km, obtenida: ${d}m`);
    });

    test('Calcula distancia correcta con coordenadas escalares', () => {
      const d = calculateDistanceInMeters(4.5981, -74.0758, 4.6767, -74.0483);
      assert(d > 7500 && d < 9500, `Distancia esperada ~8.5km, obtenida: ${d}m`);
    });

    test('Distancia a si mismo es 0 metros', () => {
      const p = { latitude: 4.6097, longitude: -74.0817 };
      const d = calculateDistanceInMeters(p, p);
      assert.strictEqual(d, 0);
    });

    test('Distancia es conmutativa/simetrica d(A,B) == d(B,A)', () => {
      const a = { latitude: 4.5981, longitude: -74.0758 };
      const b = { latitude: 4.7548, longitude: -74.0456 };
      const d1 = calculateDistanceInMeters(a, b);
      const d2 = calculateDistanceInMeters(b, a);
      assert(Math.abs(d1 - d2) < 0.0001, 'd(A,B) debe ser igual a d(B,A)');
    });
  });

  // --- Suite 2: Station Matcher & Search ---
  describe('Normalizador y Buscador Difuso de Estaciones', () => {
    const {
      normalizeText,
      getNormalizedTokens,
      getStationSearchTerms,
      getStationMatchScore,
      stationMatchesText,
      searchStationsInList,
      resolveStationFromSpeechList,
    } = require('@/src/core/text/stationMatcher.ts');
    const { transmilenioStations } = require('@/src/data/estaciones.ts');

    test('Normaliza tildes, mayusculas y caracteres especiales', () => {
      assert.strictEqual(normalizeText('HÉROES!!'), 'heroes');
      assert.strictEqual(normalizeText('  Estación  Calle 100? '), 'estacion calle 100');
    });

    test('Extrae tokens normalizados', () => {
      const tokens = getNormalizedTokens('Portal del Norte');
      assert.deepStrictEqual(tokens, ['portal', 'del', 'norte']);
    });

    test('Evalua coincidencia de texto con estación', () => {
      const heroes = transmilenioStations.find((s) => s.id === 'heroes');
      assert(heroes, 'Debe existir estacion heroes');
      assert.strictEqual(stationMatchesText(heroes, 'Heroes'), true);
      assert.strictEqual(stationMatchesText(heroes, 'héroes'), true);
      assert.strictEqual(stationMatchesText(heroes, 'Portal Sur'), false);
    });

    test('Calcula puntaje de coincidencia alto para nombres exactos', () => {
      const banderas = transmilenioStations.find((s) => s.id === 'banderas');
      assert(banderas, 'Debe existir estacion banderas');
      const scoreExact = getStationMatchScore(banderas, 'Banderas');
      assert.strictEqual(scoreExact, 120);
    });

    test('Busca estaciones en catalogo filtrando por termino parcial', () => {
      const results = searchStationsInList('calle', transmilenioStations);
      assert(results.length > 5, 'Debe haber multiples estaciones con "calle"');
    });

    test('Resuelve estacion a partir de frase de voz', () => {
      const res = resolveStationFromSpeechList('portal norte', transmilenioStations);
      assert(res.station !== null, 'Debe resolver estacion');
      assert.strictEqual(res.station.name, 'Portal Norte');
    });
  });

  // --- Suite 3: Catalogo de Datos Estaciones ---
  describe('Catálogo de Datos (153 Estaciones TransMilenio)', () => {
    const { transmilenioStations } = require('@/src/data/estaciones.ts');

    test('Contiene exactamente 153 estaciones activas en el catalogo', () => {
      assert.strictEqual(transmilenioStations.length, 153);
    });

    test('Todas las estaciones tienen IDs unicos y validos', () => {
      const ids = new Set();
      for (const st of transmilenioStations) {
        assert(st.id && typeof st.id === 'string', `Estacion sin ID valido: ${st.name}`);
        assert(!ids.has(st.id), `ID duplicado detectado: ${st.id} en ${st.name}`);
        ids.add(st.id);
      }
    });

    test('Todas las estaciones tienen coordenadas validas en Bogota/Soacha', () => {
      for (const st of transmilenioStations) {
        const { latitude, longitude } = st.coordinates;
        assert(latitude >= 4.4 && latitude <= 5.0, `Latitud fuera de rango para ${st.name}: ${latitude}`);
        assert(longitude >= -74.35 && longitude <= -74.0, `Longitud fuera de rango para ${st.name}: ${longitude}`);
      }
    });

    test('Todas las estaciones pertenecen a una troncal reconocida', () => {
      for (const st of transmilenioStations) {
        assert(st.troncal && st.troncal.startsWith('Zona '), `Troncal no estandar en: ${st.name} (${st.troncal})`);
      }
    });
  });

  // --- Suite 4: Reglas de Transbordo y Pathfinding ---
  describe('Reglas de Negocio de Transbordo y Rutas', () => {
    const {
      RICAURTE_TUNNEL_DISTANCE_METERS,
      JIMENEZ_TRANSFER_DISTANCE_METERS,
      TRANSFER_HUB_PRIORITIES,
      PREFERRED_TRANSFER_STATION_IDS,
      getTransferPriority,
      isRicaurteTransferPair,
      isJimenezTransferPair,
      RICAURTE_NQS_ID,
      RICAURTE_C13_ID,
    } = require('@/src/domain/rules/transferRules.ts');
    const tm = require('@/src/services/transmilenioService.ts');

    test('Distancias oficiales de transbordo calibradas correctamente', () => {
      assert.strictEqual(RICAURTE_TUNNEL_DISTANCE_METERS, 120);
      assert.strictEqual(JIMENEZ_TRANSFER_DISTANCE_METERS, 80);
    });

    test('Hubs principales tienen prioridad alta en el mapa de transbordos', () => {
      assert(PREFERRED_TRANSFER_STATION_IDS.has(RICAURTE_NQS_ID));
      assert(PREFERRED_TRANSFER_STATION_IDS.has(RICAURTE_C13_ID));
      assert.strictEqual(TRANSFER_HUB_PRIORITIES[RICAURTE_NQS_ID], 0);
    });

    test('Detecta par de transbordo peatonal en Ricaurte', () => {
      const nqs = { id: RICAURTE_NQS_ID };
      const c13 = { id: RICAURTE_C13_ID };
      assert.strictEqual(isRicaurteTransferPair(nqs, c13), true);
      assert.strictEqual(isRicaurteTransferPair(c13, nqs), true);
      assert.strictEqual(isRicaurteTransferPair(nqs, nqs), false);
    });

    test('Calcula ruta directa o con transbordos entre troncales lejanas', () => {
      const plan = tm.getRouteWithTransfers('Portal Norte', 'Portal Sur');
      assert(plan !== null, 'Debe encontrar ruta entre Portal Norte y Portal Sur');
      assert(plan.legs.length >= 1, 'Debe tener al menos un tramo');
      assert.strictEqual(plan.usesTransfer, true);
    });

    test('Identifica piernas de bus y de transbordo correctamente', () => {
      const plan = tm.getRouteWithTransfers('Portal Norte', 'Portal Sur');
      const busLegs = tm.getBusLegs(plan);
      assert(busLegs.length >= 1, 'Debe haber al menos un tramo de bus');
      for (const leg of busLegs) {
        assert(tm.isBusTransitLeg(leg), 'Leg debe ser de tipo bus');
        assert(leg.stations.length >= 2, 'Cada tramo de bus debe tener al menos origen y destino');
      }
    });

    test('Encuentra estacion mas cercana por proximidad GPS', () => {
      // Coordenadas exactas de Banderas: 4.63130064, -74.14576938
      const result = tm.findNearestStation({ latitude: 4.6313, longitude: -74.1457 });
      assert(result !== null);
      assert.strictEqual(result.station.name, 'Banderas');
      assert(result.distanceMeters < 15, `Distancia a Banderas debe ser < 15m, obtenida: ${result.distanceMeters}`);
    });
  });

  // --- Suite 5: Gateways de Hardware y Simulacion ---
  describe('Gateways de Hardware y Simulación', () => {
    const { MockLocationGateway } = require('@/src/infrastructure/simulation/MockLocationGateway.ts');
    const { ExpoSpeechTTSGateway } = require('@/src/infrastructure/hardware/ExpoSpeechTTSGateway.ts');
    const { PermissionsGateway } = require('@/src/infrastructure/hardware/PermissionsGateway.ts');
    const { simulationScenarioRunner } = require('@/src/infrastructure/simulation/SimulationScenarioRunner.ts');

    test('MockLocationGateway inicia, reproduce waypoints y se detiene', () => {
      const mockGateway = new MockLocationGateway();
      assert.strictEqual(mockGateway.isDemoActive(), false);

      const waypoints = [
        { latitude: 4.60, longitude: -74.08 },
        { latitude: 4.61, longitude: -74.08 },
      ];

      let updateCount = 0;
      const sub = mockGateway.startDemoTracking({
        waypoints,
        onLocation: (loc) => {
          updateCount += 1;
        },
      });

      assert.strictEqual(mockGateway.isDemoActive(), true);
      sub.remove();
      assert.strictEqual(mockGateway.isDemoActive(), false);
    });

    test('ExpoSpeechTTSGateway gestiona cola y estado de habla', () => {
      const tts = new ExpoSpeechTTSGateway();
      assert.strictEqual(tts.getQueuedCount(), 0);
      assert.strictEqual(tts.isSpeaking(), false);
      assert(typeof tts.speak === 'function');
      assert(typeof tts.speakAndWait === 'function');
      assert(typeof tts.stop === 'function');
    });

    test('PermissionsGateway verifica permisos sin errores', () => {
      const perms = new PermissionsGateway();
      return perms.checkAppPermissions().then((appPerms) => {
        assert.strictEqual(appPerms.location, true);
        assert.strictEqual(appPerms.microphone, true);
        assert.strictEqual(appPerms.gpsEnabled, true);
      });
    });

    test('SimulationScenarioRunner expone metodos de ejecucion de escenarios', () => {
      assert(typeof simulationScenarioRunner.runWalkingSimulation === 'function');
      assert(typeof simulationScenarioRunner.runBusRideSimulation === 'function');
    });
  });

  // --- Suite 6: Servicios Fachada Retrocompatibles ---
  describe('Fachadas de Servicios Retrocompatibles', () => {
    const speechService = require('@/src/services/speechService.ts');
    const locationService = require('@/src/services/locationService.ts');
    const hapticsService = require('@/src/services/hapticsService.ts');
    const permissionsService = require('@/src/services/permissions.service.ts');

    test('speechService exporta todas las funciones historicas de accesibilidad', () => {
      assert(typeof speechService.speakManagedText === 'function');
      assert(typeof speechService.speakAndWait === 'function');
      assert(typeof speechService.stopSpeaking === 'function');
      assert(typeof speechService.speakStationArrival === 'function');
      assert(typeof speechService.speakNextStation === 'function');
      assert(typeof speechService.speakPrepareForTransfer === 'function');
    });

    test('locationService exporta metodos de tracking GPS y demo', () => {
      assert(typeof locationService.getCurrentLocation === 'function');
      assert(typeof locationService.startLocationTracking === 'function');
      assert(typeof locationService.stopLocationTracking === 'function');
      assert(typeof locationService.startDemoLocationTracking === 'function');
    });

    test('hapticsService exporta disparadores de vibracion accesibles', () => {
      assert(typeof hapticsService.triggerSuccessHaptic === 'function');
      assert(typeof hapticsService.triggerWarningHaptic === 'function');
      assert(typeof hapticsService.triggerSelectionHaptic === 'function');
      assert(typeof hapticsService.triggerTransferHaptic === 'function');
    });

    test('permissionsService exporta solicitudes multiplataforma', () => {
      assert(typeof permissionsService.checkAppPermissions === 'function');
      assert(typeof permissionsService.requestAppPermissions === 'function');
    });
  });

  // --- Suite 7: Componentes y Pantallas Accesibles (Frontend UI Screens) ---
  describe('Componentes Accesibles y Pantallas Frontend (10 Pantallas UI)', () => {
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');
    const { RouteProvider } = require('@/src/context/RouteContext.tsx');
    const { DemoModeProvider } = require('@/src/context/DemoModeContext.tsx');
    const { colors, borders, touchTargets } = require('@/src/utils/theme.ts');
    const { AccessibleButton } = require('@/src/components/AccessibleButton.tsx');
    const { ScreenContainer } = require('@/src/components/ScreenContainer.tsx');

    // Screens
    const { HomeScreen } = require('@/src/screens/HomeScreen.tsx');
    const { OnboardingScreen } = require('@/src/screens/OnboardingScreen.tsx');
    const { PermissionsScreen } = require('@/src/screens/PermissionsScreen.tsx');
    const { StationSelectorScreen } = require('@/src/screens/StationSelectorScreen.tsx');
    const { DestinationScreen } = require('@/src/screens/DestinationScreen.tsx');
    const { RoutePreviewScreen } = require('@/src/screens/RoutePreviewScreen.tsx');
    const { WalkingGuideScreen } = require('@/src/screens/WalkingGuideScreen.tsx');
    const { StationAlertScreen } = require('@/src/screens/StationAlertScreen.tsx');
    const { StationArrivalScreen } = require('@/src/screens/StationArrivalScreen.tsx');
    const { BusTrackingScreen } = require('@/src/screens/BusTrackingScreen.tsx');
    const { DropAlertScreen } = require('@/src/screens/DropAlertScreen.tsx');
    const { VoicePrototypeScreen } = require('@/src/screens/VoicePrototypeScreen.tsx');

    function createMockNavigation() {
      return {
        navigate: () => {},
        replace: () => {},
        push: () => {},
        popToTop: () => {},
        goBack: () => {},
        dispatch: () => {},
        setOptions: () => {},
        addListener: () => ({ remove: () => {} }),
        isFocused: () => true,
      };
    }

    function renderScreen(Component, customProps = {}) {
      const nav = createMockNavigation();
      const defaultRoute = { key: Component.name, name: Component.name, params: {} };
      const props = {
        navigation: nav,
        route: defaultRoute,
        ...customProps,
      };

      return ReactDOMServer.renderToStaticMarkup(
        React.createElement(
          RouteProvider,
          null,
          React.createElement(
            DemoModeProvider,
            null,
            React.createElement(Component, props)
          )
        )
      );
    }

    test('Theme Tokens cumplen directrices WCAG 2.2 AAA y ergonomia táctil', () => {
      assert(touchTargets.primary >= 52, 'Botones primarios deben medir al menos 52dp');
      assert(touchTargets.minSize >= 48, 'Target tactil minimo debe ser >= 48dp');
      assert(touchTargets.hitSlop.top >= 8, 'HitSlop debe ser >= 8dp');
      assert.strictEqual(colors.accent, '#FFC400', 'Safety amber calibrado');
      assert.strictEqual(colors.primary, '#E30613', 'Rojo TransMilenio calibrado');
      assert(borders.standard >= 1, 'Bordes estandar');
    });

    test('AccessibleButton renderiza con atributos de accesibilidad y roles correctos', () => {
      const rendered = ReactDOMServer.renderToStaticMarkup(
        React.createElement(AccessibleButton, {
          label: 'PRUEBA BOTON ACCESIBLE',
          subtitle: 'Subtitulo explicativo',
          variant: 'accent',
          hint: 'Doble toque para activar',
        })
      );
      assert(rendered.includes('PRUEBA BOTON ACCESIBLE'), 'Debe renderizar la etiqueta');
      assert(rendered.includes('Subtitulo explicativo'), 'Debe renderizar el subtitulo');
      assert(rendered.includes('accessibilityRole="button"'), 'Debe declarar accessibilityRole button');
      assert(rendered.includes('accessibilityHint="Doble toque para activar"'), 'Debe incluir accessibilityHint');
    });

    test('ScreenContainer envuelve contenido con scroll accesible y soporte de modo demo', () => {
      const rendered = ReactDOMServer.renderToStaticMarkup(
        React.createElement(
          DemoModeProvider,
          null,
          React.createElement(ScreenContainer, { showDemoBanner: true },
            React.createElement('rn-text', null, 'Contenido de prueba')
          )
        )
      );
      assert(rendered.includes('Contenido de prueba'));
      assert(rendered.includes('rn-scroll-view'));
    });

    test('HomeScreen (1/10): Renderiza dashboard con 3 botones primarios y tarjeta de estado GPS', () => {
      const markup = renderScreen(HomeScreen);
      assert(markup.includes('TRANSMILENIO ACCESIBLE'), 'Debe incluir titulo principal');
      assert(markup.includes('Navegación por Voz'), 'Debe contener boton de voz');
      assert(markup.includes('Seleccionar Destino'), 'Debe contener boton de selector');
      assert(markup.includes('Modo Demostración'), 'Debe contener boton de demo guiada');
      assert(markup.includes('Estado del sistema:'), 'Tarjeta de estado GPS debe tener label accesible');
    });

    test('StationSelectorScreen (2/10): Renderiza buscador accesible, chips troncales y tarjetas de estacion', () => {
      const markup = renderScreen(StationSelectorScreen);
      assert(markup.includes('Buscar estación por nombre'), 'Debe tener placeholder accesible');
      assert(markup.includes('Buscar estación de TransMilenio'), 'Debe tener accessibilityLabel para TalkBack');
      assert(markup.includes('Troncal'), 'Debe contener chips de filtro por troncales');
      assert(markup.includes('Calle 72') || markup.includes('Flores') || markup.includes('Marly'), 'Debe listar estaciones del catalogo');
    });

    test('DestinationScreen (3/10): Renderiza felicitacion de llegada, resumen de viaje y reinicio', () => {
      const markup = renderScreen(DestinationScreen);
      assert(markup.includes('¡Llegaste a tu destino!'), 'Debe mostrar mensaje de llegada');
      assert(markup.includes('ESTACIÓN FINAL'), 'Debe tener badge de estacion final');
      assert(markup.includes('Resumen del Viaje'), 'Debe contener tarjeta de resumen');
      assert(markup.includes('Comenzar un nuevo viaje'), 'Debe tener boton de reinicio');
      assert(markup.includes('✓'), 'Debe tener check geometrico limpio');
    });

    test('RoutePreviewScreen (4/10): Renderiza resumen de preparacion de ruta y botones de control', () => {
      const markup = renderScreen(RoutePreviewScreen);
      assert(markup.includes('Preparando ruta'), 'Debe indicar preparacion de ruta');
      assert(markup.includes('Destino'), 'Debe mostrar destino');
      assert(markup.includes('Cambiar destino'), 'Debe permitir cambiar destino');
      assert(markup.includes('Reiniciar demo'), 'Debe permitir reiniciar demo');
    });

    test('WalkingGuideScreen (5/10): Renderiza guia peatonal, instruccion prominente y repetir voz', () => {
      const markup = renderScreen(WalkingGuideScreen);
      assert(markup.includes('GUÍA PEATONAL'), 'Debe mostrar badge de guia peatonal');
      assert(markup.includes('Repetir indicación por voz'), 'Debe incluir boton de repeticion de voz');
      assert(markup.includes('Cambiar destino'), 'Debe permitir cambiar destino');
    });

    test('StationAlertScreen (6/10): Renderiza aviso de proximidad y guia de torniquetes TuLlave', () => {
      const markup = renderScreen(StationAlertScreen);
      assert(markup.includes('PROXIMIDAD'), 'Debe mostrar badge de proximidad');
      assert(markup.includes('Estación cerca'), 'Debe mostrar titulo de proximidad');
      assert(markup.includes('tarjeta TuLlave'), 'Debe instruir sobre ingreso y tarjeta TuLlave');
      assert(markup.includes('Confirmar llegada a estación'), 'Debe permitir confirmar llegada');
    });

    test('StationArrivalScreen (7/10): Renderiza confirmacion de llegada y espera/abordaje de bus', () => {
      const markup = renderScreen(StationArrivalScreen);
      assert(markup.includes('Bus en camino'), 'Debe mostrar titulo de bus en camino');
      assert(markup.includes('Siguiente tramo'), 'Debe indicar siguiente tramo');
      assert(markup.includes('Esperando el bus') || markup.includes('Abordar ahora'), 'Debe contener boton de accion');
    });

    test('BusTrackingScreen (8/10): Renderiza monitoreo de viaje, tarjeta Ahora/Siguiente/Destino y paradas', () => {
      const markup = renderScreen(BusTrackingScreen);
      assert(markup.includes('En ruta'), 'Debe indicar que va en ruta');
      assert(markup.includes('Ahora'), 'Debe tener indicador Ahora');
      assert(markup.includes('Siguiente'), 'Debe tener indicador Siguiente');
      assert(markup.includes('Destino'), 'Debe tener indicador Destino');
      assert(markup.includes('Próximas paradas'), 'Debe listar proximas paradas');
    });

    test('DropAlertScreen (9/10): Renderiza alerta gigante de 1 parada restante y aviso de bajada', () => {
      const markup = renderScreen(DropAlertScreen);
      assert(markup.includes('AVISO DE BAJADA'), 'Debe contener badge de aviso de bajada');
      assert(markup.includes('PARADA RESTANTE'), 'Debe tener indicador de 1 parada restante');
      assert(markup.includes('Prepárate para bajar'), 'Debe advertir al usuario prepararse');
      assert(markup.includes('Confirmar llegada a estación'), 'Debe tener boton para confirmar bajada');
    });

    test('VoicePrototypeScreen (10/10): Renderiza reconocimiento de voz, transcripcion en vivo y fallback escrito', () => {
      const markup = renderScreen(VoicePrototypeScreen);
      assert(markup.includes('Decir destino por voz'), 'Debe identificar el titulo del asistente de voz');
      assert(markup.includes('Escuchar destino') || markup.includes('Detener escucha'), 'Debe tener boton de voz');
      assert(markup.includes('Escribir destino manualmente'), 'Debe ofrecer seccion manual accesible');
      assert(markup.includes('Usar texto escrito'), 'Debe permitir confirmar texto manual');
    });

    test('OnboardingScreen: Renderiza bienvenida accesible, tres pilares sensoriales y acciones', () => {
      const markup = renderScreen(OnboardingScreen);
      assert(markup.includes('TRANSMILENIO ACCESIBLE'), 'Debe incluir titulo de marca');
      assert(markup.includes('Tu guía de viaje accesible'), 'Debe contener encabezado de bienvenida');
      assert(markup.includes('Guía por Voz'), 'Debe listar pilar de voz');
      assert(markup.includes('Alertas por Vibración'), 'Debe listar pilar de vibracion');
      assert(markup.includes('Configurar Permisos'), 'Debe tener boton hacia permisos');
    });

    test('PermissionsScreen: Renderiza estado de permisos GPS, Microfono y Hapticos', () => {
      const markup = renderScreen(PermissionsScreen);
      assert(markup.includes('Permisos de la Aplicación'), 'Debe incluir titulo');
      assert(markup.includes('Ubicación GPS en tiempo real'), 'Debe incluir permiso de ubicacion');
      assert(markup.includes('Micrófono y Reconocimiento de Voz'), 'Debe incluir permiso de microfono');
      assert(markup.includes('Conceder Permisos') || markup.includes('Todo Listo para Navegar'), 'Debe tener accion de permisos');
    });
  });

  await Promise.all(pendingPromises);

  // --- Resumen Final ---
  console.log('\n' + '='.repeat(60));
  console.log(`  RESULTADO: ${passedTests}/${totalTests} pruebas pasadas (${failedTests} fallidas)`);
  console.log('='.repeat(60));

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllSuites().catch((err) => {
  console.error('Error fatal durante la ejecucion de pruebas:', err);
  process.exit(1);
});
