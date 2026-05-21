import { allRoutes } from '../data/rutas';
import {
  getStationStatusMap,
  getStationStatusSourceMapSync,
  registerStationCatalog,
  type StationStatusSource,
} from './stationStatusService';

export type StationCoordinates = {
  latitude: number;
  longitude: number;
};

export type TransferConnection = {
  stationId: string;
  type: 'walk';
  distanceMeters: number;
  isTransfer: true;
  instructions?: string[];
};

export type TransmilenioStation = {
  id: string;
  name: string;
  coordinates: StationCoordinates;
  troncal: string;
  order: number;
  aliases?: string[];
  corridor?: string;
  transferConnections?: TransferConnection[];
  isActive?: boolean;
  statusSource?: StationStatusSource;
};

export type StationMatchResult = {
  station: TransmilenioStation | null;
  transcript: string;
  candidates?: TransmilenioStation[];
  reason?: 'empty' | 'exact' | 'fuzzy' | 'ambiguous' | 'not_found';
};

function createStation(
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  troncal: string,
  order: number,
  aliases: string[] = [],
  options?: Pick<TransmilenioStation, 'corridor' | 'transferConnections'>
): TransmilenioStation {
  return {
    id,
    name,
    coordinates: { latitude, longitude },
    troncal,
    order,
    aliases,
    corridor: options?.corridor,
    transferConnections: options?.transferConnections,
  };
}

const RICAURTE_NQS_ID = 'ricaurte-nqs';
const RICAURTE_C13_ID = 'ricaurte-c13';
const RICAURTE_TUNNEL_DISTANCE_METERS = 120;
const RICAURTE_TUNNEL_INSTRUCTIONS = [
  'Haz transbordo en Ricaurte.',
  'Cambia de plataforma por el tunel.',
  'Sigue las senales hacia la otra linea.',
];
const JIMENEZ_CARACAS_ID = 'jimenez-caracas';
const JIMENEZ_EJE_ID = 'jimenez-eje';
const JIMENEZ_TRANSFER_DISTANCE_METERS = 80;
const JIMENEZ_TRANSFER_INSTRUCTIONS = [
  'Haz transbordo en Avenida Jimenez.',
  'Cambia de corredor.',
  'Sigue las senales hacia el Eje Ambiental.',
];
const LAS_NIEVES_ID = 'las-nieves';
const MUSEO_NACIONAL_ID = 'museo-nacional';
const LAS_NIEVES_JIMENEZ_DISTANCE_METERS = 150;
const LAS_NIEVES_JIMENEZ_INSTRUCTIONS = [
  'Baja en Las Nieves.',
  'Camina hacia el Eje Ambiental.',
];

function createRicaurteTransferConnections(targetStationId: string): TransferConnection[] {
  return [
    {
      stationId: targetStationId,
      type: 'walk',
      distanceMeters: RICAURTE_TUNNEL_DISTANCE_METERS,
      isTransfer: true,
      instructions: RICAURTE_TUNNEL_INSTRUCTIONS,
    },
  ];
}

function createJimenezTransferConnections(targetStationId: string): TransferConnection[] {
  return [
    {
      stationId: targetStationId,
      type: 'walk',
      distanceMeters: JIMENEZ_TRANSFER_DISTANCE_METERS,
      isTransfer: true,
      instructions: JIMENEZ_TRANSFER_INSTRUCTIONS,
    },
  ];
}

function createLasNievesTransferConnections(targetStationId: string): TransferConnection[] {
  return [
    {
      stationId: targetStationId,
      type: 'walk',
      distanceMeters: LAS_NIEVES_JIMENEZ_DISTANCE_METERS,
      isTransfer: true,
      instructions: LAS_NIEVES_JIMENEZ_INSTRUCTIONS,
    },
  ];
}

