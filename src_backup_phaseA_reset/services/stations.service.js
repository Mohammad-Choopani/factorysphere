// src/services/stations.service.js

import { STATIONS, TELEMETRY_BY_STATION_ID } from "../data/mock/stations.mock";

/**
 * Get all stations (metadata only)
 */
export function getStations() {
  return STATIONS;
}

/**
 * Get station by id (metadata)
 */
export function getStationById(stationId) {
  return STATIONS.find((s) => s.id === stationId) || null;
}

/**
 * Get telemetry snapshot for a station
 */
export function getStationTelemetry(stationId) {
  return TELEMETRY_BY_STATION_ID[stationId] || null;
}

/**
 * Get stations with telemetry merged (for dashboard / tables)
 */
export function getStationsWithTelemetry() {
  return STATIONS.map((station) => ({
    ...station,
    telemetry: TELEMETRY_BY_STATION_ID[station.id] || null,
  }));
}
