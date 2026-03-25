/**
 * Timeline Component
 * Provides playback controls and timeline scrubbing for session data
 */

import React, { useState, useRef, useEffect } from 'react';
import { usePlaybackControls, useTimelineMarkers } from '@/store/playbackStore';
import { useTimeline, useUIStore } from '@/store/uiStore';
import { PLAYBACK_SPEEDS } from '@/store/playbackStore';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { formatDuration } from '@/core/utils/format';

/**
 * Timeline Component
 * - Playback controls (play/pause/stop)
 * - Timeline scrubber with markers
 * - Speed control
 * - Current time display
 */
export function Timeline(): React.ReactElement {
  const timeline = useTimeline();
  const { setTimelineHeight } = useUIStore();
  const {
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    loop,
    play,
    pause,
    stop,
    togglePlay,
    setCurrentTime,
    setPlaybackSpeed,
    setLoop,
  } = usePlaybackControls();

  const { markers, jumpToMarker } = useTimelineMarkers();

  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleResize = (deltaY: number) => {
    if (!isResizing) return;
    const newHeight = timeline.height - deltaY; // Negative because we're resizing from top
    setTimelineHeight(newHeight);
  };

  const handleTimelineClick = (event: React.MouseEvent) => {
    if (!timelineRef.current || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    setCurrentTime(Math.max(0, Math.min(newTime, duration)));
  };

  const handleTimelineDrag = (event: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(x / rect.width, 1));
    const newTime = percentage * duration;

    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        handleTimelineDrag(event as any);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleTimelineDrag]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="bg-gray-800 border-t border-gray-700 flex flex-col relative"
      style={{ height: `${timeline.height}px` }}
    >
      {/* Resize Handle */}
      <ResizeHandle
        direction="vertical"
        onResizeStart={() => setIsResizing(true)}
        onResize={handleResize}
        onResizeEnd={() => setIsResizing(false)}
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-blue-500 transition-colors"
      />

      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        {/* Left: Playback Controls */}
        <div className="flex items-center space-x-3">
          {/* Play/Pause/Stop */}
          <div className="flex items-center space-x-1">
            <button
              onClick={togglePlay}
              disabled={duration === 0}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={stop}
              disabled={duration === 0}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
              title="Stop"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {PLAYBACK_SPEEDS.map(speed => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </div>

          {/* Loop Toggle */}
          <button
            onClick={() => setLoop(!loop)}
            className={`
              p-1.5 rounded transition-colors
              ${loop
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }
            `}
            title={loop ? 'Disable loop' : 'Enable loop'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Center: Time Display */}
        <div className="flex items-center space-x-2 text-sm font-mono">
          <span className="text-gray-300">
            {formatDuration(currentTime)}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Right: Markers */}
        <div className="flex items-center space-x-2">
          {markers.length > 0 && (
            <div className="text-xs text-gray-400">
              {markers.length} markers
            </div>
          )}
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="flex-1 px-4 py-2">
        <div
          ref={timelineRef}
          className="relative h-8 bg-gray-700 rounded-lg cursor-pointer overflow-hidden"
          onClick={handleTimelineClick}
          onMouseDown={(e) => {
            setIsDragging(true);
            handleTimelineClick(e);
          }}
        >
          {/* Progress Bar */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Markers */}
          {markers.map((marker) => {
            const markerPosition = duration > 0 ? (marker.timestamp / duration) * 100 : 0;
            return (
              <button
                key={marker.id}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToMarker(marker.id);
                }}
                className="absolute top-0 w-1 h-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
                style={{ left: `${markerPosition}%` }}
                title={`${marker.type}: ${marker.label || 'Marker'}`}
              />
            );
          })}

          {/* Current Time Indicator */}
          <div
            className="absolute top-0 w-0.5 h-full bg-white shadow-lg transition-all duration-100"
            style={{ left: `${progressPercentage}%` }}
          />

          {/* Hover Time Display */}
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
            Click or drag to seek
          </div>
        </div>
      </div>
    </div>
  );
}