// Coordenadas basadas principalmente en el servicio oficial GIS de estaciones troncales
// de TransMilenio. Solo Profamilia y San Cristobal usan aproximaciones controladas
// porque esos nombres no aparecen como estaciones activas con ese rotulo en el servicio actual.
const transmilenioStations: TransmilenioStation[] = [
  createStation('calle-76', 'Calle 76', 4.66303046, -74.06126016, 'Zona A - Caracas', 1),
  createStation('calle-72', 'Calle 72', 4.65823884, -74.06206854, 'Zona A - Caracas', 2),
  createStation('flores', 'Flores', 4.65490596, -74.06302132, 'Zona A - Caracas', 3, ['Flores - Areandina', 'Flores Areandina']),
  createStation('calle-63', 'Calle 63', 4.64840372, -74.06486173, 'Zona A - Caracas', 4),
  createStation('calle-57', 'Calle 57', 4.64298174, -74.0658221, 'Zona A - Caracas', 5, ['Temporal Calle 57']),
  createStation('marly', 'Marly', 4.63755688, -74.06676939, 'Zona A - Caracas', 6, ['Temporal Marly']),
  createStation('calle-45', 'Calle 45', 4.63145168, -74.06786884, 'Zona A - Caracas', 7, ['Calle 45 - American School Way']),
  createStation('avenida-39', 'Avenida 39', 4.62689711, -74.06869106, 'Zona A - Caracas', 8, ['AV. 39']),
  createStation('calle-34', 'Calle 34', 4.62148, -74.06976, 'Zona A - Caracas', 9),
  createStation('profamilia', 'Profamilia', 4.621376, -74.070554, 'Zona A - Caracas', 10),
  createStation('calle-26', 'Calle 26', 4.6166449, -74.07215189, 'Zona A - Caracas', 11),
  createStation('calle-22', 'Calle 22', 4.61169462, -74.07468354, 'Zona A - Caracas', 12, ['Temporal Calle 22']),
  createStation('calle-19', 'Calle 19', 4.60786106, -74.07685817, 'Zona A - Caracas', 13),
  createStation(
    JIMENEZ_CARACAS_ID,
    'Av. Jimenez (Caracas)',
    4.60287397,
    -74.08042807,
    'Zona A - Caracas',
    14,
    ['Avenida Jimenez', 'Avenida Jiménez', 'AV. Jimenez - Caracas', 'AV. Jiménez - Caracas', 'Jimenez Caracas'],
    {
      corridor: 'Caracas',
      transferConnections: createJimenezTransferConnections(JIMENEZ_EJE_ID),
    }
  ),
  createStation('tercer-milenio', 'Tercer Milenio', 4.59806, -74.08385, 'Zona A - Caracas', 15),

  createStation('terminal', 'Terminal', 4.768272, -74.043657, 'Zona B - Autopista Norte', 1),
  createStation('calle-187', 'Calle 187', 4.76301, -74.04448, 'Zona B - Autopista Norte', 2),
  createStation('portal-norte', 'Portal Norte', 4.75462117, -74.04603495, 'Zona B - Autopista Norte', 3, ['Portal Norte - Unicervantes', 'Portal Norte Unicervantes']),
  createStation('toberin', 'Toberin', 4.74618812, -74.04726932, 'Zona B - Autopista Norte', 4, ['Toberin - Foundever', 'Toberin Foundever', 'Toberin', 'Toberin']),
  createStation('calle-161', 'Calle 161', 4.74191284, -74.04798602, 'Zona B - Autopista Norte', 5),
  createStation('mazuren', 'Mazuren', 4.73458516, -74.04921756, 'Zona B - Autopista Norte', 6, ['Mazuren']),
  createStation('calle-146', 'Calle 146', 4.73089336, -74.04982164, 'Zona B - Autopista Norte', 7),
  createStation('calle-142', 'Calle 142', 4.72685125, -74.0505097, 'Zona B - Autopista Norte', 8),
  createStation('alcala', 'Alcala', 4.7211573, -74.05145388, 'Zona B - Autopista Norte', 9, ['Alcala', 'Alcala - Colegio S. Tomas Dominicos', 'Alcala - Colegio S Tomas Dominicos', 'Alcala - Colegio S. Tomas Dominicos']),
  createStation('prado', 'Prado', 4.7145599, -74.05256715, 'Zona B - Autopista Norte', 10),
  createStation('calle-127', 'Calle 127', 4.7046405, -74.05422923, 'Zona B - Autopista Norte', 11, ["Calle 127 - L'Oreal Paris", 'Calle 127 - Loreal Paris']),
  createStation('pepe-sierra', 'Pepe Sierra', 4.69812498, -74.05529767, 'Zona B - Autopista Norte', 12, ['Pepe Sierra', 'Calle 116']),
  createStation('calle-106', 'Calle 106', 4.6929819, -74.05617838, 'Zona B - Autopista Norte', 13, ['Calle 106 - Maletas Explora']),
  createStation('calle-100', 'Calle 100', 4.68394667, -74.05769591, 'Zona B - Autopista Norte', 14, ['Calle 100 - Marketmedios']),
  createStation('virrey', 'Virrey', 4.67599399, -74.05901243, 'Zona B - Autopista Norte', 15),
  createStation('calle-85', 'Calle 85', 4.6723151, -74.05964002, 'Zona B - Autopista Norte', 16, ['Calle 85 - GATO DUMAS', 'Calle 85 - Gato Dumas']),
  createStation('heroes', 'Héroes', 4.66776, -74.06041, 'Zona B - Autopista Norte', 17, ['Heroes']),

  createStation('portal-suba', 'Portal Suba', 4.74681506, -74.09427889, 'Zona C - Suba', 1),
  createStation('la-campina', 'La Campina', 4.74254284, -74.09105627, 'Zona C - Suba', 2, ['La Campina']),
  createStation('suba-tv-91', 'Suba - Tv. 91', 4.73883312, -74.08687372, 'Zona C - Suba', 3, ['Suba - TV. 91']),
  createStation('21-angeles', '21 Angeles', 4.73543402, -74.0808536, 'Zona C - Suba', 4, ['21 Angeles']),
  createStation('gratamira', 'Gratamira', 4.72733705, -74.07472646, 'Zona C - Suba', 5),
  createStation('suba-av-boyaca', 'Suba - Av. Boyaca', 4.72136212, -74.07472656, 'Zona C - Suba', 6, ['Suba - AV. Boyaca', 'Suba - AV. Boyaca', 'Suba - Av. Boyaca']),
  createStation('niza-calle-127', 'Niza Calle 127', 4.71193004, -74.07228152, 'Zona C - Suba', 7, ['Niza - Calle 127']),
  createStation('humedal-cordoba', 'Humedal Cordoba', 4.70653717, -74.07114047, 'Zona C - Suba', 8, ['Humedal Cordoba']),
  createStation('av-suba-calle-116', 'Av. Suba Calle 116', 4.69924029, -74.06983919, 'Zona C - Suba', 9, ['Suba - Calle 116', 'Shaio']),
  createStation('puente-largo', 'Puente Largo', 4.69329094, -74.06714144, 'Zona C - Suba', 10, ['Puentelargo']),
  createStation('suba-calle-100', 'Suba Calle 100', 4.6903983, -74.06561783, 'Zona C - Suba', 11, ['Suba - Calle 100']),
  createStation('suba-calle-95', 'Suba Calle 95', 4.68457458, -74.06315256, 'Zona C - Suba', 12, ['Suba - Calle 95']),
  createStation('san-martin', 'San Martín', 4.67694, -74.06682, 'Zona C - Suba', 13, ['San Martin']),

  createStation('portal-de-la-80', 'Portal de la 80', 4.70982948, -74.11050626, 'Zona D - Calle 80', 1, ['Portal 80']),
  createStation('quirigua', 'Quirigua', 4.70674385, -74.1087256, 'Zona D - Calle 80', 2),
  createStation('carrera-90', 'Carrera 90', 4.70468167, -74.10456241, 'Zona D - Calle 80', 3),
  createStation('avenida-cali', 'Avenida Cali', 4.70248563, -74.10028756, 'Zona D - Calle 80', 4, ['AV. Cali']),
  createStation('granja-carrera-77', 'Granja - Carrera 77', 4.69914792, -74.09601551, 'Zona D - Calle 80', 5, ['Granja - Kr 77']),
  createStation('minuto-de-dios', 'Minuto de Dios', 4.6966546, -74.09148174, 'Zona D - Calle 80', 6),
  createStation('boyaca', 'Boyaca', 4.69395205, -74.08711277, 'Zona D - Calle 80', 7, ['AV. Boyaca', 'Boyaca']),
  createStation('ferias', 'Ferias', 4.69089972, -74.08458441, 'Zona D - Calle 80', 8),
  createStation('avenida-68', 'Avenida 68', 4.68572564, -74.08046904, 'Zona D - Calle 80', 9, ['AV. 68']),
  createStation('carrera-53', 'Carrera 53', 4.68182095, -74.07740128, 'Zona D - Calle 80', 10),
  createStation('carrera-47', 'Carrera 47', 4.67800634, -74.07364067, 'Zona D - Calle 80', 11),
  createStation('escuela-militar', 'Escuela Militar', 4.67545572, -74.06966011, 'Zona D - Calle 80', 12),
  createStation('polo', 'Polo', 4.6703, -74.0645, 'Zona D - Calle 80', 13),

  createStation('la-castellana', 'La Castellana', 4.67561896, -74.06444795, 'Zona E - NQS Central', 1, ['Castellana']),
  createStation('nqs-calle-75', 'NQS Calle 75', 4.67015567, -74.07131021, 'Zona E - NQS Central', 2, ['Calle 75']),
  createStation('avenida-chile', 'Avenida Chile', 4.66634138, -74.07456156, 'Zona E - NQS Central', 3, ['AV. Chile']),
  createStation('simon-bolivar', 'Simon Bolivar', 4.65003852, -74.07834591, 'Zona E - NQS Central', 4, ['Movistar Arena', 'Simon Bolivar', 'Simon Bolivar']),
  createStation('campin-uan', 'Campin - UAN', 4.64539603, -74.07869913, 'Zona E - NQS Central', 5, ['Campin - UAN']),
  createStation('universidad-nacional', 'Universidad Nacional', 4.63711879, -74.07932113, 'Zona E - NQS Central', 6),
  createStation('avenida-eldorado', 'Avenida Eldorado', 4.63066292, -74.07986613, 'Zona E - NQS Central', 7, ['AV. El Dorado', 'AV. Eldorado']),
  createStation('cad', 'CAD', 4.62341044, -74.08416734, 'Zona E - NQS Central', 8),
  createStation('paloquemao', 'Paloquemao', 4.61691645, -74.08954451, 'Zona E - NQS Central', 9),
  createStation(
    RICAURTE_NQS_ID,
    'Ricaurte NQS',
    4.6116862,
    -74.09386888,
    'Zona E - NQS Central',
    10,
    ['Ricaurte - NQS', 'Ricaurte (NQS)', 'Ricaurte NQS'],
    {
      corridor: 'NQS',
      transferConnections: createRicaurteTransferConnections(RICAURTE_C13_ID),
    }
  ),
  createStation('comuneros', 'Comuneros', 4.6041, -74.0898, 'Zona E - NQS Central', 11),
  createStation('santa-isabel', 'Santa Isabel', 4.60199, -74.10219, 'Zona E - NQS Central', 12),
  createStation('guatoque-veraguas', 'Guatoque - Veraguas', 4.6041, -74.09479, 'Zona E - NQS Central', 13),
  createStation('nqs-calle-30-sur', 'NQS - Calle 30 Sur', 4.5949, -74.1170, 'Zona E - NQS Central', 14),
  createStation('sena', 'SENA', 4.5978, -74.1097, 'Zona E - NQS Central', 15),

  createStation('portal-americas', 'Portal Americas', 4.6293813, -74.17305845, 'Zona F - Americas', 1, ['Portal Americas']),
  createStation('patio-bonito', 'Patio Bonito', 4.63317191, -74.16460618, 'Zona F - Americas', 2),
  createStation('biblioteca-tintal', 'Biblioteca Tintal', 4.63789939, -74.1593448, 'Zona F - Americas', 3),
  createStation('transversal-86', 'Transversal 86', 4.63419961, -74.15206292, 'Zona F - Americas', 4),
  createStation('banderas', 'Banderas', 4.63130064, -74.14576938, 'Zona F - Americas', 5),
  createStation('mandalay', 'Mandalay', 4.63084738, -74.14129964, 'Zona F - Americas', 6),
  createStation('av-americas-av-boyaca', 'Av. Americas - Av. Boyaca', 4.6301134, -74.13422505, 'Zona F - Americas', 7, ['AV. Americas - AV. Boyaca', 'Mundo Aventura']),
  createStation('marsella', 'Marsella', 4.62968561, -74.13016292, 'Zona F - Americas', 8),
  createStation('pradera', 'Pradera', 4.62853238, -74.11867306, 'Zona F - Americas', 9),
  createStation('distrito-grafiti', 'Distrito Grafiti', 4.6278859, -74.11158095, 'Zona F - Americas', 10),
  createStation('puente-aranda', 'Puente Aranda', 4.62566891, -74.10464015, 'Zona F - Americas', 11),
  createStation('carrera-43', 'Carrera 43', 4.62280517, -74.10141668, 'Zona F - Americas', 12, ['Carrera 43 - Comapan', 'Carrera 43 - COMAPAN']),
  createStation('zona-industrial', 'Zona Industrial', 4.62032239, -74.09868859, 'Zona F - Americas', 13),
  createStation('cds-carrera-32', 'CDS Carrera 32', 4.61613269, -74.09395282, 'Zona F - Americas', 14, ['CDS - Carrera 32']),
  createStation(
    RICAURTE_C13_ID,
    'Ricaurte Calle 13',
    4.6116862,
    -74.09386888,
    'Zona F - Americas',
    14.5,
    ['Ricaurte - Calle 13', 'Ricaurte (Calle 13)', 'Ricaurte Calle 13'],
    {
      corridor: 'C13',
      transferConnections: createRicaurteTransferConnections(RICAURTE_NQS_ID),
    }
  ),
  createStation('san-facon-carrera-22', 'San Façon - Carrera 22', 4.6096, -74.0867, 'Zona F - Americas', 15, ['San Facundito', 'San Facon - Carrera 22']),
  createStation('de-la-sabana', 'De La Sabana', 4.6054, -74.0819, 'Zona F - Americas', 16),

  createStation('general-santander', 'General Santander', 4.5935, -74.1287, 'Zona G - Sur / Soacha', 1),
  createStation('alqueria', 'Alquería', 4.5944, -74.1353, 'Zona G - Sur / Soacha', 2),
  createStation('venecia', 'Venecia', 4.5955, -74.1416, 'Zona G - Sur / Soacha', 3),
  createStation('sevillana', 'Sevillana', 4.5952, -74.1485, 'Zona G - Sur / Soacha', 4),
  createStation('madelena', 'Madelena', 4.5963, -74.1560, 'Zona G - Sur / Soacha', 5, ['Centro Comercial Paseo Villa del Río - Madelena']),
  createStation('perdomo', 'Perdomo', 4.5957, -74.1638, 'Zona G - Sur / Soacha', 6),
  createStation('portal-sur', 'Portal Sur', 4.59701269, -74.16939799, 'Zona G - Sur / Soacha', 7, ['Portal Sur - JFK Coop. Financiera']),
  createStation('bosa', 'Bosa', 4.59687865, -74.18122466, 'Zona G - Sur / Soacha', 8),
  createStation('la-despensa', 'La Despensa', 4.59460134, -74.18811596, 'Zona G - Sur / Soacha', 9),
  createStation('leon-xiii', 'Leon XIII', 4.59217919, -74.19313846, 'Zona G - Sur / Soacha', 10, ['Leon XIII']),
  createStation('terreros-hospital-c-v', 'Terreros - Hospital C.V.', 4.5889774, -74.19953048, 'Zona G - Sur / Soacha', 11, ['Terreros', 'Terreros - Hospital Cardio Vascular']),
  createStation('san-mateo', 'San Mateo', 4.58598283, -74.20546046, 'Zona G - Sur / Soacha', 12, ['San Mateo - CC Unisur']),

  createStation('portal-de-usme', 'Portal de Usme', 4.53171458, -74.11939098, 'Zona H - Caracas Sur', 1, ['Portal Usme']),
  createStation('portal-del-tunal', 'Portal del Tunal', 4.56957146, -74.13924019, 'Zona H - Caracas Sur', 2, ['Portal Tunal']),
  createStation('molinos', 'Molinos', 4.55705944, -74.12183395, 'Zona H - Caracas Sur', 3),
  createStation('consuelo', 'Consuelo', 4.56022492, -74.12386901, 'Zona H - Caracas Sur', 4),
  createStation('socorro', 'Socorro', 4.56465807, -74.12557321, 'Zona H - Caracas Sur', 5),
  createStation('santa-lucia', 'Santa Lucia', 4.57096376, -74.12469525, 'Zona H - Caracas Sur', 6, ['Santa Lucia']),
  createStation('calle-40-sur', 'Calle 40 Sur', 4.57585399, -74.12009368, 'Zona H - Caracas Sur', 7),
  createStation('quiroga', 'Quiroga', 4.57666, -74.11495, 'Zona H - Caracas Sur', 8),
  createStation('olaya', 'Olaya', 4.57890853, -74.10736095, 'Zona H - Caracas Sur', 9),
  createStation('fucha', 'Fucha', 4.58331, -74.09879, 'Zona H - Caracas Sur', 10),
  createStation('restrepo', 'Restrepo', 4.58178, -74.10146, 'Zona H - Caracas Sur', 11),
  createStation('hortua', 'Hortúa', 4.59075, -74.09032, 'Zona H - Caracas Sur', 12, ['Hortua']),
  createStation('hospital', 'Hospital', 4.59493, -74.08633, 'Zona H - Caracas Sur', 13),
  createStation('biblioteca', 'Biblioteca', 4.5703, -74.1301, 'Zona H - Caracas Sur', 14),
  createStation('parque', 'Parque', 4.5683, -74.1351, 'Zona H - Caracas Sur', 15),

  createStation('portal-eldorado', 'Portal Eldorado', 4.6816043, -74.12139545, 'Zona K - Eldorado', 1, ['Portal El Dorado - C.C. NUESTRO BOGOTA', 'Portal El Dorado']),
  createStation('modelia', 'Modelia', 4.67504413, -74.11711695, 'Zona K - Eldorado', 2),
  createStation('normandia', 'Normandia', 4.66902134, -74.11325992, 'Zona K - Eldorado', 3, ['Normandia']),
  createStation('avenida-rojas', 'Avenida Rojas', 4.66195235, -74.10875996, 'Zona K - Eldorado', 4, ['Av. Rojas - UNISALESIANA']),
  createStation('el-tiempo-maloka', 'El Tiempo - Maloka', 4.65708058, -74.10562544, 'Zona K - Eldorado', 5, ['El Tiempo - Camara de Comercio de Bogota']),
  createStation('salitre-el-greco', 'Salitre El Greco', 4.65086908, -74.10164474, 'Zona K - Eldorado', 6, ['Salitre El Greco - Vive Claro']),
  createStation('can', 'CAN', 4.64688089, -74.09904759, 'Zona K - Eldorado', 7, ['CAN - British Council']),
  createStation('gobernacion', 'Gobernacion', 4.64284515, -74.0965137, 'Zona K - Eldorado', 8, ['Gobernacion']),
  createStation('quinta-paredes', 'Quinta Paredes', 4.63752209, -74.09310384, 'Zona K - Eldorado', 9),
  createStation('recinto-ferial', 'Recinto Ferial', 4.6343142, -74.08969371, 'Zona K - Eldorado', 10, ['Corferias']),
  createStation('ciudad-universitaria', 'Ciudad Universitaria', 4.63087977, -74.08352729, 'Zona K - Eldorado', 11, ['Ciudad Universitaria - Loteria de Bogota']),
  createStation('concejo-de-bogota', 'Concejo de Bogotá', 4.626888, -74.080937, 'Zona K - Eldorado', 12, ['Concejo de Bogota']),

  createStation('portal-20-de-julio', 'Portal 20 de Julio', 4.56571811, -74.09700839, 'Zona L - Carrera 10', 1),
  createStation('country-sur', 'Country Sur', 4.57141439, -74.09863149, 'Zona L - Carrera 10', 2),
  createStation('av-1-de-mayo', 'Av. 1 de Mayo', 4.57693711, -74.09370652, 'Zona L - Carrera 10', 3, ['AV. 1 Mayo']),
  createStation('ciudad-jardin', 'Ciudad Jardin', 4.58153243, -74.09033824, 'Zona L - Carrera 10', 4, ['Ciudad Jardin - UAN']),
  createStation('san-cristobal', 'San Cristobal', 4.58153243, -74.09033824, 'Zona L - Carrera 10', 5),
  createStation('san-victorino', 'San Victorino', 4.6010, -74.0774, 'Zona L - Carrera 10', 6),
  createStation('san-diego', 'San Diego', 4.61089733, -74.0714967, 'Zona L - Carrera 10', 7),
  createStation(
    LAS_NIEVES_ID,
    'Las Nieves',
    4.60606079,
    -74.07431885,
    'Zona L - Carrera 10',
    8,
    ['Las Nieves Centro'],
    {
      corridor: 'Carrera10',
      transferConnections: createLasNievesTransferConnections(JIMENEZ_EJE_ID),
    }
  ),
  createStation('policia-central', 'Policía Central', 4.598, -74.077, 'Zona L - Carrera 10', 9),

  createStation(
    JIMENEZ_EJE_ID,
    'Av. Jimenez (Eje Ambiental)',
    4.60287397,
    -74.07970007,
    'Zona J - Eje Ambiental',
    0.5,
    ['Avenida Jimenez Eje Ambiental', 'Avenida Jiménez Eje Ambiental', 'AV. Jimenez - Eje Ambiental', 'AV. Jiménez - Eje Ambiental', 'Jimenez Eje Ambiental'],
    {
      corridor: 'EjeAmbiental',
      transferConnections: createJimenezTransferConnections(JIMENEZ_CARACAS_ID),
    }
  ),
  createStation('museo-del-oro', 'Museo del Oro', 4.6011, -74.0730, 'Zona J - Eje Ambiental', 1),
  createStation('las-aguas', 'Las Aguas', 4.6026, -74.0684, 'Zona J - Eje Ambiental', 2),
  createStation('universidades', 'Universidades', 4.6054, -74.0669, 'Zona J - Eje Ambiental', 3),

  createStation(
    MUSEO_NACIONAL_ID,
    'Museo Nacional',
    4.61524712,
    -74.06922646,
    'Zona M - Museo Nacional',
    1,
    ['Museo Nacional Centro'],
    {
      corridor: 'CaracasCentro',
    }
  ),

  createStation('cl-134', 'Cl 134', 4.7118, -74.0305, 'Zona N - Carrera 7', 1),
  createStation('cl-127', 'Cl 127', 4.7046, -74.0322, 'Zona N - Carrera 7', 2),
  createStation('cl-116', 'Cl 116', 4.6946, -74.0345, 'Zona N - Carrera 7', 3),
  createStation('cl-106', 'Cl 106', 4.6853, -74.0366, 'Zona N - Carrera 7', 4),
  createStation('cl-94', 'Cl 94', 4.6738, -74.0410, 'Zona N - Carrera 7', 5),
  createStation('cl-82', 'Cl 82', 4.6648, -74.0455, 'Zona N - Carrera 7', 6),
  createStation('cl-72', 'Cl 72', 4.654, -74.058, 'Zona N - Carrera 7', 7),
  createStation('cl-67', 'Cl 67', 4.648, -74.060, 'Zona N - Carrera 7', 8),
  createStation('cl-53', 'Cl 53', 4.638, -74.062, 'Zona N - Carrera 7', 9),
  createStation('cl-45', 'Cl 45', 4.631, -74.064, 'Zona N - Carrera 7', 10),
];

