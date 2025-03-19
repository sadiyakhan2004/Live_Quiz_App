// import React, { useState, useEffect } from "react";
// import { useSocket } from "@/context/SocketProvider";

// function SlideBar({ isChatVisible}) {
//   const socket = useSocket();
//   const [msg, setMsg] = useState("");
//   const [messages, setMessages] = useState([]);

//   useEffect(() => {
//     console.log("Messages updated:", messages);
//   }, [messages]);

//   // Handle sending the message
//   const handleMsg = (e) => {
//     if (e.keyCode === 13 && msg.trim() !== "") {
//       // Emit message with sender's name
//       socket.emit("sendMsg", { msg , socketId: socket.id});
//       setMsg(""); // Clear the message input
//     }
//   };

//   // Handle receiving a new message
//   const handleNewMsg = (messageArray) => {
//     // Since we're receiving an array of messages, we handle it properly
//     messageArray.forEach((messageData) => {
//       setMessages((prevMessages) => [...prevMessages, messageData]);
//     });

//   };

//   useEffect(() => {
//     if (!socket) return;

//     // Listen for new messages
//     socket.on("newMsg", handleNewMsg);

//     return () => {
//       socket.off("newMsg", handleNewMsg); // Cleanup the listener
//     };
//   }, [socket]);

//   return (
//     <div
//       className={`absolute top-0 right-0 w-80 h-full bg-gray-700 text-white p-4 transform transition-transform ${
//         isChatVisible ? "translate-x-0" : "translate-x-full"
//       }`}
//     >
//       <h2 className="text-lg font-semibold mb-4">Chat</h2>
//       <div className="flex flex-col space-y-2 overflow-y-auto h-4/5" id="chat_section">
//         <ul id="chat_list">
//           {messages.map((message, index) => (
//             <li
//               key={index}
//               className={`flex items-start ${
//                 message.socketId === socket.id ? "justify-end" : "justify-start"
//               }`}
//             >
//               <div
//                 className={`max-w-xs p-2 mt-1 rounded-md ${
//                   message.socketId === socket.id
//                     ? "bg-blue-500 text-white"
//                     : "bg-gray-800 text-white"
//                 }`}
//               >
//                 <p className="font-semibold">{message.sender}</p>
//                 <p>{message.msg}</p>
//               </div>
//             </li>
//           ))}
//         </ul>
//       </div>
//       <input
//         type="text"
//         placeholder="Type a message"
//         className="w-full p-2 mt-2 rounded-md bg-gray-800 text-white"
//         value={msg}
//         onChange={(e) => setMsg(e.target.value)}
//         onKeyDown={handleMsg}
//       />
//     </div>
//   );
// }

// export default SlideBar;

import React, { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketProvider";

// Define the type for the message structure
interface Message {
  msg: string;
  socketId: string;
  sender: string;
}

interface SlideBarProps {
  isChatVisible: boolean;
}

const SlideBar: React.FC<SlideBarProps> = ({ isChatVisible }) => {
  const socket = useSocket();
  const [msg, setMsg] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  // Handle sending the message
  const handleMsg = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode === 13 && msg.trim() !== "") {
      // Emit message with sender's name
      socket?.emit("sendMsg", { msg, socketId: socket?.id });
      setMsg(""); // Clear the message input
    }
  };

  // Handle receiving a new message
  const handleNewMsg = (messageArray: Message[]) => {
    // Since we're receiving an array of messages, we handle it properly
    messageArray.forEach((messageData) => {
      setMessages((prevMessages) => [...prevMessages, messageData]);
    });
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on("newMsg", handleNewMsg);

    return () => {
      socket.off("newMsg", handleNewMsg); // Cleanup the listener
    };
  }, [socket]);

  return (
    <div
      className={`absolute top-0 right-0 w-80 h-full bg-gray-700 text-white p-4 transform transition-transform ${
        isChatVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <h2 className="text-lg font-semibold mb-4">Chat</h2>
      <div className="flex flex-col space-y-2 overflow-y-auto h-4/5" id="chat_section">
        <ul id="chat_list">
          {messages.map((message, index) => (
            <li
              key={index}
              className={`flex items-start ${
                message.socketId === socket?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs p-2 mt-1 rounded-md ${
                  message.socketId === socket?.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800 text-white"
                }`}
              >
                <p className="font-semibold">{message.sender}</p>
                <p>{message.msg}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <input
        type="text"
        placeholder="Type a message"
        className="w-full p-2 mt-2 rounded-md bg-gray-800 text-white"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={handleMsg}
      />
    </div>
  );
};

export default SlideBar;
