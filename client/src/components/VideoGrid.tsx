// import React, { useEffect, useRef, useState, useMemo } from "react";
// import { FaVolumeMute, FaMicrophoneAlt } from "react-icons/fa";
// import gsap from "gsap";

// function VideoGrid({ streams }) {
//   const containerRef = useRef(null);
//   const [speakingUsers, setSpeakingUsers] = useState({});

//   // Memoize the list of streams to avoid unnecessary re-renders
//   const otherStreams = useMemo(() => streams.filter((stream) => stream.type !== "screen-video"), [streams]);
//   const screenStream = useMemo(() => streams.find((stream) => stream.type === "screen-video"), [streams]);

//   useEffect(() => {
//     // Animate when a user joins
//     gsap.fromTo(
//       containerRef.current.children,
//       { opacity: 0, scale: 0.8 },
//       { opacity: 1, scale: 1, duration: 0.5, stagger: 0.2 }
//     );
//   }, [streams]);

//   useEffect(() => {
//     const audioAnalyzers = {};
//     const speakingRefs = {};

//     // Use useEffect to handle stream analysis and avoid unnecessary re-renders
//     otherStreams.forEach(({ track, kind }, index) => {
//       if (kind === "audio" && track) {
//         const audioContext = new AudioContext();
//         const source = audioContext.createMediaStreamSource(new MediaStream([track]));
//         const analyser = audioContext.createAnalyser();
//         source.connect(analyser);
//         analyser.fftSize = 256;

//         const dataArray = new Uint8Array(analyser.frequencyBinCount);

//         const checkSpeaking = () => {
//           analyser.getByteFrequencyData(dataArray);
//           const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

//           // Update only if there's a change in speaking state
//           const isCurrentlySpeaking = volume > 20;
//           if (speakingRefs[index] !== isCurrentlySpeaking) {
//             speakingRefs[index] = isCurrentlySpeaking;
//             setSpeakingUsers((prev) => (isCurrentlySpeaking !== prev[index] ? { ...prev, [index]: isCurrentlySpeaking } : prev));
//           }
//         };

//         audioAnalyzers[index] = setInterval(checkSpeaking, 200);
//       }
//     });

//     return () => {
//       Object.values(audioAnalyzers).forEach(clearInterval);
//     };
//   }, [otherStreams]);

//   return (
//     <div
//       ref={containerRef}
//       className={`grid grid-cols-1 gap-4 p-4 ${
//         screenStream ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-1"
//       }`}
//     >
//       {/* Screen Stream at the top */}
//       {screenStream && (
//         <div
//           key="screen-stream"
//           className="relative bg-gray-800 rounded-lg overflow-hidden w-full h-96 flex items-center justify-center col-span-full md:col-span-2 lg:col-span-3"
//         >
//           {screenStream.track ? (
//             <video
//               autoPlay
//               playsInline
//               className="w-full h-full object-cover"
//               ref={(video) => {
//                 if (video) video.srcObject = new MediaStream([screenStream.track]);
//               }}
//             />
//           ) : (
//             <div className="flex items-center justify-center w-full h-full text-white text-lg font-semibold">
//               Screen Share Off
//             </div>
//           )}
//         </div>
//       )}

//       {/* Other Streams */}
//       <div
//         className={`grid grid-cols-1 gap-4 ${
//           screenStream ? "md:grid-cols-2 lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
//         }`}
//       >
//         {otherStreams.map(({ track, kind, type, isCameraOn, isMicrophoneOn, name }, index) => {
//           const isSpeaking = speakingUsers[index] || false;

//           if (kind === "video") {
//             return (
//               <div
//                 key={`video-${index}`}
//                 className={`relative bg-gray-800 rounded-lg overflow-hidden w-full h-64 flex items-center justify-center shadow-md transition-transform ${
//                   screenStream ? "scale-90" : "scale-100"
//                 }`}
//               >
//                 {isCameraOn ? (
//                   track.enabled ? (
//                     <video
//                       autoPlay
//                       playsInline
//                       className="w-full h-full object-cover"
//                       ref={(video) => {
//                         if (video) video.srcObject = new MediaStream([track]);
//                       }}
//                     />
//                   ) : (
//                     <div className="flex items-center justify-center w-full h-full text-white text-lg font-semibold">
//                       Loading...
//                     </div>
//                   )
//                 ) : (
//                   <div className="flex items-center justify-center w-16 h-16 bg-gray-700 text-white text-2xl font-bold rounded-full">
//                     {(name?.charAt(0).toUpperCase() || "U")}
//                   </div>
//                 )}
//                 <div
//                   className={`absolute bottom-2 left-2 text-white bg-black bg-opacity-50 rounded px-2 py-1 text-sm font-semibold transition-opacity ${
//                     isSpeaking ? "opacity-100" : "opacity-0"
//                   }`}
//                 >
//                   {name || "Unknown"}
//                 </div>
//                 <div className="absolute top-2 right-2 text-white text-2xl">
//                   {isMicrophoneOn ? <FaMicrophoneAlt /> : <FaVolumeMute />}
//                 </div>
//               </div>
//             );
//           }

