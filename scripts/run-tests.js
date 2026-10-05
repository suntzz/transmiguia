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
