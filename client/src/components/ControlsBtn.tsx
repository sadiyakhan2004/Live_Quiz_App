import React, { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketProvider";
import {
  FaMicrophone,
  FaMicrophoneAlt,
  FaVideo,
  FaVideoSlash,
  FaComments,
  FaUserPlus,
  FaPhoneAlt,
  FaDesktop,
} from "react-icons/fa";

// Define the props interface for VideoControls component
interface VideoControlsProps {
  myStream: MediaStream | null;
  toggleChat: () => void;
  toggleInvitePopup: () => void;
  startScreenShare: () => void;
  producerClose: () => void;
  audioProducerId: string;
  videoProducerId: string;
  isQuiz?: boolean;
  isHost?: boolean;
  stopScreenSharing: () => void;
  isScreenSharingOff: boolean;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  myStream,
  toggleChat,
  toggleInvitePopup,
  startScreenShare,
  producerClose,
  audioProducerId,
  videoProducerId,
  isQuiz = false, // Default to false
  isHost = false,  // Default to false
  stopScreenSharing,
  isScreenSharingOff,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true); // Track audio mute state
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true); // Track video mute state
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false); // Track screen sharing state
  const [msgCount, setMsgCount] = useState<number>(0); // Track message count

  const socket = useSocket();

    useEffect(() => {
      if (!socket) return;
  
      // Listen for new messages
      socket.on("newMsg", ()=>setMsgCount((prevCount) => prevCount + 1));
  
      return () => {
        socket.off("newMsg", ()=>setMsgCount((prevCount) => prevCount + 1));
      };
    }, [socket]);

  const handleMediaToggle = (userId: string, isMuted: boolean, media: string) => {
    // Send a message to the other user (via socket.io or signaling mechanism)
    socket?.emit('cameraStateChanged', { userId, isMuted, media });
  };

  // Handle Audio Mute/Unmute
  const handleMuteAudio = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      const newAudioEnabled = !audioTrack.enabled;
      audioTrack.enabled = newAudioEnabled;
      setIsAudioMuted(newAudioEnabled); // Update the mute state after toggling
      console.log('Audio Mute Toggled:', newAudioEnabled);
      handleMediaToggle(videoProducerId, newAudioEnabled, "audio"); 
    }
  };

  // Handle Video Mute/Unmute
  const handleMuteVideo = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      const newVideoEnabled = !videoTrack.enabled;
      videoTrack.enabled = newVideoEnabled;
      setIsVideoMuted(newVideoEnabled); // Update the mute state after toggling
      console.log('Video Mute Toggled:', newVideoEnabled);
      handleMediaToggle(videoProducerId, newVideoEnabled, "video"); // Send updated state to the server
    }
  };

  const leaveMeeting = () => {
    producerClose();
  };

  // Handle Screen Share (Start)
  const handleStartScreenShare = () => {
    startScreenShare();
    setIsScreenSharing(true);
  };

  // Handle Stop Screen Share
  const handleStopScreenShare = () => {
    stopScreenSharing();
    setIsScreenSharing(false);
  };

  // Determine if screen sharing should be shown
  // Hide screen sharing if it's a quiz and the user is not a host
  const showScreenSharing = !(isQuiz && !isHost);

  return (
    <div className="px-4 flex justify-center space-x-6">
      {/* Audio Mute Button */}
      <button
        onClick={handleMuteAudio}
        className={`p-4 rounded-full ${
          !isAudioMuted ? "bg-gray-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {!isAudioMuted ? (
          <FaMicrophoneAlt className="text-gray-400" />
        ) : (
          <FaMicrophone className="text-white" />
        )}
      </button>

      {/* Video Mute Button */}
      <button
        onClick={handleMuteVideo}
        className={`p-4 rounded-full ${
          !isVideoMuted ? "bg-gray-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {!isVideoMuted ? (
          <FaVideoSlash className="text-gray-400" />
        ) : (
          <FaVideo className="text-white" />
        )}
      </button>

      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className="bg-gray-700 p-4 rounded-full text-white"
      >
        <FaComments />
      </button>

      {/* Invite Button */}
      <button
        onClick={toggleInvitePopup}
        className="bg-gray-700 p-4 rounded-full text-white"
      >
        <FaUserPlus />
      </button>

      {/* Screen Share Button - Only show if not in quiz mode or is host */}
      {showScreenSharing && (
        (isScreenSharing && !isScreenSharingOff) ? (
          // Red button for stopping screen share when active
          <button
            onClick={handleStopScreenShare}
            className="bg-red-600 p-4 rounded-full text-white"
            title="Stop Screen Sharing"
          >
            <FaDesktop className="text-white" />
          </button>
        ) : (
          // Gray button for starting screen share when inactive
          <button
            onClick={handleStartScreenShare}
            className="bg-gray-700 p-4 rounded-full text-white"
            title="Start Screen Sharing"
          >
            <FaDesktop className="text-white" />
          </button>
        )
      )}

      {/* Leave Meeting Button */}
      <button
        onClick={leaveMeeting}
        className="bg-red-600 p-4 rounded-full text-white"
        title="Leave Meeting"
      >
        <FaPhoneAlt />
      </button>
    </div>
  );
};

export default VideoControls;