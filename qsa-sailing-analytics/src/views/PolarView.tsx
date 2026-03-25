/**
 * Polar View Component
 * Polar diagram visualization and analysis
 */

import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useActiveSession } from '@/store/sessionStore';
import { useAnalysisResults } from '@/store/analysisStore';
import { buildPolar, createPolarBuilder, findOptimalAngles } from '@/core/analysis/polar-builder';

type PolarMode = 'speed' | 'vmg';

function PolarView(): React.ReactElement {
  const activeSession = useActiveSession();
  const { polarDiagram } = useAnalysisResults();
  const [mode, setMode] = useState<PolarMode>('speed');
  const [selectedTws, setSelectedTws] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPolar, setGeneratedPolar] = useState<any>(null);

  // Generate polar from session data
  const buildPolarFromSession = async () => {
    if (!activeSession) return;

    setIsGenerating(true);
    try {
      const builder = createPolarBuilder();
      const polar = buildPolar(activeSession.data, builder);
      setGeneratedPolar(polar);
    } catch (error) {
      console.error('Failed to build polar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (activeSession && !generatedPolar) {
      buildPolarFromSession();
    }
  }, [activeSession]);

  const currentPolar = polarDiagram || generatedPolar;

  const twsOptions = useMemo(() => {
    if (!currentPolar?.points) return [];
    const twsValues = [...new Set(currentPolar.points.map((p: any) => p.tws))].sort((a, b) => a - b);
    return twsValues;
  }, [currentPolar]);

  const getPolarChartOption = () => {
    if (!currentPolar?.points) return {};

    const points = currentPolar.points;
    const filteredPoints = selectedTws
      ? points.filter((p: any) => Math.abs(p.tws - selectedTws) <= 1)
      : points;

    // Convert polar data to ECharts polar format
    const data = filteredPoints.map((point: any) => {
      const angle = point.twa; // TWA in degrees
      const radius = mode === 'speed' ? point.bsp : point.vmg;
      return [angle, radius, point.tws]; // [angle, radius, windspeed for tooltip]
    });

    // Create wind speed groups for coloring
    const twsGroups = [...new Set(filteredPoints.map((p: any) => p.tws))].sort((a, b) => a - b);
    const colorMap = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
    ];

    const series = twsGroups.map((tws, index) => {
      const groupData = data.filter(d => Math.abs(d[2] - tws) <= 0.5);
      return {
        name: `${tws.toFixed(0)} kts`,
        type: 'line',
        coordinateSystem: 'polar',
        data: groupData.map(d => [d[0], d[1]]),
        lineStyle: {
          color: colorMap[index % colorMap.length],
          width: 2,
        },
        symbol: 'circle',
        symbolSize: 4,
        connectNulls: false,
      };
    });

    const maxRadius = Math.max(...data.map(d => d[1])) * 1.1;

    return {
      title: {
        text: `Polar Diagram - ${mode === 'speed' ? 'Boat Speed' : 'VMG'}`,
        textStyle: { color: '#ffffff', fontSize: 16 },
        left: 'center',
        top: 20,
      },
      backgroundColor: 'transparent',
      legend: {
        data: twsGroups.map(tws => `${tws.toFixed(0)} kts`),
        textStyle: { color: '#9ca3af' },
        bottom: 20,
      },
      polar: {
        center: ['50%', '55%'],
        radius: '40%',
      },
      angleAxis: {
        min: 0,
        max: 180,
        startAngle: 90, // Start from top (0° wind)
        clockwise: false,
        axisLabel: {
          formatter: (value: number) => `${value}°`,
          color: '#9ca3af',
        },
        axisLine: {
          lineStyle: { color: '#4b5563' },
        },
        splitLine: {
          lineStyle: { color: '#374151' },
        },
      },
      radiusAxis: {
        min: 0,
        max: maxRadius,
        axisLabel: {
          formatter: (value: number) => `${value.toFixed(1)}`,
          color: '#9ca3af',
        },
        axisLine: {
          lineStyle: { color: '#4b5563' },
        },
        splitLine: {
          lineStyle: { color: '#374151' },
        },
      },
      series,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1f2937',
        borderColor: '#4b5563',
        textStyle: { color: '#ffffff' },
        formatter: (params: any) => {
          const [angle, radius] = params.data;
          return `TWA: ${angle}°<br/>${mode === 'speed' ? 'Speed' : 'VMG'}: ${radius.toFixed(1)} kts<br/>Wind: ${params.seriesName}`;
        },
      },
    };
  };

  const getOptimalAngles = () => {
    if (!currentPolar?.points) return null;
    return findOptimalAngles(currentPolar);
  };

  const optimalAngles = getOptimalAngles();

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
          <p>Load a sailing session to view polar diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <h2 className="text-lg font-medium text-white">Polar Diagram</h2>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Mode:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PolarMode)}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value="speed">Boat Speed</option>
              <option value="vmg">VMG</option>
            </select>
          </div>

          {twsOptions.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Wind Speed:</label>
              <select
                value={selectedTws || ''}
                onChange={(e) => setSelectedTws(e.target.value ? Number(e.target.value) : null)}
                className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
              >
                <option value="">All Wind Speeds</option>
                {twsOptions.map(tws => (
                  <option key={tws} value={tws}>{tws.toFixed(0)} kts</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={buildPolarFromSession}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 text-sm rounded"
          >
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>

          <div className="text-sm text-gray-400">
            {activeSession.name}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Main Chart Area */}
        <div className="flex-1 bg-gray-800">
          {currentPolar?.points ? (
            <ReactECharts
              option={getPolarChartOption()}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p>Generating polar diagram...</p>
                  </>
                ) : (
                  <>
                    <p>No polar data available</p>
                    <p className="text-sm mt-2">Click "Generate" to build polar from session data</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        {currentPolar && (
          <div className="w-80 bg-gray-900 border-l border-gray-700 p-4">
            <h3 className="text-lg font-medium text-white mb-4">Analysis</h3>

            {/* Polar Stats */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm text-gray-400">Data Quality</label>
                <div className={`text-sm font-medium ${
                  currentPolar.dataQuality === 'excellent' ? 'text-green-400' :
                  currentPolar.dataQuality === 'good' ? 'text-blue-400' :
                  currentPolar.dataQuality === 'fair' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {currentPolar.dataQuality?.toUpperCase()}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Coverage</label>
                <div className="text-white">{currentPolar.coverage?.toFixed(1)}%</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Data Points</label>
                <div className="text-white">{currentPolar.points?.length || 0}</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Wind Range</label>
                <div className="text-white">
                  {currentPolar.twsRange?.min?.toFixed(1)} - {currentPolar.twsRange?.max?.toFixed(1)} kts
                </div>
              </div>
            </div>

            {/* Optimal Angles */}
            {optimalAngles && (
              <div>
                <h4 className="text-md font-medium text-white mb-3">Optimal VMG Angles</h4>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-300">Upwind</h5>
                    <div className="space-y-2">
                      {optimalAngles.upwind.slice(0, 3).map((opt, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-400">{opt.tws.toFixed(0)} kts:</span>
                          <span className="text-white">{opt.optimalTwa.toFixed(0)}° ({opt.vmg.toFixed(1)} kts)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-300">Downwind</h5>
                    <div className="space-y-2">
                      {optimalAngles.downwind.slice(0, 3).map((opt, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-400">{opt.tws.toFixed(0)} kts:</span>
                          <span className="text-white">{opt.optimalTwa.toFixed(0)}° ({opt.vmg.toFixed(1)} kts)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PolarView;