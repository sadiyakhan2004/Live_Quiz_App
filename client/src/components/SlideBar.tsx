import React, { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketProvider";
import { X, Users, MessageSquare } from "lucide-react";

// Define the type for the message structure
interface Message {
  msg: string;
  socketId: string;
  sender: string;
  email: string;
}

interface SlideBarProps {
  isChatVisible: boolean;
  setIsChatVisible: (visible: boolean) => void;
  userData: {
    username: string;
    email: string;
  };
  participants: Array<{
    socketId: string;
    name: string;
    email: string;
    isHost: boolean;
  }>;
}

const SlideBar: React.FC<SlideBarProps> = ({
  isChatVisible,
  setIsChatVisible,
  userData,
  participants
}) => {
  const socket = useSocket();
  const [msg, setMsg] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat");

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  // Handle sending the message

  const handleMsg = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && msg.trim() !== "") {
      const messageObj = {
        msg,
        sender: userData.username,
        email: userData.email
      };
      
      // Emit message with sender's name and email
      socket?.emit("sendMsg", messageObj);
      
      // Add to local messages (note: socketId will be undefined until server assigns one)
      setMessages((prevMessages) => [
        ...prevMessages, 
        { ...messageObj, socketId: socket?.id || "" } // Use default value for socketId if undefined
      ]);
      
      setMsg(""); // Clear the message input
    }
  }


  useEffect(() => {
    if (socket) {
      socket.on("newMsg", (messageData: Message) => {
        console.log("newMsg",messageData);
        setMessages(prevMessages => [...prevMessages, messageData]);
      });
    }
    
    return () => {
      socket?.off("newMsg");
    };
  }, [socket]);

  // Get the first letter of name for avatar
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Format email to show only first part
  const formatEmail = (email: string) => {
    const atIndex = email.indexOf('@');
    if (atIndex > 12) {
      return email.substring(0, 10) + '...' + email.substring(atIndex);
    }
    return email;
  };

  return (
    <div
      className={`absolute top-0 right-0 w-80 h-full bg-gray-700 text-white shadow-lg transform transition-transform ${
        isChatVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header with tabs and close button */}
      <div className="flex items-center justify-between bg-gray-800 p-3 border-b border-gray-600">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center ${
              activeTab === "chat" 
                ? "text-blue-400 font-medium" 
                : "text-gray-300"
            }`}
          >
            <MessageSquare size={18} className="mr-1" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("participants")}
            className={`flex items-center ${
              activeTab === "participants" 
                ? "text-blue-400 font-medium" 
                : "text-gray-300"
            }`}
          >
            <Users size={18} className="mr-1" />
            People
          </button>
        </div>
        <button
          onClick={() => setIsChatVisible(false)}
          className="text-gray-300 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat Section */}
      {activeTab === "chat" && (
        <>
          <div className="flex flex-col overflow-y-auto h-[calc(100%-6rem)] p-3" id="chat_section">
            <ul id="chat_list" className="space-y-3">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className={`flex items-start ${
                    message.socketId === socket?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.socketId !== socket?.id && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                      {getInitial(message.sender)}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      message.socketId === socket?.id
                        ? "bg-blue-500 text-white rounded-tr-none"
                        : "bg-gray-800 text-white rounded-tl-none"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">
                        {message.socketId === socket?.id ? "You" : message.sender}
                      </span>
                     
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.msg}</p>
                  </div>
                  
                  {message.socketId === socket?.id && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center ml-2">
                      {getInitial(message.sender)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-800 border-t border-gray-600">
            <input
              type="text"
              placeholder="Type a message"
              className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={handleMsg}
            />
          </div>
        </>
      )}

      {/* Participants Section */}
      {activeTab === "participants" && (
        <div className="overflow-y-auto h-[calc(100%-3rem)] p-3">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            {participants.length} People in the meeting
          </h3>
          <ul className="space-y-2">
            {participants.map((participant) => (
              <li key={participant.socketId} className="flex items-center p-2 hover:bg-gray-600 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
                  {getInitial(participant.name)}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {participant.name}
                    {participant.isHost && (
                      <span className="ml-2 text-xs bg-blue-900 text-blue-200 py-0.5 px-2 rounded-full">
                        Host
                      </span>
                    )}
                    {participant.socketId === socket?.id && (
                      <span className="ml-2 text-xs bg-gray-600 text-gray-200 py-0.5 px-2 rounded-full">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-300">{participant.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SlideBar;