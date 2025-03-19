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
let rooms = {}          // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}
let peers = {}          // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = []     // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []      // [ { socketId1, roomName1, producer, }, ... ]
let consumers = []      // [ { socketId1, roomName1, consumer, }, ... ]
let quiz;

let roomQuizStates = {};  // { roomName1: { quizState }, roomName2: { quizState }, ... }

// Server-side quiz controller
const createQuizState = () => {
    return {
        isRunning: false,
        hasStarted: false,
        currentIndex: -1,
        startTime: null,
        endTime: null,
        waitingTime: 0,
        timeLimit: 0,
        questionIds: [],
        questions: [],
        currentTimeInterval: null
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
    socket.on("join-quiz", (quizData) => {
        console.log("User joined quiz", socket.id);

        // Get the room name from peers object
        const roomName = peers[socket.id]?.roomName;

        if (!roomName) {
            console.log("User must join a room before joining a quiz");
            socket.emit("error", { message: "You must join a room before joining a quiz" });
            return;
        }

        // Initialize quiz state for this room if it doesn't exist
        if (!roomQuizStates[roomName]) {
            roomQuizStates[roomName] = createQuizState();
        }

        const quizState = roomQuizStates[roomName];

        // First joiner starts the quiz in this room
        if (!quizState.hasStarted && quizData) {
            console.log(`Starting new quiz in room ${roomName}`);
            quizState.hasStarted = true;
            startQuiz(roomName, quizData);
        }
        // Late joiners get current state
        else if (quizState.isRunning) {
            const currentServerTime = Date.now();
            const timeLeftMs = Math.max(0, quizState.endTime - currentServerTime);

            if (quizState.currentIndex === -1) {
                // Still in waiting phase
                const minutes = Math.floor(timeLeftMs / (60 * 1000)).toString().padStart(2, '0');
                const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000).toString().padStart(2, '0');
                const deciseconds = Math.floor((timeLeftMs % 1000) / 100);
                const formattedTime = `${minutes}:${seconds}.${deciseconds}`;

                console.log(`Late joiner in room ${roomName}, sending waiting state`);
                socket.emit("quiz-waiting", {
                    formattedTime: formattedTime,
                    timeLeftMs: timeLeftMs,
                    serverTime: currentServerTime,
                    endTime: quizState.endTime
                });
            } else {
                // Already showing questions
                const minutes = Math.floor(timeLeftMs / (60 * 1000)).toString().padStart(2, '0');
                const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000).toString().padStart(2, '0');
                const deciseconds = Math.floor((timeLeftMs % 1000) / 100);
                const formattedTime = `${minutes}:${seconds}.${deciseconds}`;

                console.log(`Late joiner in room ${roomName}, sending question state`);
                socket.emit("question-update", {
                    currentIndex: quizState.currentIndex,
                    formattedTime: formattedTime,
                    timeLeftMs: timeLeftMs,
                    questionId: quizState.questionIds[quizState.currentIndex],
                    questionText: quizState.questions[quizState.currentIndex]?.questionText,
                    options: quizState.questions[quizState.currentIndex]?.options,
                    serverTime: currentServerTime,
                    endTime: quizState.endTime
                });
            }
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
        if (quizState.hasStarted && quizState.isRunning && quizState.currentIndex === -1) {
            console.log(`Starting countdown before questions in room ${roomName}`);

            // Clear any existing time update intervals
            if (quizState.currentTimeInterval) {
                clearInterval(quizState.currentTimeInterval);
                quizState.currentTimeInterval = null;
            }

            // Start countdown from 3
            let countdown = 3;

            // Broadcast initial countdown value to all clients in this room
            broadcastToRoom(roomName, "countdown-start", { countdown });

            // Set up interval for countdown
            quizState.currentTimeInterval = setInterval(() => {
                countdown--;

                if (countdown > 0) {
                    // Continue countdown
                    broadcastToRoom(roomName, "countdown-update", { countdown });
                } else {
                    // Countdown complete, start questions
                    clearInterval(quizState.currentTimeInterval);
                    quizState.currentTimeInterval = null;
                    startQuestions(roomName);
                }
            }, 1000); // One second between countdown numbers
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

        // Store full quiz data
        quizState.isRunning = true;
        quizState.currentIndex = -1; // Waiting phase
        quizState.waitingTime = quizData.waitingTime;
        quizState.timeLimit = quizData.timeLimit;
        quizState.questionIds = quizData.questionIds;
        quizState.questions = quizData.questions || [];

        // Set timing for waiting phase - convert minutes to milliseconds
        quizState.startTime = Date.now();
        quizState.endTime = quizState.startTime + (quizData.waitingTime * 60 * 1000); // Minutes to milliseconds

        // Format initial waiting time (full minutes)
        const minutes = Math.floor(quizData.waitingTime).toString().padStart(2, '0');
        const formattedTime = `${minutes}:00.0`;

        // Notify all clients in the room about waiting phase with formatted time
        broadcastToRoom(roomName, "quiz-waiting", {
            formattedTime: formattedTime,
            timeLeftMs: quizData.waitingTime * 60 * 1000,
            serverTime: quizState.startTime,
            endTime: quizState.endTime
        });

        console.log(`Quiz started in room ${roomName} with ${quizData.waitingTime} minutes waiting time`);

        // Set up regular time updates
        quizState.currentTimeInterval = setInterval(() => {
            const currentTime = Date.now();
            const timeLeftMs = Math.max(0, quizState.endTime - currentTime);

            // Format time as MM:SS.D
            const minutes = Math.floor(timeLeftMs / (60 * 1000)).toString().padStart(2, '0');
            const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000).toString().padStart(2, '0');
            const deciseconds = Math.floor((timeLeftMs % 1000) / 100);

            const formattedTime = `${minutes}:${seconds}.${deciseconds}`;

            broadcastToRoom(roomName, "time-update", {
                formattedTime: formattedTime,
                timeLeftMs: timeLeftMs,
                serverTime: currentTime
            });

            // Check if current phase has ended
            if (currentTime >= quizState.endTime) {
                if (quizState.currentIndex === -1) {
                    // Waiting phase ended, start questions
                    clearInterval(quizState.currentTimeInterval);
                    quizState.currentTimeInterval = null;
                    startQuestions(roomName);
                } else if (quizState.currentIndex >= quizState.questionIds.length - 1) {
                    // Last question ended, end quiz
                    clearInterval(quizState.currentTimeInterval);
                    quizState.currentTimeInterval = null;
                    endQuiz(roomName);
                } else {
                    // Move to next question
                    clearInterval(quizState.currentTimeInterval);
                    quizState.currentTimeInterval = null;
                    moveToNextQuestion(roomName);
                }
            }
        }, 100); // Update more frequently (every 100ms) to show deciseconds
    }

    // Function to start the questions phase - modified to be room-specific
    function startQuestions(roomName) {
        moveToNextQuestion(roomName);
    }

    // Function to move to the next question - modified to be room-specific
    function moveToNextQuestion(roomName) {
        const quizState = roomQuizStates[roomName];
        quizState.currentIndex++;
        quizState.startTime = Date.now();
        quizState.endTime = quizState.startTime + (quizState.timeLimit * 1000); // Seconds to milliseconds

        // Format initial question time
        const minutes = Math.floor(quizState.timeLimit / 60).toString().padStart(2, '0');
        const seconds = (quizState.timeLimit % 60).toString().padStart(2, '0');
        const formattedTime = `${minutes}:${seconds}.0`;

        console.log(`Moving to question ${quizState.currentIndex + 1} in room ${roomName}`);

        broadcastToRoom(roomName, "question-update", {
            currentIndex: quizState.currentIndex,
            formattedTime: formattedTime,
            timeLeftMs: quizState.timeLimit * 1000,
            questionId: quizState.questionIds[quizState.currentIndex],
            questionText: quizState.questions[quizState.currentIndex]?.questionText,
            options: quizState.questions[quizState.currentIndex]?.options,
            serverTime: quizState.startTime,
            endTime: quizState.endTime
        });

        // Set up time updates for this question
        quizState.currentTimeInterval = setInterval(() => {
            const currentTime = Date.now();
            const timeLeftMs = Math.max(0, quizState.endTime - currentTime);

            // Format time as MM:SS.D
            const minutes = Math.floor(timeLeftMs / (60 * 1000)).toString().padStart(2, '0');
            const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000).toString().padStart(2, '0');
            // const deciseconds = Math.floor((timeLeftMs % 1000) / 100);

            const formattedTime = `${minutes}:${seconds}`;

            broadcastToRoom(roomName, "time-update", {
                formattedTime: formattedTime,
                timeLeftMs: timeLeftMs,
                serverTime: currentTime
            });

            if (currentTime >= quizState.endTime) {
                clearInterval(quizState.currentTimeInterval);
                quizState.currentTimeInterval = null;

                if (quizState.currentIndex >= quizState.questionIds.length - 1) {
                    // Last question ended
                    endQuiz(roomName);
                } else {
                    // Move to next question
                    moveToNextQuestion(roomName);
                }
            }
        }, 100); // Update more frequently to show deciseconds
    }

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
        quizState.isRunning = false;
        quizState.hasEnded = true; // Add a new flag to track quiz end state
        
        // Broadcast end to all clients
        broadcastToRoom(roomName, "quiz-end");
        
        // Clean up quiz state after a delay to ensure all clients receive the end message
        setTimeout(() => {
            delete roomQuizStates[roomName];
        }, 5000);
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

    socket.on('disconnect', () => {
        // Ensure peers[socket.id] exists before destructuring
        if (peers[socket.id]) {
            console.log('peer disconnected');
            consumers = removeItems(consumers, socket.id, 'consumer');
            producers = removeItems(producers, socket.id, 'producer');
            transports = removeItems(transports, socket.id, 'transport');

            const { roomName, peerDetails } = peers[socket.id];

            // If this peer was the admin and there are other peers in the room
            if (peerDetails.isAdmin && rooms[roomName] && rooms[roomName].peers.length > 0) {
                // Assign admin to the next peer
                const nextPeerSocketId = rooms[roomName].peers[0];
                if (peers[nextPeerSocketId]) {
                    peers[nextPeerSocketId].peerDetails.isAdmin = true;

                    // Notify the new admin
                    peers[nextPeerSocketId].socket.emit('admin-rights-granted');
                }
            }

            delete peers[socket.id];

            // Remove socket from room
            if (rooms[roomName]) {
                rooms[roomName] = {
                    router: rooms[roomName].router,
                    peers: rooms[roomName].peers.filter(socketId => socketId !== socket.id),
                };
                
                // Check if room is now empty and has an active quiz
                if (rooms[roomName].peers.length === 0 && roomQuizStates[roomName]) {
                    console.log(`Last user left room ${roomName}, ending quiz immediately`);
                    
                    // Clear any existing intervals first
                    if (roomQuizStates[roomName].currentTimeInterval) {
                        clearInterval(roomQuizStates[roomName].currentTimeInterval);
                        roomQuizStates[roomName].currentTimeInterval = null;
                    }
                    
                    // Then end the quiz
                    endQuiz(roomName);
                }
            }
        } else {
            console.log(`Socket ${socket.id} disconnected but was not registered in peers.`);
        }
    });

    socket.on("room:LogIn", data => {
        const { email, room, name, socketId } = data;
        console.log(data)
        // emailToSocketIdMap.set(email, socket.id);

        connections.to(socket.id).emit("room:join", data);
    })


    // Handle camera state change
    socket.on('cameraStateChanged', (data) => {

        // Broadcast the camera state change to the other users
        connections.emit('cameraStateChanged', data); // Notify all other clients
    });

    socket.on('joinRoom', async ({ roomName }, callback) => {
        // create Router if it does not exist
        // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
        const router1 = await createRoom(roomName, socket.id);

        // Check if this is the first peer in the room
        const isFirstPeer = rooms[roomName].peers.length === 1;

        peers[socket.id] = {
            socket,
            roomName,           // Name for the Router this Peer joined
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: {
                name: '',
                isAdmin: isFirstPeer,   // Is this Peer the Admin?
            }
        }

        // get Router RTP Capabilities
        const rtpCapabilities = router1.rtpCapabilities

        // Notify the user that they have successfully joined the room
        socket.emit('room-joined', {
            roomName,
            success: true,
            message: `You have successfully joined room: ${roomName}`
        });

        // call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities, isAdmin: isFirstPeer })
    })


    const createRoom = async (roomName, socketId) => {
        // worker.createRouter(options)
        // options = { mediaCodecs, appData }
        // mediaCodecs -> defined above
        // appData -> custom application data - we are not supplying any
        // none of the two are required
        let router1
        let peers = []
        if (rooms[roomName]) {
            router1 = rooms[roomName].router
            peers = rooms[roomName].peers || []
        } else {
            router1 = await worker.createRouter({ mediaCodecs, })
        }

        console.log(`Router ID: ${router1.id}`, peers.length)

        rooms[roomName] = {
            router: router1,
            peers: [...peers, socketId],
        }

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
        console.log(`just joined, id ${id} ${roomName}, ${socketId}`)
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



                addConsumer(consumer, roomName)

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


    // Listen for the "sendMsg" event
    socket.on("sendMsg", async (data) => {
        const { msg, socketId } = data;

        //console.log("senderName ", name)

        // Emit the message to all connected clients (including the sender)
        // Send as an array containing the message da
        // ta
        connections.emit("newMsg", [{ msg: msg, socketId: socket.id }]);
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
