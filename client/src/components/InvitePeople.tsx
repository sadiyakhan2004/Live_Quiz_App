// import "@/app/globals.css";
// import React, { useState } from "react";

// function InvitePeople({ roomID, toggleInvitePopup, isInvitePopupVisible }) {
//   const [isHighlighted, setIsHighlighted] = useState(false);

//   const fullPath = `${window.location.origin}/room/${roomID}`;

//   const handleCopyClick = () => {
//     const range = document.createRange();
//     const textElement = document.getElementById("roomIDText");

//     if (textElement) {
//       range.selectNodeContents(textElement); // Select the text
//       const selection = window.getSelection();
//       selection.removeAllRanges(); // Clear any existing selections
//       selection.addRange(range); // Highlight the selected text

//       navigator.clipboard
//         .writeText(fullPath)
//         .then(() => {
//           setIsHighlighted(true); // Apply the highlight effect
//           setTimeout(() => {
//             setIsHighlighted(false); // Remove the highlight after 2 seconds
//             selection.removeAllRanges(); // Clear the selection
//           }, 2000);
//         })
//         .catch((error) => {
//           console.error("Failed to copy: ", error);
//         });
//     }
//   };

//   //  // Copy roomID to clipboard
//   //  const handleCopyClick = () =>{
//   //   navigator.clipboard.writeText(roomID)
//   //   .then(() => {
//   //     alert("Room ID copied to clipboard!");
//   //   })
//   //   .catch((error) => {
//   //     console.error("Failed to copy: ", error);
//   //   });
//   //  }

//   return (
//     <>
//       {isInvitePopupVisible && (
//         <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
//           <div className="bg-white p-6 rounded-md shadow-md w-80 text-center relative">
//             <h2 className="text-xl font-semibold mb-4">Invite People</h2>
//             <p className="text-sm text-gray-700 mb-4">
//               Share this Room ID with others:
//             </p>
//             <div
//               id="roomIDText"
//               className={`p-2 rounded-md text-gray-800`}
//               onClick={handleCopyClick}
//                style={{
//                 cursor: "pointer",
//                 wordWrap: "break-word", // Ensures long text breaks into multiple lines
//                 overflowWrap: "break-word", // Alternative for long word wrapping
//                 textAlign: "center", // Center-align the text
//               }}
//             >
//               {fullPath}
//             </div>
//             <button
//               onClick={handleCopyClick}
//               className="mt-4 bg-blue-500 p-2 text-white rounded-md"
//             >
//               Copy Room ID
//             </button>

//             {/* Close button to hide the popup */}
//             <button
//               onClick={toggleInvitePopup} /* This will hide the popup */
//               className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
//             >
//               X
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default InvitePeople;

import "@/app/globals.css";
import React, { useState } from "react";

// Define the props interface for InvitePeople component
interface InvitePeopleProps {
  path : string;
  roomID: string;
  toggleInvitePopup: () => void;
  isInvitePopupVisible: boolean;
}

const InvitePeople: React.FC<InvitePeopleProps> = ({ path ,roomID, toggleInvitePopup, isInvitePopupVisible }) => {
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

  const fullPath = `${window.location.origin}/${path}/${roomID}`;

  const handleCopyClick = () => {
    const range = document.createRange();
    const textElement = document.getElementById("roomIDText");

    if (textElement) {
      range.selectNodeContents(textElement); // Select the text
      const selection = window.getSelection();
      selection?.removeAllRanges(); // Clear any existing selections
      selection?.addRange(range); // Highlight the selected text

      navigator.clipboard
        .writeText(fullPath)
        .then(() => {
          setIsHighlighted(true); // Apply the highlight effect
          setTimeout(() => {
            setIsHighlighted(false); // Remove the highlight after 2 seconds
            selection?.removeAllRanges(); // Clear the selection
          }, 2000);
        })
        .catch((error) => {
          console.error("Failed to copy: ", error);
        });
    }
  };

  return (
    <>
      {isInvitePopupVisible && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md shadow-md w-80 text-center relative">
            <h2 className="text-xl font-semibold mb-4">Invite People</h2>
            <p className="text-sm text-gray-700 mb-4">
              Share this Room ID with others:
            </p>
            <div
              id="roomIDText"
              className={`p-2 rounded-md text-gray-800`}
              onClick={handleCopyClick}
              style={{
                cursor: "pointer",
                wordWrap: "break-word", // Ensures long text breaks into multiple lines
                overflowWrap: "break-word", // Alternative for long word wrapping
                textAlign: "center", // Center-align the text
              }}
            >
              {fullPath}
            </div>
            <button
              onClick={handleCopyClick}
              className="mt-4 bg-blue-500 p-2 text-white rounded-md"
            >
              Copy {path} ID
            </button>

            {/* Close button to hide the popup */}
            <button
              onClick={toggleInvitePopup} // This will hide the popup
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
            >
              X
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InvitePeople;