registerStationCatalog(transmilenioStations);

let stationStatusMapSnapshot: Record<string, boolean> = {};
let stationStatusSourceMapSnapshot: Record<string, StationStatusSource> = {};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getStationStatusKey(value: string) {
  return normalizeText(value);
}

function getStationStatusValue(station: TransmilenioStation) {
  const key = getStationStatusKey(station.name);
  const isActive = stationStatusMapSnapshot[key];

  return {
    isActive: isActive ?? true,
    statusSource: stationStatusSourceMapSnapshot[key],
  };
}

function withStationStatus(station: TransmilenioStation) {
  const status = getStationStatusValue(station);

  return {
    ...station,
    isActive: status.isActive,
    statusSource: status.statusSource,
  };
}

function getDecoratedStations(includeInactive = true) {
  const stations = transmilenioStations.map(withStationStatus);

  if (includeInactive) {
    return stations;
  }

  return stations.filter((station) => station.isActive !== false);
}

function getStationSearchTerms(station: TransmilenioStation) {
  return [station.name, station.troncal, ...(station.aliases ?? [])];
}

function getNormalizedTokens(value: string) {
  return normalizeText(value).split(' ').filter(Boolean);
}

function getStationMatchScore(station: TransmilenioStation, value: string) {
  const normalizedValue = normalizeText(value);
  const valueTokens = getNormalizedTokens(normalizedValue);

  if (!normalizedValue || valueTokens.length === 0) {
    return 0;
  }

  let bestScore = 0;

  for (const term of getStationSearchTerms(station)) {
    const normalizedTerm = normalizeText(term);

    if (!normalizedTerm) {
      continue;
    }

    if (normalizedTerm === normalizedValue) {
      return 120;
    }

    const termTokens = getNormalizedTokens(normalizedTerm);
    const sharedTokens = termTokens.filter((token) => valueTokens.includes(token));
    const overlapRatio =
      sharedTokens.length / Math.max(termTokens.length, valueTokens.length);

    let score = sharedTokens.length > 0
      ? Math.round(overlapRatio * 72) + sharedTokens.length * 8
      : 0;

    if (
      normalizedValue.includes(normalizedTerm) &&
      normalizedTerm.length >= Math.max(6, normalizedValue.length - 2)
    ) {
      score = Math.max(score, 92);
    }

    if (normalizedTerm.startsWith(normalizedValue) && normalizedValue.length >= 5) {
      score = Math.max(score, 76);
    }

    if (normalizedValue.startsWith(normalizedTerm) && normalizedTerm.length >= 5) {
      score = Math.max(score, 84);
    }

    if (sharedTokens.length === valueTokens.length && valueTokens.length >= 2) {
      score += 10;
    }

    if (
      valueTokens.some((token) => /\d/.test(token)) &&
      termTokens.some((token) => /\d/.test(token))
    ) {
      score += 6;
    }

    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

function stationMatchesText(station: TransmilenioStation, value: string) {
  const normalizedValue = normalizeText(value);
  const valueTokens = getNormalizedTokens(normalizedValue);

  return getStationSearchTerms(station).some((term) => {
    const normalizedTerm = normalizeText(term);
    const termTokens = getNormalizedTokens(normalizedTerm);

    if (!normalizedTerm) {
      return false;
    }

    if (normalizedTerm === normalizedValue) {
      return true;
    }

    if (termTokens.length === 0 || valueTokens.length === 0) {
      return false;
    }

    const allValueTokensMatch = valueTokens.every((token) => termTokens.includes(token));
    const allTermTokensMatch = termTokens.every((token) => valueTokens.includes(token));

    return (
      allValueTokensMatch ||
      allTermTokensMatch
    );
  });
}

function calculateDistanceInMeters(
  origin: StationCoordinates,
  destination: StationCoordinates
) {
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadius * arc;
}

export async function refreshStationStatuses(forceRefresh = false) {
  stationStatusMapSnapshot = await getStationStatusMap(forceRefresh);
  stationStatusSourceMapSnapshot = getStationStatusSourceMapSync();
  recognizedRoutesCache = null;

  return getAllStations();
}

export function getAllStations(options?: { includeInactive?: boolean }) {
  return getDecoratedStations(options?.includeInactive ?? true);
}

export function getAllStationSpeechTerms() {
  return Array.from(
    new Set(
      transmilenioStations.flatMap((station) => [station.name, ...(station.aliases ?? [])])
    )
  );
}

export function getRandomStation(excludedStationId?: string) {
  const activeStations = getAllStations({ includeInactive: false });
  const candidates = excludedStationId
    ? activeStations.filter((station) => station.id !== excludedStationId)
    : activeStations;
  const fallbackStations =
    activeStations.length > 0 ? activeStations : getAllStations({ includeInactive: true });
  const availableStations = candidates.length > 0 ? candidates : fallbackStations;
  const randomIndex = Math.floor(Math.random() * availableStations.length);

  return availableStations[randomIndex] ?? fallbackStations[0];
}

export function searchStations(query: string, options?: { includeInactive?: boolean }) {
  const normalizedQuery = normalizeText(query);
  const stations = getAllStations({
    includeInactive: options?.includeInactive ?? true,
  });

  if (!normalizedQuery) {
    return stations;
  }

  return stations.filter((station) =>
    getStationSearchTerms(station).some((term) =>
      normalizeText(term).includes(normalizedQuery)
    )
  );
}

export function resolveStationFromSpeech(transcript: string): StationMatchResult {
  const normalizedTranscript = normalizeText(transcript);
  const stations = getAllStations({ includeInactive: true });

  if (!normalizedTranscript) {
    return {
      station: null,
      transcript,
      candidates: [],
      reason: 'empty',
    };
  }

  const exactStation = stations.find((station) =>
    getStationSearchTerms(station).some(
      (term) => normalizeText(term) === normalizedTranscript
    )
  );

  if (exactStation) {
    return {
      station: exactStation,
      transcript,
      candidates: [exactStation],
      reason: 'exact',
    };
  }

  const scoredCandidates = stations
    .map((station) => ({
      station,
      score: getStationMatchScore(station, normalizedTranscript),
    }))
    .filter((candidate) => candidate.score >= 56)
    .sort((left, right) => right.score - left.score);

  if (scoredCandidates.length === 0) {
    return {
      station: null,
      transcript,
      candidates: [],
      reason: 'not_found',
    };
  }

  const [bestCandidate, secondCandidate] = scoredCandidates;

  if (!bestCandidate || bestCandidate.score < 72) {
    return {
      station: null,
      transcript,
      candidates: scoredCandidates.slice(0, 3).map((candidate) => candidate.station),
      reason: 'not_found',
    };
  }

  if (
    secondCandidate &&
    bestCandidate.score < 110 &&
    bestCandidate.score - secondCandidate.score < 8
  ) {
    return {
      station: null,
      transcript,
      candidates: scoredCandidates.slice(0, 3).map((candidate) => candidate.station),
      reason: 'ambiguous',
    };
  }

  return {
    station: bestCandidate.station,
    transcript,
    candidates: scoredCandidates.slice(0, 3).map((candidate) => candidate.station),
    reason: 'fuzzy',
  };
}

export function getStationsByTroncal(
  troncal: string,
  options?: { includeInactive?: boolean }
) {
  return getAllStations({
    includeInactive: options?.includeInactive ?? false,
  })
    .filter((station) => station.troncal === troncal)
    .sort((a, b) => a.order - b.order);
}

export function getStationByName(
  name: string,
  options?: { includeInactive?: boolean }
) {
  return getAllStations({
    includeInactive: options?.includeInactive ?? true,
  }).find((station) => stationMatchesText(station, name));
}

export function findNearestStation(userCoordinates: StationCoordinates) {
  const stations = getAllStations({ includeInactive: false });
  const candidateStations = stations.length > 0 ? stations : getAllStations();

  return candidateStations.reduce((nearest, station) => {
    const currentDistance = calculateDistanceInMeters(
      userCoordinates,
      station.coordinates
    );

    if (!nearest || currentDistance < nearest.distanceMeters) {
      return {
        station,
        distanceMeters: currentDistance,
      };
    }

    return nearest;
  }, null as { station: TransmilenioStation; distanceMeters: number } | null);
}

export function findNearestStationInList(
  userCoordinates: StationCoordinates,
  stations: TransmilenioStation[]
) {
  const activeStations = stations.filter((station) => station.isActive !== false);
  const candidateStations = activeStations.length > 0 ? activeStations : stations;

  return candidateStations.reduce((nearest, station) => {
    const currentDistance = calculateDistanceInMeters(
      userCoordinates,
      station.coordinates
    );

    if (!nearest || currentDistance < nearest.distanceMeters) {
      return {
        station,
        distanceMeters: currentDistance,
      };
    }

    return nearest;
  }, null as { station: TransmilenioStation; distanceMeters: number } | null);
}

export function resolveStationAvailability(
  stationOrName: string | TransmilenioStation
): StationAvailabilityResolution | null {
  const requestedStation =
    typeof stationOrName === 'string'
      ? getStationByName(stationOrName, { includeInactive: true })
      : getStationByName(stationOrName.name, { includeInactive: true }) ?? withStationStatus(stationOrName);

  if (!requestedStation) {
    return null;
  }

  if (requestedStation.isActive !== false) {
    return {
      requestedStation,
      resolvedStation: requestedStation,
      wasRedirected: false,
      message: null,
    };
  }

  const activeStations = getAllStations({ includeInactive: false }).filter(
    (station) => station.id !== requestedStation.id
  );
  const sameTroncalAlternatives = activeStations.filter(
    (station) => station.troncal === requestedStation.troncal
  );
  const pool = sameTroncalAlternatives.length > 0 ? sameTroncalAlternatives : activeStations;
  const alternative = findNearestStationInList(requestedStation.coordinates, pool)?.station;
  const resolvedStation = alternative ?? requestedStation;
  const wasRedirected = resolvedStation.id !== requestedStation.id;

  return {
    requestedStation,
    resolvedStation,
    wasRedirected,
    message: wasRedirected
      ? `La estacion ${requestedStation.name} no esta disponible. Te mostrare ${resolvedStation.name} como alternativa cercana.`
      : `La estacion ${requestedStation.name} no esta disponible en este momento.`,
  };
}

export type RouteSegment = {
  routeId: string;
  stations: TransmilenioStation[];
  mode: 'troncal' | 'bus' | 'walk';
  troncal: string;
  routeCode: string;
  direction: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
  isTransfer: boolean;
  distanceMeters?: number;
  instructions?: string[];
};

export type BusTransitLeg = {
  type: 'bus';
  from: TransmilenioStation;
  to: TransmilenioStation;
  routeId: string;
  routeCode: string;
  direction: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
  troncal: string;
  stations: TransmilenioStation[];
  isTransferLeg: boolean;
};

export type WalkTransitLeg = {
  type: 'walk';
  from: TransmilenioStation;
  to: TransmilenioStation;
  routeId: string;
  routeCode: string;
  direction: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
  troncal: string;
  stations: TransmilenioStation[];
  isTransferLeg: boolean;
  distanceMeters: number;
  instructions: string[];
};

export type TransitLeg = BusTransitLeg | WalkTransitLeg;

export type RoutePlan = {
  origin: TransmilenioStation;
  destination: TransmilenioStation;
  segments: RouteSegment[];
  legs: TransitLeg[];
  transferStations: TransmilenioStation[];
  usesTransfer: boolean;
};

export type StationAvailabilityResolution = {
  requestedStation: TransmilenioStation;
  resolvedStation: TransmilenioStation;
  wasRedirected: boolean;
  message: string | null;
};

export type UserNavigationLeg =
  | {
      type: 'walk';
      to: TransmilenioStation;
    }
  | TransitLeg;

export type UserNavigationPlan = {
  originStation: TransmilenioStation;
  destinationStation: TransmilenioStation;
  routePlan: RoutePlan | null;
  legs: UserNavigationLeg[];
  userIsAlreadyAtOriginStation: boolean;
  walkingDistanceMeters: number;
};

type RecognizedRoute = {
  routeId: string;
  tipo: string;
  originLabel: string;
  destinationLabel: string;
  stations: TransmilenioStation[];
};

const TRANSFER_HUB_PRIORITIES: Record<string, number> = {
  [RICAURTE_NQS_ID]: 0,
  [RICAURTE_C13_ID]: 0,
  [JIMENEZ_CARACAS_ID]: 1,
  [JIMENEZ_EJE_ID]: 1,
  MUSEO_NACIONAL_ID: 2,
  'ciudad-universitaria': 3,
  LAS_NIEVES_ID: 4,
  'san-diego': 5,
  ferias: 6,
  'escuela-militar': 7,
  'avenida-68': 8,
  'calle-45': 9,
};

let recognizedRoutesCache: RecognizedRoute[] | null = null;
const PREFERRED_TRANSFER_STATION_IDS = new Set(Object.keys(TRANSFER_HUB_PRIORITIES));

function dedupeConsecutiveStations(stations: TransmilenioStation[]) {
  return stations.filter((station, index) => {
    if (index === 0) {
      return true;
    }

    return stations[index - 1]?.id !== station.id;
  });
}

function inferDirectionFromStations(
  origin: TransmilenioStation,
  destination: TransmilenioStation
): 'Norte' | 'Sur' | 'Oriente' | 'Occidente' {
  const latitudeDelta = destination.coordinates.latitude - origin.coordinates.latitude;
  const longitudeDelta = destination.coordinates.longitude - origin.coordinates.longitude;

  if (Math.abs(latitudeDelta) >= Math.abs(longitudeDelta)) {
    return latitudeDelta >= 0 ? 'Norte' : 'Sur';
  }

  return longitudeDelta >= 0 ? 'Oriente' : 'Occidente';
}

function buildFallbackRouteCode(origin: TransmilenioStation) {
  const troncalMatch = origin.troncal.match(/Zona\s+([A-Z])/i);
  return troncalMatch ? `TR-${troncalMatch[1].toUpperCase()}` : 'TR';
}

function getStationById(
  stationId: string,
  options?: { includeInactive?: boolean }
) {
  return getAllStations({
    includeInactive: options?.includeInactive ?? true,
  }).find((station) => station.id === stationId);
}

function isGenericRicaurteStopName(stopName: string) {
  return normalizeText(stopName) === 'ricaurte';
}

function isGenericJimenezStopName(stopName: string) {
  const normalizedStopName = normalizeText(stopName);

  return (
    normalizedStopName === 'avenida jimenez' ||
    normalizedStopName === 'av jimenez'
  );
}

function expandRouteStopVariants(routeStops: string[]) {
  return routeStops.reduce<string[][]>((variants, stopName) => {
    if (isGenericRicaurteStopName(stopName)) {
      return variants.flatMap((variant) => [
        [...variant, 'Ricaurte (NQS)'],
        [...variant, 'Ricaurte (Calle 13)'],
      ]);
    }

    if (isGenericJimenezStopName(stopName)) {
      return variants.flatMap((variant) => [
        [...variant, 'Av. Jimenez (Caracas)'],
        [...variant, 'Av. Jimenez (Eje Ambiental)'],
      ]);
    }

    return variants.map((variant) => [...variant, stopName]);
  }, [[]]);
}

function isRicaurteTransferPair(
  origin: TransmilenioStation | undefined,
  destination: TransmilenioStation | undefined
) {
  if (!origin || !destination) {
    return false;
  }

  return (
    (origin.id === RICAURTE_NQS_ID && destination.id === RICAURTE_C13_ID) ||
    (origin.id === RICAURTE_C13_ID && destination.id === RICAURTE_NQS_ID)
  );
}

function isJimenezTransferPair(
  origin: TransmilenioStation | undefined,
  destination: TransmilenioStation | undefined
) {
  if (!origin || !destination) {
    return false;
  }

  return (
    (origin.id === JIMENEZ_CARACAS_ID && destination.id === JIMENEZ_EJE_ID) ||
    (origin.id === JIMENEZ_EJE_ID && destination.id === JIMENEZ_CARACAS_ID)
  );
}

function getAllowedAdjacentTroncalsForRicaurte(stationId: string) {
  if (stationId === RICAURTE_NQS_ID) {
    return new Set([
      'Zona E - NQS Central',
      'Zona G - Sur / Soacha',
      'Zona K - Eldorado',
    ]);
  }

  if (stationId === RICAURTE_C13_ID) {
    return new Set([
      'Zona A - Caracas',
      'Zona F - Americas',
    ]);
  }

  return null;
}

function isJimenezCaracasRouteContextValid(
  previousStation: TransmilenioStation | undefined,
  nextStation: TransmilenioStation | undefined
) {
  const adjacentStations = [previousStation, nextStation].filter(
    (station): station is TransmilenioStation => Boolean(station)
  );

  if (adjacentStations.length === 0) {
    return true;
  }

  return (
    adjacentStations.some((station) => station.troncal === 'Zona A - Caracas') &&
    adjacentStations.every((station) =>
      ['Zona A - Caracas', 'Zona L - Carrera 10'].includes(station.troncal)
    )
  );
}

function isJimenezEjeRouteContextValid(
  previousStation: TransmilenioStation | undefined,
  nextStation: TransmilenioStation | undefined
) {
  const adjacentStations = [previousStation, nextStation].filter(
    (station): station is TransmilenioStation => Boolean(station)
  );

  if (adjacentStations.length === 0) {
    return true;
  }

  return (
    adjacentStations.some((station) => station.troncal === 'Zona J - Eje Ambiental') &&
    adjacentStations.every((station) =>
      ['Zona A - Caracas', 'Zona J - Eje Ambiental', 'Zona L - Carrera 10'].includes(
        station.troncal
      )
    )
  );
}

function isBusSegmentConsistent(stations: TransmilenioStation[]) {
  return stations.every((station, index) => {
    const previousStation = stations[index - 1];
    const nextStation = stations[index + 1];
    const allowedAdjacentTroncals = getAllowedAdjacentTroncalsForRicaurte(station.id);

    if (
      isRicaurteTransferPair(previousStation, station) ||
      isRicaurteTransferPair(station, nextStation) ||
      isJimenezTransferPair(previousStation, station) ||
      isJimenezTransferPair(station, nextStation)
    ) {
      return false;
    }

    if (station.id === JIMENEZ_CARACAS_ID) {
      return isJimenezCaracasRouteContextValid(previousStation, nextStation);
    }

    if (station.id === JIMENEZ_EJE_ID) {
      return isJimenezEjeRouteContextValid(previousStation, nextStation);
    }

    if (!allowedAdjacentTroncals) {
      return true;
    }

    const previousIsAllowed =
      !previousStation || allowedAdjacentTroncals.has(previousStation.troncal);
    const nextIsAllowed =
      !nextStation || allowedAdjacentTroncals.has(nextStation.troncal);

    return previousIsAllowed && nextIsAllowed;
  });
}

function getRecognizedRoutes() {
  if (recognizedRoutesCache) {
    return recognizedRoutesCache;
  }

  recognizedRoutesCache = allRoutes
    .flatMap((route) =>
      expandRouteStopVariants(route.paradas).map((paradas) => ({
        routeId: route.ruta,
        tipo: route.tipo,
        originLabel: route.origen,
        destinationLabel: route.destino,
        stations: dedupeConsecutiveStations(
          paradas.reduce<TransmilenioStation[]>((stations, stopName) => {
            const station = getStationByName(stopName, { includeInactive: false });

            if (station) {
              stations.push(station);
            }

            return stations;
          }, [])
        ),
      }))
    )
    .filter((route) => route.stations.length >= 2);

  return recognizedRoutesCache;
}

function buildRouteSegment(
  stations: TransmilenioStation[],
  routeId: string,
  mode: 'troncal' | 'bus' | 'walk',
  options?: {
    routeCode?: string;
    direction?: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
    isTransfer?: boolean;
    distanceMeters?: number;
    instructions?: string[];
  }
): RouteSegment {
  const firstStation = stations[0];
  const lastStation = stations[stations.length - 1] ?? firstStation;

  return {
    routeId,
    stations,
    mode,
    troncal: firstStation?.troncal ?? 'Sin troncal definida',
    routeCode: options?.routeCode ?? (firstStation ? buildFallbackRouteCode(firstStation) : routeId),
    direction:
      options?.direction ??
      (firstStation && lastStation
        ? inferDirectionFromStations(firstStation, lastStation)
        : 'Norte'),
    isTransfer: options?.isTransfer ?? false,
    distanceMeters: options?.distanceMeters,
    instructions: options?.instructions,
  };
}

function buildWalkTransferSegment(
  origin: TransmilenioStation,
  destination: TransmilenioStation,
  connection: TransferConnection
) {
  return buildRouteSegment([origin, destination], `walk:${origin.id}:${destination.id}`, 'walk', {
    routeCode: 'TRANSBORDO',
    direction: inferDirectionFromStations(origin, destination),
    isTransfer: connection.isTransfer,
    distanceMeters: connection.distanceMeters,
    instructions: connection.instructions,
  });
}

function buildRoutePlan(
  origin: TransmilenioStation,
  destination: TransmilenioStation,
  segments: RouteSegment[]
): RoutePlan {
  const transferStations = segments
    .flatMap((segment, index) => {
      const nextSegment = segments[index + 1];

      if (segment.mode === 'walk') {
        return [];
      }

      if (nextSegment?.mode === 'walk') {
        return [nextSegment.stations[0] ?? segment.stations[segment.stations.length - 1]];
      }

      if (nextSegment) {
        return [segment.stations[segment.stations.length - 1]];
      }

      return [];
    })
    .filter(
      (station): station is TransmilenioStation =>
        Boolean(station) && station.id !== origin.id && station.id !== destination.id
    );

  return {
    origin,
    destination,
    segments,
    legs: segments.map((segment, index) => ({
      ...(segment.mode === 'walk'
        ? {
            type: 'walk' as const,
            from: segment.stations[0] ?? origin,
            to: segment.stations[segment.stations.length - 1] ?? destination,
            routeId: segment.routeId,
            routeCode: segment.routeCode,
            direction: segment.direction,
            troncal: segment.troncal,
            stations: segment.stations,
            isTransferLeg: true,
            distanceMeters: segment.distanceMeters ?? 0,
            instructions: segment.instructions ?? [],
          }
        : {
            type: 'bus' as const,
            from: segment.stations[0] ?? origin,
            to: segment.stations[segment.stations.length - 1] ?? destination,
            routeId: segment.routeId,
            routeCode: segment.routeCode,
            direction: segment.direction,
            troncal: segment.troncal,
            stations: segment.stations,
            isTransferLeg: index > 0,
          }),
    })),
    transferStations,
    usesTransfer: transferStations.length > 0,
  };
}

function findBestDirectRouteSegment(
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  const candidates = getRecognizedRoutes()
    .flatMap((route) => {
      const originIndex = route.stations.findIndex((station) => station.id === origin.id);
      const destinationIndex = route.stations.findIndex(
        (station) => station.id === destination.id
      );

      if (
        originIndex === -1 ||
        destinationIndex === -1 ||
        destinationIndex <= originIndex
      ) {
        return [];
      }

      const candidateStations = route.stations.slice(originIndex, destinationIndex + 1);

      if (!isBusSegmentConsistent(candidateStations)) {
        return [];
      }

      return [
        buildRouteSegment(
          candidateStations,
          route.routeId,
          'bus',
          {
            routeCode: route.routeId,
            direction: inferDirectionFromStations(origin, destination),
          }
        ),
      ];
    })
    .sort((left, right) => left.stations.length - right.stations.length);

  return candidates[0] ?? null;
}

export function countStationsBetween(
  originStationName: string,
  destinationStationName: string
) {
  const plan = planRoute(originStationName, destinationStationName);
  if (plan) {
    const flattenedStations = plan.segments
      .filter((segment) => segment.mode !== 'walk')
      .flatMap((segment, index) =>
        index === 0 ? segment.stations : segment.stations.slice(1)
      );

    return Math.max(0, flattenedStations.length - 1);
  }

  const origin = getStationByName(originStationName);
  const destination = getStationByName(destinationStationName);

  if (!origin || !destination || origin.troncal !== destination.troncal) {
    return null;
  }

  return Math.abs(destination.order - origin.order);
}

export function getRemainingStations(
  currentStationName: string,
  destinationStationName: string
) {
  return countStationsBetween(currentStationName, destinationStationName);
}

function getOrderedStationsWithinTroncal(
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  const stations = getStationsByTroncal(origin.troncal);
  const isForward = origin.order <= destination.order;

  return stations.filter((station) =>
    isForward
      ? station.order >= origin.order && station.order <= destination.order
      : station.order <= origin.order && station.order >= destination.order
  ).sort((left, right) => (isForward ? left.order - right.order : right.order - left.order));
}

function findSegmentBetweenStations(
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  if (isRicaurteTransferPair(origin, destination) || isJimenezTransferPair(origin, destination)) {
    return null;
  }

  if (origin.id === destination.id) {
    return buildRouteSegment([origin], `troncal:${origin.troncal}`, 'troncal');
  }

  const directRecognizedSegment = findBestDirectRouteSegment(origin, destination);

  if (directRecognizedSegment) {
    return directRecognizedSegment;
  }

  if (origin.troncal === destination.troncal) {
    return buildRouteSegment(
      getOrderedStationsWithinTroncal(origin, destination),
      `troncal:${origin.troncal}`,
      'troncal',
      {
        routeCode: buildFallbackRouteCode(origin),
        direction: inferDirectionFromStations(origin, destination),
      }
    );
  }

  return null;
}

function getTransferPriority(station: TransmilenioStation) {
  return TRANSFER_HUB_PRIORITIES[station.id] ?? 99;
}

function isCentralTroncal(station: TransmilenioStation) {
  return [
    'Zona A - Caracas',
    'Zona J - Eje Ambiental',
    'Zona L - Carrera 10',
    'Zona M - Museo Nacional',
  ].includes(station.troncal);
}

function isCaracasCenterTarget(station: TransmilenioStation) {
  return (
    [MUSEO_NACIONAL_ID, 'san-diego', 'calle-34', 'avenida-39', 'calle-45'].includes(station.id) ||
    ['Zona A - Caracas', 'Zona M - Museo Nacional'].includes(station.troncal)
  );
}

function isHistoricCenterTarget(station: TransmilenioStation) {
  return (
    [LAS_NIEVES_ID, 'san-victorino', 'museo-del-oro', 'las-aguas', 'universidades'].includes(station.id) ||
    ['Zona J - Eje Ambiental', 'Zona L - Carrera 10'].includes(station.troncal)
  );
}

function getTransferScoreAdjustment(
  transferStation: TransmilenioStation,
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  const isJimenezHub =
    transferStation.id === JIMENEZ_CARACAS_ID || transferStation.id === JIMENEZ_EJE_ID;
  const isMuseoNacionalNode = transferStation.id === MUSEO_NACIONAL_ID;
  const isLasNievesNode = transferStation.id === LAS_NIEVES_ID;

  if (isJimenezHub && (isCentralTroncal(origin) || isCentralTroncal(destination))) {
    return -3;
  }

  if (
    isMuseoNacionalNode &&
    isCaracasCenterTarget(destination) &&
    !['Zona J - Eje Ambiental', 'Zona L - Carrera 10'].includes(destination.troncal)
  ) {
    return -2;
  }

  if (
    isLasNievesNode &&
    isHistoricCenterTarget(destination) &&
    ['Zona L - Carrera 10', 'Zona J - Eje Ambiental', 'Zona N - Carrera 7'].includes(origin.troncal)
  ) {
    return -2;
  }

  return 0;
}

function findBestTransferRoutePlan(
  origin: TransmilenioStation,
  destination: TransmilenioStation,
  candidates: TransmilenioStation[]
) {
  return candidates
    .filter((station) => station.id !== origin.id && station.id !== destination.id)
    .flatMap((transferStation) => {
      const firstSegment = findSegmentBetweenStations(origin, transferStation);
      const secondSegment = findSegmentBetweenStations(transferStation, destination);
      const plans: { score: number; plan: RoutePlan }[] = [];

      if (firstSegment && secondSegment) {
        const totalStops =
          firstSegment.stations.length + secondSegment.stations.length - 1;
        const score =
          totalStops +
          getTransferPriority(transferStation) * 2 +
          (transferStation.troncal === origin.troncal ? 6 : 0) +
          getTransferScoreAdjustment(transferStation, origin, destination);

        plans.push({
          score,
          plan: buildRoutePlan(origin, destination, [firstSegment, secondSegment]),
        });
      }

      for (const connection of transferStation.transferConnections ?? []) {
        const connectedStation = getStationById(connection.stationId, {
          includeInactive: false,
        });

        if (!firstSegment || !connectedStation) {
          continue;
        }

        const connectedSegment = findSegmentBetweenStations(connectedStation, destination);

        if (!connectedSegment) {
          continue;
        }

        const tunnelPenalty = Math.max(1, Math.round(connection.distanceMeters / 80));
        const totalStops =
          firstSegment.stations.length + connectedSegment.stations.length - 1;
        const score =
          totalStops +
          getTransferPriority(transferStation) * 2 +
          tunnelPenalty +
          (transferStation.troncal === origin.troncal ? 4 : 0) +
          getTransferScoreAdjustment(transferStation, origin, destination);

        plans.push({
          score,
          plan: buildRoutePlan(origin, destination, [
            firstSegment,
            buildWalkTransferSegment(transferStation, connectedStation, connection),
            connectedSegment,
          ]),
        });
      }

      return plans;
    })
    .sort((left, right) => left.score - right.score)[0]?.plan ?? null;
}

export function getRouteWithTransfers(
  originStationInput: string | TransmilenioStation,
  destinationStationInput: string | TransmilenioStation
): RoutePlan | null {
  const originResolution = resolveStationAvailability(originStationInput);
  const destinationResolution = resolveStationAvailability(destinationStationInput);
  const origin = originResolution?.resolvedStation ?? null;
  const destination = destinationResolution?.resolvedStation ?? null;

  if (!origin || !destination) {
    return null;
  }

  if (origin.id === destination.id) {
    return buildRoutePlan(origin, destination, [
      buildRouteSegment([origin], `troncal:${origin.troncal}`, 'troncal'),
    ]);
  }

  if (origin.troncal === destination.troncal) {
    const directSegment = findSegmentBetweenStations(origin, destination);

    if (directSegment) {
      return buildRoutePlan(origin, destination, [directSegment]);
    }
  }

  const activeStations = getAllStations({ includeInactive: false });
  const preferredTransfers = activeStations.filter((station) =>
    PREFERRED_TRANSFER_STATION_IDS.has(station.id)
  );

  const preferredPlan = findBestTransferRoutePlan(origin, destination, preferredTransfers);

  if (preferredPlan) {
    return preferredPlan;
  }

  const fallbackTransferPlan = findBestTransferRoutePlan(origin, destination, activeStations);

  if (fallbackTransferPlan) {
    return fallbackTransferPlan;
  }

  const directCrossTroncalSegment = findBestDirectRouteSegment(origin, destination);

  if (directCrossTroncalSegment) {
    return buildRoutePlan(origin, destination, [directCrossTroncalSegment]);
  }

  return null;
}

export function buildUserNavigationPlan(
  userCoordinates: StationCoordinates,
  destinationStationInput: string | TransmilenioStation,
  options?: { stationArrivalThresholdMeters?: number }
): UserNavigationPlan | null {
  const nearestStationMatch = findNearestStation(userCoordinates);
  const destinationResolution = resolveStationAvailability(destinationStationInput);

  if (!nearestStationMatch || !destinationResolution) {
    return null;
  }

  const routePlan = getRouteWithTransfers(
    nearestStationMatch.station,
    destinationResolution.resolvedStation
  );
  const stationArrivalThresholdMeters = options?.stationArrivalThresholdMeters ?? 65;
  const userIsAlreadyAtOriginStation =
    nearestStationMatch.distanceMeters <= stationArrivalThresholdMeters;
  const legs: UserNavigationLeg[] = [];

  if (!userIsAlreadyAtOriginStation) {
    legs.push({
      type: 'walk',
      to: nearestStationMatch.station,
    });
  }

  if (routePlan) {
    legs.push(...routePlan.legs);
  }

  return {
    originStation: nearestStationMatch.station,
    destinationStation: destinationResolution.resolvedStation,
    routePlan,
    legs,
    userIsAlreadyAtOriginStation,
    walkingDistanceMeters: nearestStationMatch.distanceMeters,
  };
}

export function planRoute(originStationName: string, destinationStationName: string): RoutePlan | null {
  return getRouteWithTransfers(originStationName, destinationStationName);
}

export function getStationsForRoute(
  originStationName: string,
  destinationStationName: string
) {
  const plan = planRoute(originStationName, destinationStationName);
  if (plan) {
    return plan.segments
      .filter((segment) => segment.mode !== 'walk')
      .flatMap((segment, index) =>
        index === 0 ? segment.stations : segment.stations.slice(1)
      );
  }

  const origin = getStationByName(originStationName);
  const destination = getStationByName(destinationStationName);

  if (!origin || !destination || origin.troncal !== destination.troncal) {
    return [];
  }

  return getOrderedStationsWithinTroncal(origin, destination);
}

export function isWalkTransitLeg(leg: TransitLeg): leg is WalkTransitLeg {
  return leg.type === 'walk';
}

export function isBusTransitLeg(leg: TransitLeg): leg is BusTransitLeg {
  return leg.type === 'bus';
}

export function getBusLegs(routePlan: RoutePlan | null) {
  return (routePlan?.legs ?? []).filter(isBusTransitLeg);
}

export function getFirstBusLeg(routePlan: RoutePlan | null) {
  return getBusLegs(routePlan)[0] ?? null;
}

export function getTransferWalkLegAtStation(
  routePlan: RoutePlan | null,
  stationId: string
) {
  return (
    routePlan?.legs.find(
      (leg): leg is WalkTransitLeg =>
        isWalkTransitLeg(leg) && leg.isTransferLeg && leg.from.id === stationId
    ) ?? null
  );
}

export function getNextBusLegAfterTransferStation(
  routePlan: RoutePlan | null,
  stationId: string
) {
  const legs = routePlan?.legs ?? [];
  const transferWalkLegIndex = legs.findIndex(
    (leg) => isWalkTransitLeg(leg) && leg.isTransferLeg && leg.from.id === stationId
  );

  if (transferWalkLegIndex >= 0) {
    return (
      legs.slice(transferWalkLegIndex + 1).find(
        (leg): leg is BusTransitLeg => isBusTransitLeg(leg)
      ) ?? null
    );
  }

  return (
    legs.find(
      (leg): leg is BusTransitLeg =>
        isBusTransitLeg(leg) && leg.isTransferLeg && leg.from.id === stationId
    ) ?? null
  );
}
