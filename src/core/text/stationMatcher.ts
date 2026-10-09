import type { StationMatchResult, TransmilenioStation } from '@/src/domain/models/Station';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getStationSearchTerms(station: TransmilenioStation): string[] {
  return [station.name, station.troncal, ...(station.aliases ?? [])];
}

export function getNormalizedTokens(value: string): string[] {
  return normalizeText(value).split(' ').filter(Boolean);
}

export function getStationMatchScore(station: TransmilenioStation, value: string): number {
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

export function stationMatchesText(station: TransmilenioStation, value: string): boolean {
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

export function searchStationsInList(
  query: string,
  stations: TransmilenioStation[]
): TransmilenioStation[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return stations;
  }

  return stations.filter((station) =>
    getStationSearchTerms(station).some((term) =>
      normalizeText(term).includes(normalizedQuery)
    )
  );
}

function cleanSpeechCarrierPhrases(normalized: string): string {
  let cleaned = normalized;
  const prefixes = [
    'quiero ir a la estacion ',
    'quiero ir a la ',
    'quiero ir a ',
    'voy para la estacion ',
    'voy para la ',
    'voy para ',
    'voy a la estacion ',
    'voy a la ',
    'voy a ',
    'ir a la estacion ',
    'ir a la ',
    'ir a ',
    'llevame a la estacion ',
    'llevame a la ',
    'llevame a ',
    'hacia la estacion ',
    'hacia la ',
    'hacia ',
    'para la estacion ',
    'para la ',
    'a la estacion ',
    'estacion ',
  ];

  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }

  cleaned = cleaned.replace(/\s+por favor$/, '').trim();
  return cleaned;
}

export function resolveStationFromSpeechList(
  transcript: string,
  stations: TransmilenioStation[]
): StationMatchResult {
  const normalizedTranscript = normalizeText(transcript);

  if (!normalizedTranscript) {
    return {
      station: null,
      transcript,
      candidates: [],
      reason: 'empty',
    };
  }

  const cleanedTranscript = cleanSpeechCarrierPhrases(normalizedTranscript);

  const exactStation = stations.find((station) =>
    getStationSearchTerms(station).some((term) => {
      const norm = normalizeText(term);
      return norm === normalizedTranscript || (cleanedTranscript && norm === cleanedTranscript);
    })
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
      score: Math.max(
        getStationMatchScore(station, normalizedTranscript),
        cleanedTranscript ? getStationMatchScore(station, cleanedTranscript) : 0
      ),
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
