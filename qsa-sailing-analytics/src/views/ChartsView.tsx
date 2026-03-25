/**
 * Charts View Component
 * Telemetry charts and data visualization using ECharts
 */

import React, { useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { useActiveSession } from '@/store/sessionStore';
import { usePlaybackStore } from '@/store/playbackStore';

type ChartType = 'speed' | 'wind' | 'vmg' | 'angles' | 'performance';

interface ChartConfig {
  type: ChartType;
  title: string;
  enabled: boolean;
}

const DEFAULT_CHARTS: ChartConfig[] = [
  { type: 'speed', title: 'Boat Speed', enabled: true },
  { type: 'wind', title: 'Wind Speed', enabled: true },
  { type: 'vmg', title: 'VMG', enabled: true },
  { type: 'angles', title: 'Wind Angles', enabled: false },
  { type: 'performance', title: 'Performance', enabled: false },
];

function ChartsView(): React.ReactElement {
  const activeSession = useActiveSession();
  const { currentTime, setCurrentTime } = usePlaybackStore();
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>(DEFAULT_CHARTS);
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);

  const enabledCharts = chartConfigs.filter(c => c.enabled);

  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.startTime).getTime();
      const endTime = new Date(activeSession.endTime).getTime();
      setTimeRange([startTime, endTime]);
    }
  }, [activeSession]);

  const getSpeedChartOption = useCallback(() => {
    if (!activeSession || !timeRange) return {};

    const data = activeSession.data
      .filter(d => d.bsp !== undefined)
      .map(d => [new Date(d.timestamp).getTime(), d.bsp]);

    const maxSpeed = activeSession.stats.maxSpeed || 10;

    return {
      title: {
        text: 'Boat Speed',
        textStyle: { color: '#ffffff', fontSize: 14 },
        left: 10,
        top: 10,
      },
      backgroundColor: 'transparent',
      grid: {
        left: 50,
        right: 30,
        top: 50,
        bottom: 50,
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
      },
      yAxis: {
        type: 'value',
        name: 'Speed (kts)',
        nameTextStyle: { color: '#9ca3af' },
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
        min: 0,
        max: Math.ceil(maxSpeed * 1.1),
      },
      series: [
        {
          name: 'Boat Speed',
          type: 'line',
          data,
          lineStyle: { color: '#10b981', width: 2 },
          symbol: 'none',
          sampling: 'lttb', // Optimize for large datasets
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2937',
        borderColor: '#4b5563',
        textStyle: { color: '#ffffff' },
        formatter: (params: any) => {
          const [time, speed] = params[0].data;
          return `${new Date(time).toLocaleTimeString()}<br/>Speed: ${speed?.toFixed(1)} kts`;
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
    };
  }, [activeSession, timeRange]);

  const getWindChartOption = useCallback(() => {
    if (!activeSession || !timeRange) return {};

    const twsData = activeSession.data
      .filter(d => d.tws !== undefined)
      .map(d => [new Date(d.timestamp).getTime(), d.tws]);

    const awsData = activeSession.data
      .filter(d => d.aws !== undefined)
      .map(d => [new Date(d.timestamp).getTime(), d.aws]);

    const maxWind = Math.max(
      ...[...twsData, ...awsData].map(d => d[1])
    );

    return {
      title: {
        text: 'Wind Speed',
        textStyle: { color: '#ffffff', fontSize: 14 },
        left: 10,
        top: 10,
      },
      backgroundColor: 'transparent',
      legend: {
        data: ['True Wind', 'Apparent Wind'],
        textStyle: { color: '#9ca3af' },
        top: 10,
        right: 30,
      },
      grid: {
        left: 50,
        right: 30,
        top: 50,
        bottom: 50,
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
      },
      yAxis: {
        type: 'value',
        name: 'Wind Speed (kts)',
        nameTextStyle: { color: '#9ca3af' },
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
        min: 0,
        max: Math.ceil(maxWind * 1.1),
      },
      series: [
        {
          name: 'True Wind',
          type: 'line',
          data: twsData,
          lineStyle: { color: '#3b82f6', width: 2 },
          symbol: 'none',
          sampling: 'lttb',
        },
        {
          name: 'Apparent Wind',
          type: 'line',
          data: awsData,
          lineStyle: { color: '#06b6d4', width: 2 },
          symbol: 'none',
          sampling: 'lttb',
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2937',
        borderColor: '#4b5563',
        textStyle: { color: '#ffffff' },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
    };
  }, [activeSession, timeRange]);

  const getVMGChartOption = useCallback(() => {
    if (!activeSession || !timeRange) return {};

    // Calculate VMG for each data point
    const vmgData = activeSession.data
      .filter(d => d.bsp !== undefined && d.twa !== undefined)
      .map(d => {
        const twaRad = Math.abs(d.twa!) * Math.PI / 180;
        const vmg = d.bsp! * Math.cos(twaRad);
        return [new Date(d.timestamp).getTime(), vmg];
      });

    const maxVMG = Math.max(...vmgData.map(d => d[1]));
    const minVMG = Math.min(...vmgData.map(d => d[1]));

    return {
      title: {
        text: 'Velocity Made Good (VMG)',
        textStyle: { color: '#ffffff', fontSize: 14 },
        left: 10,
        top: 10,
      },
      backgroundColor: 'transparent',
      grid: {
        left: 50,
        right: 30,
        top: 50,
        bottom: 50,
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
      },
      yAxis: {
        type: 'value',
        name: 'VMG (kts)',
        nameTextStyle: { color: '#9ca3af' },
        axisLine: { lineStyle: { color: '#4b5563' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#374151' } },
        min: Math.floor(minVMG) - 1,
        max: Math.ceil(maxVMG) + 1,
      },
      series: [
        {
          name: 'VMG',
          type: 'line',
          data: vmgData,
          lineStyle: { color: '#f59e0b', width: 2 },
          symbol: 'none',
          sampling: 'lttb',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.1)' },
              ],
            },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2937',
        borderColor: '#4b5563',
        textStyle: { color: '#ffffff' },
        formatter: (params: any) => {
          const [time, vmg] = params[0].data;
          return `${new Date(time).toLocaleTimeString()}<br/>VMG: ${vmg?.toFixed(1)} kts`;
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
    };
  }, [activeSession, timeRange]);

  const getChartOption = (type: ChartType) => {
    switch (type) {
      case 'speed':
        return getSpeedChartOption();
      case 'wind':
        return getWindChartOption();
      case 'vmg':
        return getVMGChartOption();
      default:
        return {};
    }
  };

  const onChartClick = (params: any, type: ChartType) => {
    if (params.data && params.data[0]) {
      const clickedTime = new Date(params.data[0]).toISOString();
      setCurrentTime(clickedTime);
    }
  };

  const toggleChart = (type: ChartType) => {
    setChartConfigs(prev =>
      prev.map(config =>
        config.type === type
          ? { ...config, enabled: !config.enabled }
          : config
      )
    );
  };

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p>Load a sailing session to view telemetry charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <h2 className="text-lg font-medium text-white">Charts View</h2>

        {/* Chart Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Show:</span>
            {chartConfigs.map(config => (
              <label key={config.type} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={() => toggleChart(config.type)}
                  className="rounded border-gray-600 text-blue-500"
                />
                <span className="text-sm text-gray-400">{config.title}</span>
              </label>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            {activeSession.name}
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div className="flex-1 overflow-auto bg-gray-800">
        {enabledCharts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p>Select charts to display using the controls above</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-4" style={{
            gridTemplateRows: `repeat(${enabledCharts.length}, minmax(200px, 1fr))`
          }}>
            {enabledCharts.map((chart) => (
              <div key={chart.type} className="bg-gray-900 rounded-lg border border-gray-700">
                <ReactECharts
                  option={getChartOption(chart.type)}
                  style={{ height: '250px', width: '100%' }}
                  onEvents={{
                    click: (params: any) => onChartClick(params, chart.type),
                  }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChartsView;