"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";

// Create a context for the socket
const SocketContext = createContext<Socket | null>(null);

// Custom hook to use the socket
export const useSocket = (): Socket | null => {
  const socket = useContext(SocketContext);
  return socket;
};

// Define the type for the component props
interface SocketProviderProps {
  children: ReactNode;
}

// SocketProvider component
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const connection = io("http://localhost:8000/mediasoup");
    setSocket(connection);

    return () => {
      connection.disconnect();  // Clean up the socket connection on unmount
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
