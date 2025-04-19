
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mediasoup = require("mediasoup");
// const Quiz = require("./models/Quiz");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Adjust to your client app's URL
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Define a namespace for Mediasoup
const connections = io.of("/mediasoup");

let worker
let rooms = {}          // { roomName1: { Router, rooms: [ socketId1, ... ] }, ...}
let peers = {}          // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let participants = {}
let transports = []     // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []      // [ { socketId1, roomName1, producer, }, ... ]
let consumers = []      // [ { socketId1, roomName1, consumer, }, ... ]

let roomQuizStates = {};  // { roomName1: { quizState }, roomName2: { quizState }, ... }
let roomSubmissions = {}; // { roomName: { [socketId]: boolean } }
let completedQuizzes = {}; // Record of completed quizzes

// Server-side quiz controller
const createQuizState = (roomName, quizData) => {
    return {
        // isRunning: false,
        // hasStarted: false,
        // currentIndex: -1,
        // startTime: null,
        // endTime: null,
        // waitingTime: 0,
        // timeLimit: 0,
        // questionIds: [],
        // questions: [],
        // currentTimeInterval: null


        quizId: quizData.quizId || "",
        questionIds: quizData.questionIds || [],
        questions: quizData.questions || [],
        timeLimit: quizData.timeLimit || 30,
        waitingTime: quizData.waitingTime || 30,
        phase: 'waiting',
        hasStarted: false,
        hasEnded: false,
        currentIndex: -1,
        currentQuestion: null,
        endTime: 0,
        currentTimeInterval: null,
        startTime: Date.now()
    };
};

const createWorker = async () => {
    worker = await mediasoup.createWorker({
        rtcMinPort: 2000,
        rtcMaxPort: 3000,
        logLevel: 'debug',
        logTags: ['worker', 'rtp', 'srtp', 'rtcp'],
        numWorkers: 2, // Add more workers if required
    })
    console.log(`worker pid ${worker.pid}`)

    worker.on('died', error => {
        // This implies something serious happened, so kill the application
        console.error('mediasoup worker has died')
        setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
    })

    return worker
}

// We create a Worker as soon as our application starts
worker = createWorker()

// This is an Array of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// list of media codecs supported by mediasoup ...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts
const mediaCodecs = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        type: "audio"
    },

    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
        type: 'camera', // Custom property to differentiate
    },
    {
        kind: 'video', // Keep kind as 'video' for compatibility
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
        type: 'screen-vedio', // Custom property to differentiate
    },
];


connections.on('connection', async socket => {
    console.log(socket.id)
    socket.emit('connection-success', {
        socketId: socket.id,
    })

    // Register socket handlers
    // Handle joining quiz
    // Handle joining quiz
    socket.on("join-quiz", (quizData) => {
        console.log("User joined quiz", socket.id);

        // Get the room name from peers object
        const roomName = peers[socket.id]?.roomName;

        if (!roomName) {
            console.log("User must join a room before joining a quiz");
            socket.emit("error", { message: "You must join a room before joining a quiz" });
            return;
        }

        // Check if this quiz was already completed
        if (completedQuizzes[roomName]) {
            console.log(`Quiz in room ${roomName} was already completed`);
            socket.emit('quiz-completed');
            return;
        }

        // Initialize quiz state for this room if it doesn't exist
        if (!roomQuizStates[roomName]) {
            roomQuizStates[roomName] = createQuizState(roomName, quizData)
        }

        // Initialize quiz state for this room if it doesn't exist
        if (!roomQuizStates[roomName]) {
            roomQuizStates[roomName] = createQuizState(roomName, quizData)
        }

        const quizState = roomQuizStates[roomName];

        // First joiner starts the quiz in this room
        if (!quizState.hasStarted && !quizState.hasEnded && quizData) {
            console.log(`Starting new quiz in room ${roomName}`);
            quizState.hasStarted = true;
            quizState.phase = 'waiting'; // Set initial phase to 'waiting'
            startQuiz(roomName, quizData);
        } else {
            // Add a delay before sending the current quiz state
            setTimeout(async () => {
                // Send the current quiz state based on phase
                switch (quizState.phase) {
                    case 'waiting':
                        const serverTime = Date.now();
                        const timeLeft = Math.max(0, Math.floor((quizState.endTime - serverTime) / 1000));

                        console.log(`Sending waiting state: ${timeLeft} seconds left`);

                        socket.emit('quiz-waiting', {
                            timeLeft,
                            serverTime,
                            endTime: quizState.endTime
                        });
                        break;

                    case 'question':
                        console.log(`Sending question state: Question ${quizState.currentIndex + 1}`);

                        socket.emit('question-update', {
                            currentIndex: quizState.currentIndex,
                            timeLeft: quizState.timeLimit * 1000, // Convert to milliseconds
                            questionId: quizState.questionIds[quizState.currentIndex],
                            questionText: quizState.questions[quizState.currentIndex]?.questionText,
                            options: quizState.questions[quizState.currentIndex]?.options,
                            serverTime: quizState.startTime,
                            endTime: quizState.endTime
                        });
                        break;

                    case 'statistics':
                        console.log(`Sending statistics state`);
                        socket.emit('time-out', { currentIndex: quizState.currentIndex, questionId: quizState.questionIds[quizState.currentIndex], });
                        break;

                    case 'countdown':
                        const remaining = Math.max(0, quizState.countdownEnd - Date.now());
                        console.log(`Sending countdown state: ${Math.ceil(remaining / 1000)}s remaining`);

                        socket.emit('countdown-start', {
                            countdown: Math.ceil(remaining / 1000),
                            nextIndex: quizState.currentIndex + 1,
                            totalQuestions: quizState.questionIds.length,
                            serverTime: Date.now(),
                            endTime: quizState.countdownEnd
                        });
                        break;

                    // case 'ended':
                    //     console.log(`Sending ended state`);
                    //     socket.emit('quiz-end');
                    //     break;

                    default:
                        console.log(`Sending completed state`);
                        socket.emit('quiz-completed');
                        break;
                }
            }, 3000); // Add a 1-second delay to ensure client is ready
        }
    });
    // Handle quick start request - modified to be room-specific

    socket.on("quick-start", () => {
        console.log("Quick start triggered by", socket.id);

        // Get the room name from peers object
        const roomName = peers[socket.id]?.roomName;

        if (!roomName || !roomQuizStates[roomName]) {
            console.log("Room not found or quiz not started");
            return;
        }

        const quizState = roomQuizStates[roomName];

        // Only allow quick start if quiz has started but questions haven't yet
        if (quizState.hasStarted && quizState.currentIndex === -1) {
            console.log(`Starting countdown before questions in room ${roomName}`);

            // Clear any existing time update intervals
            if (quizState.currentTimeInterval) {
                clearInterval(quizState.currentTimeInterval);
                quizState.currentTimeInterval = null;

            }

            startQuestions(roomName);

            // One second between countdown numbers
        } else {
            console.log(`Cannot quick start: Quiz not in waiting phase in room ${roomName}`);
        }
    });

    // Helper function to broadcast messages only to clients in a specific room
    function broadcastToRoom(roomName, eventName, data) {
        if (!rooms[roomName]) return;

        rooms[roomName].peers.forEach(socketId => {
            if (peers[socketId] && peers[socketId].socket) {
                peers[socketId].socket.emit(eventName, data);
            } else {
                console.log(`Warning: Socket ${socketId} in room ${roomName} appears invalid`);
            }
        });
    }



    // Function to start the quiz - modified to be room-specific
    function startQuiz(roomName, quizData) {
        if (!quizData || !quizData.waitingTime || !quizData.timeLimit || !quizData.questionIds) {
            console.error('Invalid quiz data');
            return;
        }

        const quizState = roomQuizStates[roomName];

        // Set timing for waiting phase - convert minutes to milliseconds
        quizState.startTime = Date.now();
        quizState.endTime = quizState.startTime + (quizData.waitingTime * 60 * 1000); // Minutes to milliseconds

        // Compute initial time left in milliseconds
        const initialTimeLeft = quizData.waitingTime * 60 * 1000;

        // Notify all clients in the room about waiting phase
        broadcastToRoom(roomName, "quiz-waiting", {
            timeLeft: initialTimeLeft,
            serverTime: quizState.startTime,
            endTime: quizState.endTime
        });

        console.log(`Quiz started in room ${roomName} with ${quizData.waitingTime} minutes waiting time`);

        // Set up regular time updates
        quizState.currentTimeInterval = setInterval(() => {
            const currentTime = Date.now();
            const timeLeft = Math.max(0, quizState.endTime - currentTime);

            broadcastToRoom(roomName, "time-update", {
                timeLeft: timeLeft,
                serverTime: currentTime
            });

            // Check if current phase has ended
            if (currentTime >= quizState.endTime) {
                // Waiting phase ended, start questions
                clearInterval(quizState.currentTimeInterval);
                quizState.currentTimeInterval = null;
                console.log(`Waiting phase ended in room ${roomName}, starting questions phase`);
                startQuestions(roomName);
            }
        }, 100); // Update more frequently (every 100ms) to show deciseconds
    }

    // Function to start the questions phase - modified to be room-specific

    // Modify the startQuestions function to properly initialize the quiz state
    function startQuestions(roomName) {
        const quizState = roomQuizStates[roomName];

        // Clear any existing intervals first
        if (quizState.currentTimeInterval) {
            clearInterval(quizState.currentTimeInterval);
            quizState.currentTimeInterval = null;
        }

        // Make sure we're at the beginning before moving to the next question
        quizState.currentIndex = -1;
        quizState.phase = 'countdown';

        // Now move to the first question
        moveToNextQuestion(roomName);
    }

    // Function to move to the next question - modified to be room-specific
    function moveToNextQuestion(roomName) {
        const quizState = roomQuizStates[roomName];

        // Clear any existing intervals first
        if (quizState.currentTimeInterval) {
            clearInterval(quizState.currentTimeInterval);
            quizState.currentTimeInterval = null;
        }

        // // Reset submission tracking for the new question
        // if (roomSubmissions[roomName]) {
        //     roomSubmissions[roomName] = {};
        // }

        // Start countdown phase
        quizState.phase = 'countdown';
        //let countdown = 3; // 3-second countdown before each question
        // Store countdown start time and duration
        quizState.countdownStart = Date.now();
        quizState.countdownDuration = 3000; // 3 seconds in milliseconds
        quizState.countdownEnd = quizState.countdownStart + quizState.countdownDuration;

        // Calculate initial remaining time
        let remaining = Math.max(0, quizState.countdownEnd - Date.now());

        // Broadcast countdown start
        broadcastToRoom(roomName, "countdown-start", {
            countdown: Math.ceil(remaining / 1000),
            nextIndex: quizState.currentIndex + 1,
            totalQuestions: quizState.questionIds.length,
            serverTime: Date.now(),
            endTime: quizState.countdownEnd // Send the actual end timestamp
        });

        // Start countdown interval
        quizState.currentTimeInterval = setInterval(() => {
            remaining = Math.max(0, quizState.countdownEnd - Date.now());

            if (remaining > 0) {
                broadcastToRoom(roomName, "countdown-update", {
                    countdown: Math.ceil(remaining / 1000),
                    nextIndex: quizState.currentIndex + 1,
                    serverTime: Date.now(),
                    endTime: quizState.countdownEnd
                });
            } else {
                clearInterval(quizState.currentTimeInterval);
                quizState.currentIndex++;
                quizState.phase = 'question';
                quizState.startTime = Date.now();
                quizState.endTime = quizState.startTime + (quizState.timeLimit * 1000);

                // Original question setup logic
                broadcastToRoom(roomName, "question-update", {
                    currentIndex: quizState.currentIndex,
                    timeLeft: quizState.timeLimit * 1000,
                    questionId: quizState.questionIds[quizState.currentIndex],
                    serverTime: quizState.startTime,
                    endTime: quizState.endTime
                });

                // Set up question timer
                quizState.currentTimeInterval = setInterval(() => {
                    const currentTime = Date.now();
                    const timeLeft = Math.max(0, quizState.endTime - currentTime);

                    broadcastToRoom(roomName, "time-update", {
                        timeLeft,
                        serverTime: currentTime
                    });

                    if (currentTime >= quizState.endTime) {
                        clearInterval(quizState.currentTimeInterval);
                        quizState.currentTimeInterval = null;
                        if (quizState.currentIndex >= quizState.questionIds.length - 1) {
                            endQuiz(roomName);
                        } else {
                            quizState.phase = 'statistics';
                            broadcastToRoom(roomName, "time-out", { currentIndex: quizState.currentIndex, questionId: quizState.questionIds[quizState.currentIndex], });
                        }
                    }
                }, 100);
            }
        }, 1000);
    }

    socket.on("next-question", ({ roomName }) => {
        moveToNextQuestion(roomName)
    })
    socket.on("quiz-completion", ({ roomName }) => {
        console.log(`Host triggered quiz completion for room ${roomName}`);
        const quizState = roomQuizStates[roomName];
        quizState.phase = "complete";
        // Mark this quiz as completed (moved from endQuiz to here)
        completedQuizzes[roomName] = {
            quizId: roomQuizStates[roomName]?.quizId || roomName,
            completedAt: Date.now()
        };

        // Broadcast completion to all clients in the room
        broadcastToRoom(roomName, "quiz-completed");
    });


    // Function to end the quiz - modified to be room-specific
    function endQuiz(roomName) {
        console.log(`Quiz ended in room ${roomName}`);
        const quizState = roomQuizStates[roomName];

        // Clear all intervals to prevent any further quiz actions
        if (quizState.currentTimeInterval) {
            clearInterval(quizState.currentTimeInterval);
            quizState.currentTimeInterval = null;
        }

        // Set flags to prevent further quiz actions
        quizState.phase = "statistics"; // Set phase to statistics for showing results
        quizState.hasEnded = true; // Add a flag to track quiz end state


        // Broadcast end to all clients
        broadcastToRoom(roomName, "quiz-end");
    }



    const removeItems = (items, socketId, type) => {
        items.forEach(item => {
            if (item.socketId === socket.id) {
                item[type].close()
            }
        })
        items = items.filter(item => item.socketId !== socket.id)

        return items
    }

    // Remove participant
    function removeParticipant(socketId) {
        const peer = peers[socketId];
        if (!peer) return;

        const roomName = peer.roomName;
        if (rooms[roomName] && rooms[roomName].participants) {
            // Find the participant to get their details before removing
            const participant = rooms[roomName].participants.find(p => p.socketId === socketId);

            // Remove the participant from the room
            rooms[roomName].participants = rooms[roomName].participants.filter(
                p => p.socketId !== socketId
            );

            // If we found participant details, notify others about the departure
            if (participant) {
                console.log(`Participant ${participant.name} left room ${roomName}`);

                // Notify remaining participants
                broadcastToRoom(roomName, 'participant-left', {
                    socketId,
                    name: participant.name

                });
            }
        }
    }
socket.on('disconnect', () => {
    if (peers[socket.id]) {
        console.log('peer disconnected');
        consumers = removeItems(consumers, socket.id, 'consumer');
        producers = removeItems(producers, socket.id, 'producer');
        transports = removeItems(transports, socket.id, 'transport');

        const { roomName, peerDetails } = peers[socket.id];

        // Remove participant from room
        removeParticipant(socket.id);

        delete peers[socket.id];

        // Update the room's peer list
        if (rooms[roomName]) {
            rooms[roomName].peers = rooms[roomName].peers.filter(id => id !== socket.id);

            console.log(`Peer disconnected from room ${roomName}. Remaining peers: ${rooms[roomName].peers.length}`);

            // Check if room is now empty
            if (rooms[roomName].peers.length === 0 && roomQuizStates[roomName]) {
                console.log(`Last user left room ${roomName}, cleaning up quiz state immediately`);
                
                // Clear any running intervals
                if (roomQuizStates[roomName].currentTimeInterval) {
                    clearInterval(roomQuizStates[roomName].currentTimeInterval);
                    roomQuizStates[roomName].currentTimeInterval = null;
                }

                // Store quiz completion if it was running
                if (roomQuizStates[roomName].hasStarted) {
                    // Schedule cleanup for completed quiz record after some time
                    setTimeout(() => {
                        if (completedQuizzes[roomName]) {
                            delete completedQuizzes[roomName];
                            console.log(`Cleaned up completed quiz record for room ${roomName}`);
                        }
                    }, 3600000); // 1 hour
                }

                // Remove the quiz state immediately
                delete roomQuizStates[roomName];
                console.log(`Removed quiz state for empty room ${roomName}`);
            }
        } else {
            console.log(`Socket ${socket.id} disconnected but was not registered in peers.`);
        }
    }
});
    // Handle camera state change
    socket.on('cameraStateChanged', (data) => {

        // Broadcast the camera state change to the other users
        connections.emit('cameraStateChanged', data); // Notify all other clients
    });

    socket.on('room-rejoin', async ({ storedSession, userId, roomName }, callback) => {
        const router1 = await createRoom(roomName, socket.id);

        const { username, email, isHost } = storedSession;

        // Check if this is the first peer in the room
        const isFirstPeer = isHost;

        // Initialize participants array if it doesn't exist
        if (!rooms[roomName].participants) {
            rooms[roomName].participants = [];
        }

        // Find existing participant by userId or email
        const existingParticipant = rooms[roomName].participants.find(p =>
            (userId && p.userId === userId) || (email && p.email === email)
        );

        if (existingParticipant && existingParticipant.socketId !== socket.id) {
            // Participant already exists with a different socket ID
            console.log(`User ${username} attempted to rejoin room ${roomName} but is already connected with socketId ${existingParticipant.socketId}`);

            // IMPORTANT FIX: Remove this socket ID from the room's peers array since we're rejecting the join
            rooms[roomName].peers = rooms[roomName].peers.filter(id => id !== socket.id);

            callback({
                error: true,
                message: "You are already connected to this room from another device or browser tab",
                existingSession: true
            });
            return; // Exit the function early
        }


        // Setup peer data
        peers[socket.id] = {
            socket,
            roomName,
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: {
                userId: userId,
                name: username,
                isAdmin: isFirstPeer,
            }
        };

        // If participant doesn't exist, add them as new
        if (!existingParticipant) {
            const newParticipant = {
                socketId: socket.id,
                userId,
                name: username,
                email: email,
                isHost: isFirstPeer
            };

            rooms[roomName].participants.push(newParticipant);
            console.log(`Participant ${username} joined room ${roomName} as new entry during rejoin`);
        } else {
            // Update the socketId for existing participant
            existingParticipant.socketId = socket.id;
            console.log(`Participant ${username} updated their session in room ${roomName} during rejoin`);
        }

        console.log(`Total participants in room ${roomName}: ${rooms[roomName].participants.length}`);

        // Notify all OTHER participants in the room about the rejoining participant
        rooms[roomName].peers.forEach(peerSocketId => {
            if (peerSocketId !== socket.id && peers[peerSocketId]) {
                peers[peerSocketId].socket.emit('participant-joined', {
                    socketId: socket.id,
                    name: username,
                    email: email,
                    isHost: isFirstPeer
                });
            }
        });

        // get Router RTP Capabilities
        const rtpCapabilities = router1.rtpCapabilities;

        // Send the complete list of existing participants to the rejoining user
        const existingParticipants = rooms[roomName].participants;

        // Notify the user that they have successfully rejoined the room
        socket.emit('room-joined', {
            quizId: roomName,
            userData: { username, email },
            isHost: isFirstPeer,
        });

        // Call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities, isAdmin: isFirstPeer, participants: existingParticipants });
    });


    socket.on('joinRoom', async ({ roomName, username, email, userId }, callback) => {
        const router1 = await createRoom(roomName, socket.id);

        // Check if this is the first peer in the room
        const isFirstPeer = rooms[roomName].peers.length === 1;

        // Initialize participants array if it doesn't exist
        if (!rooms[roomName].participants) {
            rooms[roomName].participants = [];
        }

        // Check if participant already exists (e.g., from a previous session)
        const existingParticipant = rooms[roomName].participants.find(p =>
            (userId && p.userId === userId) || (email && p.email === email)
        );

        if (existingParticipant) {
            // If participant already exists, notify client and don't proceed with join
            console.log(`User ${username} attempted to join room ${roomName} but is already connected with socketId ${existingParticipant.socketId}`);

            // IMPORTANT FIX: Remove this socket ID from the room's peers array since we're rejecting the join
            rooms[roomName].peers = rooms[roomName].peers.filter(id => id !== socket.id);

            callback({
                error: true,
                message: "You are already connected to this room from another device or browser tab",
                existingSession: true
            });
            return; // Exit the function early
        }

        // If we reached here, this is a new participant
        peers[socket.id] = {
            socket,
            roomName,
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: {
                userId: userId,
                name: username,
                isAdmin: isFirstPeer,
            }
        };

        // Add new participant to the room
        const newParticipant = {
            socketId: socket.id,
            userId,
            name: username,
            email: email,
            isHost: isFirstPeer
        };

        rooms[roomName].participants.push(newParticipant);
        console.log(`New participant added to room ${roomName}: ${username}`);
        console.log(`Total participants in room ${roomName}: ${rooms[roomName].participants.length}`);

        // Notify all OTHER participants in the room about the new participant
        rooms[roomName].peers.forEach(peerSocketId => {
            if (peerSocketId !== socket.id && peers[peerSocketId]) {
                peers[peerSocketId].socket.emit('participant-joined', newParticipant);
            }
        });

        // get Router RTP Capabilities
        const rtpCapabilities = router1.rtpCapabilities;

        // Send the complete list of existing participants to the newly joined user
        const existingParticipants = rooms[roomName].participants;

        // Notify the user that they have successfully joined the room
        socket.emit('room-joined', {
            quizId: roomName,
            userData: { username, email },
            isHost: isFirstPeer,
        });

        // call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities, isAdmin: isFirstPeer, participants: existingParticipants });
    });

    // Also create a new event handler that allows users to request the current participant list at any time
    // socket.on('get-participants', ({ roomName }, callback) => {
    //     if (rooms[roomName] && rooms[roomName].participants) {
    //         callback({ participants: rooms[roomName].participants });
    //     } else {
    //         callback({ participants: [] });
    //     }
    // });

    const createRoom = async (roomName, socketId) => {
        let router1
        let peers = []
        let participants = []
        if (rooms[roomName]) {
            router1 = rooms[roomName].router
            peers = rooms[roomName].peers || []
            participants = rooms[roomName].participants || []
        } else {
            router1 = await worker.createRouter({ mediaCodecs, })
        }

        // Add the new peer
        peers = [...peers, socketId]

        // Update the room
        rooms[roomName] = {
            router: router1,
            peers: peers,
            participants: [...participants]
        }

        // Now log with the correct count
        console.log(`Router ID: ${router1.id}, peers count: ${peers.length}`)

        return router1
    }

    socket.on("getRtpCapabilities", async ({ roomName }, callback) => {
        // create Router if it does not exist
        // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
        const router = rooms[roomName].router;

        // get Router RTP Capabilities
        const rtpCapabilities = router.rtpCapabilities

        // call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities })
    })

    // Client emits a request to create server side Transport
    // We need to differentiate between the producer and consumer transports
    socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
        // get Room Name from Peer's properties
        const roomName = peers[socket.id].roomName

        // get Router (Room) object this peer is in based on RoomName
        const router = rooms[roomName].router


        createWebRtcTransport(router).then(
            transport => {
                callback({
                    params: {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    }
                })

                // add transport to Peer's properties
                addTransport(transport, roomName, consumer)
            },
            error => {
                console.log(error)
            })
    })

    const addTransport = (transport, roomName, consumer) => {

        transports = [
            ...transports,
            { socketId: socket.id, transport, transportId: transport.id, roomName, consumer, }
        ]

        // console.log(transports)

        peers[socket.id] = {
            ...peers[socket.id],
            transports: [
                ...peers[socket.id].transports,
                transport.id,
            ]
        }
    }

    const addProducer = (producer, roomName) => {
        console.log("kind", producer.kind);
        console.log("type", producer.appData);
        producers = [
            ...producers,
            { socketId: socket.id, producer, roomName, producerId: producer.id }
        ]

        peers[socket.id] = {
            ...peers[socket.id],
            producers: [
                ...peers[socket.id].producers,
                producer.id,
            ]
        }

        // console.log("add Producer", producers)
        // console.log("peer", peers[socket.id]);
    }


    const addConsumer = (consumer, roomName) => {

        // add the consumer to the consumers list
        consumers = [
            ...consumers,
            { socketId: socket.id, consumer, roomName, }
        ]

        // add the consumer id to the peers list
        peers[socket.id] = {
            ...peers[socket.id],
            consumers: [
                ...peers[socket.id].consumers,
                consumer.id,
            ]
        }
    }

    socket.on('getProducers', callback => {
        //return all producer transports
        const { roomName } = peers[socket.id]

        let producerList = []
        producers.forEach(producerData => {
            if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
                producerList = [...producerList, {
                    producerId: producerData.producer.id,  // Producer ID
                    appData: producerData.producer.appData, // App data of the producer
                }]
            }
        })

        // return the producer list back to the client
        callback(producerList)
    })

    const informConsumers = (roomName, socketId, id, appData) => {
        console.log(`just joined, id ${id} ${roomName}, ${socketId}`);

        // A new producer just joined
        // let all consumers to consume this producer
        producers.forEach(producerData => {
            if (producerData.socketId !== socketId && producerData.roomName === roomName) {
                const producerSocket = peers[producerData.socketId].socket
                // use socket to send producer id to producer
                producerSocket.emit('new-producer', { producerId: id, appData })
            }
        })
    }


    const getTransport = (transportId) => {
        const [producerTransport] = transports.filter(transport => transport.transportId === transportId && !transport.consumer)
        return producerTransport ? producerTransport.transport : null;
    }

    let transportConnected = false; // Flag to track transport connection state

    // Listen for the 'transport-connect' event from the client
    socket.on('transport-connect', ({ dtlsParameters, transportId }) => {
        console.log('DTLS PARAMS... ', { dtlsParameters });

        const transport = getTransport(transportId);

        // Ensure connect is only called once

        transport.connect({ dtlsParameters })
            .then(() => {
                transportConnected = true; // Mark transport as connected
                console.log('Transport connected successfully');
            })
            .catch((err) => {
                console.error('Error connecting transport: ', err);
            });

    });

    // Listen for the 'transport-produce' event from the client
    socket.on('transport-produce', async ({ kind, rtpParameters, appData, transportId }, callback) => {
        const transport = getTransport(transportId);

        console.log("appData", appData);
        // Ensure produce is only called once the transport is connected

        try {

            // Produce the track with the parameters from the client
            const producer = await transport.produce({
                kind,
                appData,
                rtpParameters,
            });


            // Add the producer to the room's producers array
            const { roomName } = peers[socket.id];
            addProducer(producer, roomName);

            // Inform consumers in the room about the new producer
            informConsumers(roomName, socket.id, producer.id, appData);

            console.log('Producer ID: ', producer.id, producer.kind);


            // Clean up producer when the transport is closed
            producer.on('transportclose', () => {
                console.log('Transport for this producer closed');
                producer.close();

                console.log(`Received request to close producer with ID: ${producer.id}`);

                const producer = producers.find(p => p.producerId === producer.id);
                if (producer) {
                    console.log(`Closing producer: ${producer.producerId}`);
                    producers = producers.filter(p => p.producerId !== producer.id); // Remove from producers list

                } else {
                    console.log(`Producer with ID ${producer.id} not found.`);
                }
            });

            // Send the Producer ID back to the client
            callback({
                id: producer.id,
                producersExist: producers.length > 1 ? true : false,
            });
        } catch (error) {
            console.error('Error producing track: ', error);
            callback({ error: 'Failed to produce track' });
        }
    });


    // see client's socket.emit('transport-recv-connect', ...)
    socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
        console.log(`DTLS PARAMS: ${dtlsParameters}`)
        const consumerTransport = transports.find(transportData => (
            transportData.consumer && transportData.transport.id == serverConsumerTransportId
        )).transport
        await consumerTransport.connect({ dtlsParameters })
    })

    socket.on('consume', async ({ rtpCapabilities, remoteProducerId, appData, serverConsumerTransportId }, callback) => {
        try {

            const { roomName } = peers[socket.id]
            const router = rooms[roomName].router
            let consumerTransport = transports.find(transportData => (
                transportData.consumer && transportData.transport.id == serverConsumerTransportId
            )).transport

            // check if the router can consume the specified producer
            if (router.canConsume({
                producerId: remoteProducerId,
                appData,
                rtpCapabilities
            })) {
                // transport can now consume and return a consumer
                const consumer = await consumerTransport.consume({
                    producerId: remoteProducerId,
                    appData: appData,
                    rtpCapabilities,
                    paused: true,
                })


                consumer.on('transportclose', () => {
                    console.log('transport close from consumer')
                })

                consumer.on('producerclose', () => {
                    console.log('producer of consumer closed')
                    console.log(remoteProducerId);
                    socket.emit('producer-closed', { remoteProducerId })

                    consumerTransport.close()
                    transports = transports.filter(transportData => transportData.transport.id !== consumerTransport.id)
                    consumer.close()
                    consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumer.id)

                })



                addConsumer(consumer, roomName);

                // from the consumer extract the following params
                // to send back to the Client
                const params = {
                    id: consumer.id,
                    producerId: remoteProducerId,
                    kind: consumer.kind,
                    //type: consumer.appData?.type,
                    appData: consumer.appData,
                    rtpParameters: consumer.rtpParameters,
                    serverConsumerId: consumer.id,
                }

                // send the parameters to the client
                callback({ params })
            }
        } catch (error) {
            console.log(error.message)
            callback({
                params: {
                    error: error
                }
            })
        }
    })

    socket.on('consumer-resume', async ({ serverConsumerId }) => {
        console.log('consumer resume')
        const { consumer } = consumers.find(consumerData => consumerData.consumer.id === serverConsumerId)
        await consumer.resume()
    })

    socket.on('producer-close', async ({ producerId, roomName }) => {
        console.log(`Received request to close producer with ID: ${producerId}`);

        // Find and close the producer
        const producerData = producers.find(p => p.producerId === producerId);
        if (producerData) {
            console.log(`Closing producer: ${producerId}`);

            // Close the producer on server side
            try {
                await producerData.producer.close();
            } catch (error) {
                console.error(`Error closing producer ${producerId}:`, error);
            }

            // Remove from producers list
            producers = producers.filter(p => p.producerId !== producerId);

            // Notify all other participants in the room
            if (rooms[roomName]) {
                rooms[roomName].peers.forEach(peerSocketId => {
                    if (peerSocketId !== socket.id && peers[peerSocketId]) {
                        peers[peerSocketId].socket.emit('producer-closed', {
                            remoteProducerId: producerId
                        });
                    }
                });
            }
        } else {
            console.log(`Producer with ID ${producerId} not found.`);
        }
    });



    socket.on("stop-screen-share", (data) => {
        try {
            const { roomName } = data;
            const quizState = roomQuizStates[roomName];
            // Add a delay before broadcasting to make sure clients are ready
            setTimeout(() => {
                // Send the current quiz state based on phase
                switch (quizState.phase) {
                    case 'waiting':
                        const serverTime = Date.now();
                        const timeLeft = Math.max(0, Math.floor((quizState.endTime - serverTime) / 1000));

                        console.log(`Sending waiting state: ${timeLeft} seconds left`);

                        broadcastToRoom(roomName, 'quiz-waiting', {
                            timeLeft,
                            serverTime,
                            endTime: quizState.endTime
                        });
                        break;

                    case 'question':
                        console.log(`Sending question state: Question ${quizState.currentIndex + 1}`);

                        broadcastToRoom(roomName, 'question-update', {
                            currentIndex: quizState.currentIndex,
                            timeLeft: quizState.timeLimit * 1000, // Convert to milliseconds
                            questionId: quizState.questionIds[quizState.currentIndex],
                            questionText: quizState.questions[quizState.currentIndex]?.questionText,
                            options: quizState.questions[quizState.currentIndex]?.options,
                            serverTime: quizState.startTime,
                            endTime: quizState.endTime
                        });
                        break;

                    case 'statistics':
                        console.log(`Sending statistics state`);
                        broadcastToRoom(roomName, 'time-out', { currentIndex: quizState.currentIndex, questionId: quizState.questionIds[quizState.currentIndex], });
                        break;

                    case 'countdown':
                        const remaining = Math.max(0, quizState.countdownEnd - Date.now());
                        console.log(`Sending countdown state: ${Math.ceil(remaining / 1000)}s remaining`);

                        broadcastToRoom(roomName, 'countdown-start', {
                            countdown: Math.ceil(remaining / 1000),
                            nextIndex: quizState.currentIndex + 1,
                            totalQuestions: quizState.questionIds.length,
                            serverTime: Date.now(),
                            endTime: quizState.countdownEnd
                        });
                        break;

                    // case 'ended':
                    //     console.log(`Sending ended state`);
                    //     broadcastToRoom(roomName, 'quiz-end');
                    //     break;

                    default:
                        console.log(`Sending completed state`);
                        broadcastToRoom(roomName, 'quiz-completed');
                        break;
                }
            }, 1000); // 1 sec dealy
        } catch (error) {
            console.error("Error handling stop-screen-share:", error);
        }
    });


    // Listen for the "sendMsg" event
    socket.on("sendMsg", async (data) => {
        try {
            const { msg, sender, email } = data;
            const { roomName } = peers[socket.id];

            console.log(data);

            // Manually filter out the sender before broadcasting
            rooms[roomName].peers.forEach(socketId => {
                // Skip the sender
                if (socketId !== socket.id && peers[socketId] && peers[socketId].socket) {
                    peers[socketId].socket.emit("newMsg", {
                        msg,
                        socketId: socket.id,
                        sender,
                        email
                    });
                }
            });
        } catch (error) {
            console.error("Error handling sendMsg:", error);
        }
    });







    const createWebRtcTransport = async (router) => {
        return new Promise(async (resolve, reject) => {
            try {
                // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
                const webRtcTransport_options = {
                    listenIps: [
                        {
                            ip: '127.0.0.1', announcedIp: null
                        }
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                }

                // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
                let transport = await router.createWebRtcTransport(webRtcTransport_options)
                console.log(`transport id: ${transport.id}`)

                transport.on('dtlsstatechange', dtlsState => {
                    if (dtlsState === 'closed') {
                        transport.close()
                    }
                })

                transport.on('close', () => {
                    console.log('transport closed')
                })

                resolve(transport)

            } catch (error) {
                reject(error)
            }
        })
    }

})

server.listen(8000, () => {
    console.log("Server is running on port 8000");
})