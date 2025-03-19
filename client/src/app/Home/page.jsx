"use client";
import { useState ,useCallback, useEffect} from "react";
import { v4 as uuidv4 } from "uuid";
import "@/app/globals.css";
import { useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketProvider";

function Page() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const router = useRouter();
  const socket = useSocket();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      if (name && email && room) {
      socket.emit("room:LogIn", { email, room , name ,socketId : socket.id });
    } else {
      alert("Please fill in all the fields.");
    }
  },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback((data) => {
    const { email, room } = data;
    console.log(email, room);
    window.location.href =`/room/${room}`;
  }, []);

  const generateRoomId = () => {
    const roomId = uuidv4();
    console.log(roomId);
    setRoom(roomId);
  };

  useEffect(() => {
    if(socket){
      socket.on("room:join", handleJoinRoom);
    }
    return () => {
      if (socket) {
      socket.off("room:join", handleJoinRoom);
    };
  }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <main className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-black mb-6">Join a Meeting</h1>
        <form onSubmit={ handleSubmitForm } className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name:
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 text-black rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="room"
              className="block text-sm font-medium text-gray-700"
            >
              Room Number:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="flex-grow p-2 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter or generate room ID"
                required
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Join
          </button>
        </form>
      </main>
    </div>
  );
}

export default Page;
