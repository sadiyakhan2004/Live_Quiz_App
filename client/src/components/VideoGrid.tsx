import React, { useRef, useState, useMemo, useEffect } from "react";
import { FaVolumeMute, FaMicrophoneAlt, FaCrown, FaThumbtack } from "react-icons/fa";
import gsap from "gsap";

// Define types for stream and user state
interface Stream {
  track: MediaStreamTrack;
  kind?: string;
  type?: string;
  isCameraOn?: boolean;
  isMicrophoneOn?: boolean;
  name?: string;
  email?: string;
  isHost?: boolean;
  id?: string;
}

interface VideoGridProps {
  streams: Stream[];
}

interface SpeakingUsers {
  [key: number]: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({
  streams, 
  
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [speakingUsers, setSpeakingUsers] = useState<SpeakingUsers>({});
  const [pinnedStreamIndex, setPinnedStreamIndex] = useState<number | null>(null);

  // Memoize the list of streams to avoid unnecessary re-renders
  const otherStreams = useMemo(() => streams.filter((stream) => stream.type !== "screen-video"), [streams]);
  const videoStreams = useMemo(() => otherStreams.filter((stream) => stream.kind === "video"), [otherStreams]);
  const screenStream = useMemo(() => streams.find((stream) => stream.type === "screen-video"), [streams]);

  // Effect to handle when a pinned stream leaves the room
  useEffect(() => {
    // If pinnedStreamIndex is set but that index no longer exists in otherStreams
    if (pinnedStreamIndex !== null && pinnedStreamIndex >= otherStreams.length) {
      setPinnedStreamIndex(null); // Reset the pinned state
    }
  }, [otherStreams, pinnedStreamIndex]);

  // Get the role label (Host or User)
  const getRoleLabel = (isHost: boolean | undefined) => {
    return isHost ? "Host" : "User";
  };

  // Get the first letter for the avatar
  const getAvatarLetter = (name: string | undefined) => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    return "?";
  };

  // Toggle pin status for a stream
  const togglePinStream = (index: number) => {
    setPinnedStreamIndex(prevIndex => prevIndex === index ? null : index);
  };

  // Render audio streams
  const renderAudioElements = () => {
    return otherStreams.map(({ track, kind, id }, index) => {
      if (kind === "audio" && track) {
        return (
          <audio
            key={`audio-${id || index}`}
            autoPlay
            ref={(audio) => {
              if (audio) audio.srcObject = new MediaStream([track]);
            }}
            className="hidden"
          />
        );
      }
      return null;
    });
  };

  // Check if we should show the side panel in pinned mode
  const shouldShowSidePanel = videoStreams.length > 1;

  return (
    <div className={`grid ${screenStream ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'} gap-4 h-full max-h-[calc(100vh-100px)]`}>
      {/* Participants Video Grid (takes full width when no screen share) */}
      <div
        ref={containerRef}
        className={`bg-gray-900 rounded-lg p-4 overflow-hidden relative ${screenStream ? 'lg:col-span-2' : 'w-full'}`}
      >
        {/* Always render audio elements, regardless of layout */}
        {renderAudioElements()}
        
        {pinnedStreamIndex !== null && pinnedStreamIndex < otherStreams.length ? (
          // Pinned layout with side panel (if needed)
          <div className="relative h-full w-full flex">
            {/* Main pinned video - taking less space to make room for side panel (if needed) */}
            <div className={`h-full ${shouldShowSidePanel ? 'flex-grow pr-64' : 'w-full'}`}>
              {otherStreams[pinnedStreamIndex]?.kind === "video" && (
                <div
                  key={`pinned-video-${otherStreams[pinnedStreamIndex].id || pinnedStreamIndex}`}
                  className={`relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center shadow-lg ${
                    speakingUsers[pinnedStreamIndex] ? 'ring-2 ring-blue-500' : ''
                  } h-full`}
                >
                  {otherStreams[pinnedStreamIndex].isCameraOn ? (
                    otherStreams[pinnedStreamIndex].track.enabled ? (
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        ref={(video) => {
                          if (video) video.srcObject = new MediaStream([otherStreams[pinnedStreamIndex].track]);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-white text-lg font-semibold">
                        <div className="animate-pulse">Connecting...</div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-gray-700 to-gray-800">
                      <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold rounded-full">
                        {getAvatarLetter(otherStreams[pinnedStreamIndex].name)}
                      </div>
                      <span className="mt-2 text-gray-300 text-sm">
                        {otherStreams[pinnedStreamIndex].name || "Unknown"}
                      </span>
                    </div>
                  )}
                  
                  {/* User info overlay with improved unpin button */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center">
                      {otherStreams[pinnedStreamIndex].isHost && <FaCrown className="text-yellow-400 mr-1" />}
                      <span className={`text-white font-medium text-sm ${speakingUsers[pinnedStreamIndex] ? 'text-blue-300' : ''}`}>
                        {getRoleLabel(otherStreams[pinnedStreamIndex].isHost)}
                      </span>
                      <div className="ml-auto flex items-center">
                        {otherStreams[pinnedStreamIndex].isMicrophoneOn ? (
                          <FaMicrophoneAlt className={`${speakingUsers[pinnedStreamIndex] ? 'text-blue-400' : 'text-white'}`} />
                        ) : (
                          <FaVolumeMute className="text-red-400" />
                        )}
                        
                        <button 
                          onClick={() => togglePinStream(pinnedStreamIndex)}
                          className="ml-2 p-1 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
                          aria-label="Unpin video"
                        >
                          <FaThumbtack className="text-white rotate-45" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Wider side panel overlay with other videos - only show if there are other video streams */}
            {shouldShowSidePanel && (
              <div className="absolute top-0 right-0 bottom-0 w-64 overflow-y-auto flex flex-col gap-2 p-2 bg-black/20 backdrop-blur-sm">
                {otherStreams.map((stream, index) => {
                  if (index === pinnedStreamIndex || stream.kind !== "video") return null;
                  
                  const isSpeaking = speakingUsers[index] || false;
                  const roleLabel = getRoleLabel(stream.isHost);
                  
                  return (
                    <div
                      key={`overlay-video-${stream.id || index}`}
                      className={`relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center ${
                        isSpeaking ? 'ring-1 ring-blue-500' : ''
                      } cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all`}
                      style={{ height: '120px' }}
                      onClick={() => togglePinStream(index)}
                    >
                      {stream.isCameraOn ? (
                        stream.track.enabled ? (
                          <video
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover rounded-lg"
                            ref={(video) => {
                              if (video) video.srcObject = new MediaStream([stream.track]);
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-white text-xs font-semibold">
                            <div className="animate-pulse text-xs">...</div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold rounded-full">
                            {getAvatarLetter(stream.name)}
                          </div>
                        </div>
                      )}
                      
                      {/* Improved overlay info for wider strip */}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm truncate max-w-full">
                            {stream.name || "Unknown"}
                          </span>
                          {stream.isMicrophoneOn ? 
                            <FaMicrophoneAlt className="text-white text-sm ml-1" /> : 
                            <FaVolumeMute className="text-red-400 text-sm ml-1" />
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Regular grid layout
          <div className={`grid gap-4 auto-rows-fr ${
            screenStream 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          } overflow-y-auto`}>
            {otherStreams.map(({ track, kind, isCameraOn, isMicrophoneOn, name, isHost, id }, index) => {
              // Skip audio streams in the visual grid
              if (kind !== "video") return null;
              
              const isSpeaking = speakingUsers[index] || false;
              const roleLabel = getRoleLabel(isHost);

              return (
                <div
                  key={`video-${id || index}`}
                  className={`relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center w-full shadow-lg ${
                    isSpeaking ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{ minHeight: '180px' }}
                >
                  {isCameraOn ? (
                    track.enabled ? (
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        ref={(video) => {
                          if (video) video.srcObject = new MediaStream([track]);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-white text-lg font-semibold">
                        <div className="animate-pulse">Connecting...</div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-gray-700 to-gray-800">
                      <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold rounded-full">
                        {getAvatarLetter(name)}
                      </div>
                      <span className="mt-2 text-gray-300 text-sm">{name || "Unknown"}</span>
                    </div>
                  )}
                  
                  {/* User info overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center">
                      {isHost && <FaCrown className="text-yellow-400 mr-1" />}
                      <span className={`text-white font-medium text-sm ${isSpeaking ? 'text-blue-300' : ''}`}>
                        {roleLabel}
                      </span>
                      <div className="ml-auto flex items-center">
                        {isMicrophoneOn ? (
                          <FaMicrophoneAlt className={`${isSpeaking ? 'text-blue-400' : 'text-white'}`} />
                        ) : (
                          <FaVolumeMute className="text-red-400" />
                        )}
                        
                        <button 
                          onClick={() => togglePinStream(index)}
                          className="ml-2 p-1 rounded-full hover:bg-gray-700 transition-colors"
                        >
                          <FaThumbtack className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Side: Screen Share - Only show when screenStream exists */}
      {screenStream && (
        <div className="bg-gray-900 rounded-lg overflow-hidden h-full lg:col-span-3">
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              ref={(video) => {
                if (video && screenStream.track) video.srcObject = new MediaStream([screenStream.track]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;