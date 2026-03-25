/**
 * Map View Component
 * Interactive map with track visualization using MapLibre GL JS
 */

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useActiveSession } from '@/store/sessionStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { calculateBounds } from '@/core/analysis/geo-utils';

interface MapOptions {
  showTrack: boolean;
  colorBy: 'speed' | 'vmg' | 'twa' | 'time';
  showBoatPosition: boolean;
}

function MapView(): React.ReactElement {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const activeSession = useActiveSession();
  const { currentTime, isPlaying } = usePlaybackStore();
  const [mapOptions, setMapOptions] = useState<MapOptions>({
    showTrack: true,
    colorBy: 'speed',
    showBoatPosition: true,
  });
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'carto-dark': {
              type: 'raster',
              tiles: [
                'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              ],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#0a0e14',
              },
            },
            {
              id: 'carto-dark-layer',
              type: 'raster',
              source: 'carto-dark',
              layout: {
                visibility: 'visible',
              },
              paint: {
                'raster-opacity': 0.8,
              },
            },
          ],
        },
        center: [0, 0],
        zoom: 2,
        attributionControl: false,
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setIsMapLoaded(true);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update track when session changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || !activeSession || !mapOptions.showTrack) {
      return;
    }

    updateTrack();
  }, [activeSession, mapOptions, isMapLoaded]);

  // Update boat position based on playback time
  useEffect(() => {
    if (!map.current || !isMapLoaded || !activeSession || !mapOptions.showBoatPosition) {
      return;
    }

    updateBoatPosition();
  }, [currentTime, activeSession, mapOptions.showBoatPosition, isMapLoaded]);

  const updateTrack = () => {
    if (!map.current || !activeSession) return;

    const validPoints = activeSession.data.filter(point =>
      point.lat !== undefined &&
      point.lon !== undefined &&
      !isNaN(point.lat) &&
      !isNaN(point.lon)
    );

    if (validPoints.length === 0) return;

    // Create track line feature
    const trackFeature = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: validPoints.map(point => [point.lon!, point.lat!])
      }
    };

    // Remove existing track sources/layers
    if (map.current!.getSource('track')) {
      map.current!.removeLayer('track-line');
      map.current!.removeSource('track');
    }

    // Add track source
    map.current!.addSource('track', {
      type: 'geojson',
      data: trackFeature,
      lineMetrics: true
    });

    // Get color based on selected metric
    const lineColor = getTrackColor(mapOptions.colorBy, validPoints);

    // Add track layer
    map.current!.addLayer({
      id: 'track-line',
      type: 'line',
      source: 'track',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': lineColor,
        'line-width': 3
      }
    });

    // Fit map to track bounds
    const bounds = calculateBounds(validPoints);
    if (bounds) {
      map.current!.fitBounds([
        [bounds.west, bounds.south],
        [bounds.east, bounds.north]
      ], {
        padding: 50
      });
    }
  };

  const updateBoatPosition = () => {
    if (!map.current || !activeSession || !currentTime) return;

    // Find the closest data point to current time
    const targetTime = new Date(currentTime).getTime();
    let closestPoint = activeSession.data[0];
    let minDiff = Math.abs(new Date(closestPoint.timestamp).getTime() - targetTime);

    for (const point of activeSession.data) {
      const diff = Math.abs(new Date(point.timestamp).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    if (!closestPoint.lat || !closestPoint.lon) return;

    // Remove existing boat marker
    if (map.current!.getSource('boat-position')) {
      map.current!.removeLayer('boat-position');
      map.current!.removeSource('boat-position');
    }

    // Add boat marker
    map.current!.addSource('boat-position', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {
          speed: closestPoint.bsp || 0,
          heading: closestPoint.hdg || 0,
        },
        geometry: {
          type: 'Point',
          coordinates: [closestPoint.lon, closestPoint.lat]
        }
      }
    });

    map.current!.addLayer({
      id: 'boat-position',
      type: 'circle',
      source: 'boat-position',
      paint: {
        'circle-radius': 8,
        'circle-color': '#3b82f6',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.9
      }
    });
  };

  const getTrackColor = (colorBy: string, points: any[]): string => {
    switch (colorBy) {
      case 'speed':
        // In a real implementation, this would use data-driven styling
        return '#10b981'; // Green for speed
      case 'vmg':
        return '#f59e0b'; // Orange for VMG
      case 'twa':
        return '#8b5cf6'; // Purple for TWA
      case 'time':
        return '#06b6d4'; // Cyan for time
      default:
        return '#3b82f6'; // Default blue
    }
  };

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <p>Load a sailing session to view track on map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <h2 className="text-lg font-medium text-white">Map View</h2>

        {/* Map Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Color by:</label>
            <select
              value={mapOptions.colorBy}
              onChange={(e) => setMapOptions(prev => ({ ...prev, colorBy: e.target.value as any }))}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="speed">Speed</option>
              <option value="vmg">VMG</option>
              <option value="twa">TWA</option>
              <option value="time">Time</option>
            </select>
          </div>

          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={mapOptions.showTrack}
              onChange={(e) => setMapOptions(prev => ({ ...prev, showTrack: e.target.checked }))}
              className="rounded border-gray-600"
            />
            <span>Show Track</span>
          </label>

          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={mapOptions.showBoatPosition}
              onChange={(e) => setMapOptions(prev => ({ ...prev, showBoatPosition: e.target.checked }))}
              className="rounded border-gray-600"
            />
            <span>Show Boat</span>
          </label>

          <div className="text-sm text-gray-400">
            {activeSession.name}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {!isMapLoaded && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;