//           if (kind === "audio" && track) {
//             return (
//               <audio
//                 key={`audio-${index}`}
//                 autoPlay
//                 ref={(audio) => {
//                   if (audio) audio.srcObject = new MediaStream([track]);
//                 }}
//                 className="hidden"
//               />
//             );
//           }

//           return null;
//         })}
//       </div>
//     </div>
//   );
// }

// export default VideoGrid;

import React, { useEffect, useRef, useState, useMemo } from "react";
import { FaVolumeMute, FaMicrophoneAlt } from "react-icons/fa";
import gsap from "gsap";

// Define types for stream and user state
interface Stream {
  track: MediaStreamTrack;
  kind?: string;
  type?: string;
  isCameraOn?: boolean;
  isMicrophoneOn?: boolean;
  name?: string;
}

interface VideoGridProps {
  streams: Stream[];
}

interface SpeakingUsers {
  [key: number]: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ streams }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [speakingUsers, setSpeakingUsers] = useState<SpeakingUsers>({});

  // Memoize the list of streams to avoid unnecessary re-renders
  const otherStreams = useMemo(() => streams.filter((stream) => stream.type !== "screen-video"), [streams]);
  const screenStream = useMemo(() => streams.find((stream) => stream.type === "screen-video"), [streams]);

  useEffect(() => {
    // Check if containerRef.current is valid before accessing children
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.2 }
      );
    }
  }, [streams]);
  

  useEffect(() => {
    const audioAnalyzers: { [key: number]: NodeJS.Timeout } = {};
    const speakingRefs: { [key: number]: boolean } = {};

    // Use useEffect to handle stream analysis and avoid unnecessary re-renders
    otherStreams.forEach(({ track, kind }, index) => {
      if (kind === "audio" && track) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkSpeaking = () => {
          analyser.getByteFrequencyData(dataArray);
          const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

          // Update only if there's a change in speaking state
          const isCurrentlySpeaking = volume > 20;
          if (speakingRefs[index] !== isCurrentlySpeaking) {
            speakingRefs[index] = isCurrentlySpeaking;
            setSpeakingUsers((prev) => (isCurrentlySpeaking !== prev[index] ? { ...prev, [index]: isCurrentlySpeaking } : prev));
          }
        };

        audioAnalyzers[index] = setInterval(checkSpeaking, 200);
      }
    });

    return () => {
      Object.values(audioAnalyzers).forEach(clearInterval);
    };
  }, [otherStreams]);

  return (
    <div
      ref={containerRef}
      className="grid gap-4 p-4"
      style={{
        gridTemplateColumns: "repeat(3, 1fr)", // 4 items per row
        overflowY: "auto", // This will enable scrolling
        maxHeight: "calc(100vh - 100px)", // Adjust height for the screen
      }}
    >
      {/* Screen Stream at the top */}
      {screenStream && (
        <div
          key="screen-stream"
          className="relative bg-gray-800 rounded-lg overflow-auto w-auto h-96 flex items-center justify-center col-span-full"
        >
          {screenStream.track ? (
            <video
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              ref={(video) => {
                if (video) video.srcObject = new MediaStream([screenStream.track]);
              }}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-white text-lg font-semibold">
              Screen Share Off
            </div>
          )}
        </div>
      )}

      {/* Other Streams */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)", // Ensure 4 per row
        }}
      >
        {otherStreams.map(({ track, kind, type, isCameraOn, isMicrophoneOn, name }, index) => {
          const isSpeaking = speakingUsers[index] || false;

          if (kind === "video") {
            return (
              <div
                key={`video-${index}`}
                className={`relative bg-gray-800 rounded-lg overflow-hidden w-[400px] h-76 flex items-center justify-center shadow-md transition-transform`}
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
                      Loading...
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center w-16 h-16 bg-gray-700 text-white text-2xl font-bold rounded-full">
                    {(name?.charAt(0).toUpperCase() || "U")}
                  </div>
                )}
                <div
                  className={`absolute bottom-2 left-2 text-white bg-black bg-opacity-50 rounded px-2 py-1 text-sm font-semibold transition-opacity ${isSpeaking ? "opacity-100" : "opacity-0"}`}
                >
                  {name || "Unknown"}
                </div>
                <div className="absolute top-2 right-2 text-white text-2xl">
                  {isMicrophoneOn ? <FaMicrophoneAlt /> : <FaVolumeMute />}
                </div>
              </div>
            );
          }

          if (kind === "audio" && track) {
            return (
              <audio
                key={`audio-${index}`}
                autoPlay
                ref={(audio) => {
                  if (audio) audio.srcObject = new MediaStream([track]);
                }}
                className="hidden"
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default VideoGrid;