"use client";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "@/app/globals.css";

function Page() {
  const [room, setRoom] = useState("");

  const generateRoomId = () => {
    const roomId = uuidv4();
    console.log("Generated room ID:", roomId);
    setRoom(roomId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <main className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-black mb-6">
          Create a Meeting Room
        </h1>

        <div>
          <label
            htmlFor="room"
            className="block text-sm font-medium text-gray-700"
          >
            Room ID:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="flex-grow p-2 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Generate a room ID"
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

        {room ? (
          <button
            onClick={() => {
              window.location.href = `/room/${room}`;
            }}
            type="button"
            className="w-full bg-blue-500 text-white mt-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Join Room
          </button>
        ) : (
          <button
            type="button"
            className="w-full bg-blue-500 text-white mt-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-50 cursor-not-allowed"
            disabled
          >
            Join Room
          </button>
        )}
      </main>
    </div>
  );
}

export default Page;
