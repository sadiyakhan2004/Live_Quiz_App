// import React from 'react'
// import "@/app/globals.css";
// import {
//     FaMicrophone,
//     FaVideo,
//     FaPhoneAlt,
//     FaVolumeMute,
//     FaComments,
//     FaUserPlus,
//     FaDesktop,
//   } from "react-icons/fa";

// function Header(props) {
//   return (
//       <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
//         <h1 className="text-xl font-semibold">Meeting Room</h1>
//         <div className="flex items-center space-x-4">
//           <span className="text-sm">
//             { props.remoteSocketId ? "Connected" : "No One in the room"}
//           </span>
//           <button onClick={props.handleEndCall} className="bg-red-600 p-2 rounded-full">
//             <FaPhoneAlt className="text-white" />
//           </button>
//         </div>
//       </div>
//   )
// }

// export default Header

import React from 'react';
import "@/app/globals.css";
import {
  FaPhoneAlt,
} from "react-icons/fa";

// Define the props interface for Header component
interface HeaderProps {
  remoteSocketId: string | null;
  handleEndCall: () => void;
}

const Header: React.FC<HeaderProps> = ({ remoteSocketId, handleEndCall }) => {
  return (
    <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold">Meeting Room</h1>
      <div className="flex items-center space-x-4">
        <span className="text-sm">
          {remoteSocketId ? "Connected" : "No One in the room"}
        </span>
        <button onClick={handleEndCall} className="bg-red-600 p-2 rounded-full">
          <FaPhoneAlt className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default Header;
