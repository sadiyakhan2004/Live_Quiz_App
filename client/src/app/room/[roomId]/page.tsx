"use client";
import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/context/SocketProvider";
import { Device } from "mediasoup-client";
import { Producer } from "mediasoup-client/lib/Producer";
import { Transport } from "mediasoup-client/lib/Transport";
import { Consumer } from "mediasoup-client/lib/Consumer";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

import "@/app/globals.css";
import VideoGrid from "@/components/VideoGrid";
import ControlsBtn from "@/components/ControlsBtn";
import SlideBar from "@/components/SlideBar";
import InvitePeople from "@/components/InvitePeople";
import UserAuthForm from "@/components/helperComponents/UserAuthForm";
import { v4 as uuidv4 } from "uuid";

interface Stream {
  track: MediaStreamTrack;
  kind?: string;
  type?: string;
  userId: string;
  isCameraOn?: boolean;
  isMicrophoneOn?: boolean;
  videoStyle?: React.CSSProperties;
  isHost?: boolean;
  name?: string;
  email?: string;
}

interface ConsumerTransportData {
  consumerTransport: Transport;
  serverConsumerTransportId: string;
  producerId: string;
  consumer: Consumer;
}

interface ProducerData {
  producerId: string;
  appData: any;
}

interface MediaChangeData {
  userId: string;
  isMuted: boolean;
  media: "audio" | "video";
}

interface Participant {
  socketId: string;
  name: string;
  email: string;
  isHost: boolean;
}

function Home() {
  const router = useRouter();
  const path = useParams(); // Dynamic route segments
  const roomId = path.roomId as string;
  const socket = useSocket();
  const [roomName, setRoomName] = useState<string | string[]>(roomId);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(true);
  const [userData, setUserData] = useState({ username: "", email: "" });
  const [isScreenSharingOff, setIsScreenSharingOff] = useState(true);
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [storedSession, setStoredSession] = useState<{
    username: string;
    email: string;
    roomId: string;
    isHost: boolean;
  } | null>(null);

  const deviceRef = useRef<Device | null>(null);
  let rtpCapabilities: any;
  let producerTransport: Transport;
  let consumerTransports: ConsumerTransportData[] = [];
  let audioProducer: Producer;
  let videoProducer: Producer;
  let screenVideoProducer: Producer;
  let screenAudioProducer: Producer;

  const [mainTransport, setMainTransport] = useState<Transport | null>(null);
  const [audioProducerId, setAudioProducerId] = useState<string>("");
  const [videoProducerId, setVideoProducerId] = useState<string>("");
  const [isHost, setIsHost] = useState<boolean>(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showExistingSessionModal, setShowExistingSessionModal] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  let params = {
    // mediasoup params
    encodings: [
      {
        rid: "r0",
        maxBitrate: 500000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r1",
        maxBitrate: 1500000, // Increase max bitrate for higher quality
        scalabilityMode: "S1T3",
      },
      {
        rid: "r2",
        maxBitrate: 3000000, // Higher max bitrate for better quality
        scalabilityMode: "S1T3",
      },
    ],
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
    codecOptions: {
      videoGoogleStartBitrate: 1000,
    },
  };
  // Define parameters for screen share
  const screenParams = {
    rtpParameters: {
      encodings: [
        { rid: "r0", maxBitrate: 500000 },
        { rid: "r1", maxBitrate: 1500000 },
        { rid: "r2", maxBitrate: 3000000 },
      ],
    },
  };

  let audioParams: any = { appData: { type: "audio" } };
  let screenAudioParams: any = { appData: { type: "audio" } };
  let videoParams: any = { ...params, appData: { type: "camera" } };
  let screenVideoParams: any = {
    ...screenParams,
    appData: { type: "screen-video" },
  };
  let consumingTransports: string[] = [];
  let consumer: Consumer;

  const [streams, setStreams] = useState<Stream[]>([]);

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      const sessionData = sessionStorage.getItem("session");
      const userId = localStorage.getItem("userId");

      if (sessionData && userId) {
        const parsedSession = JSON.parse(sessionData);
        if (parsedSession.roomId === roomId) {
          setStoredSession(parsedSession);
          setUserId(userId);
          setShowRejoinPrompt(true);
          setShowAuthForm(false);
          setIsHost(parsedSession.isHost); // Restore host status
          return;
        }
      }
      setShowAuthForm(true);
    };

    checkExistingSession();
  }, [roomId]);

  const handleUserAuth = ({
    username,
    email,
  }: {
    username: string;
    email: string;
  }) => {
    setUserData({ username, email });
    setShowAuthForm(false);
    // Now that we have user info, we can start the media connection
    getLocalStream(username, email, false);
  };

  const getLocalStream = async (
    username: string,
    email: string,
    isRejoin: boolean
  ): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 1920, height: 1080 },
    });

    setLocalStream(stream);

    audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
    videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

    if (isRejoin) {
      roomRejoin(username, email);
    } else {
      // Pass username and email to joinRoom
      joinRoom(username, email);
    }
  };

  const roomRejoin = (username: string, email: string): void => {
    socket?.emit(
      "room-rejoin",
      { storedSession, userId, roomName: roomId },
      async (data: {
        rtpCapabilities: any;
        isAdmin: boolean;
        participants: Participant[];
        error?: boolean;
        message?: string;
        existingSession?: boolean;
      }) => {
        // Check if there was an error indicating existing session
        if (data.error && data.existingSession) {
          // Show modal or alert about existing session
          setShowExistingSessionModal(true);
          setErrorMessage(
            data.message ||
              "You are already connected to this room from another device or browser tab."
          );
          return; // Exit early
        }
        console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
        // we assign to local variable and will be used when
        // loading the client Device (see createDevice above)

        // Set the host status first
        const isUserHost = data.isAdmin;
        const existingParticipants = data.participants;
        setIsHost(isUserHost);
        setParticipants(existingParticipants);

        console.log("existing paticipants", existingParticipants);
        console.log("rejoin the room");

        // Now define the parameters with the correct isHost value
        audioParams = {
          ...audioParams,
          appData: {
            ...audioParams.appData,
            isHost: isUserHost,
          },
        };

        videoParams = {
          ...videoParams,
          appData: {
            ...videoParams.appData,
            isHost: isUserHost,
            username,
            email,
          },
        };

        rtpCapabilities = data.rtpCapabilities;
        // once we have rtpCapabilities from the Router, create Device
        let deviceInstance = await createDevice(rtpCapabilities);
        producerTransport = await createSendTransport(deviceInstance);
        setMainTransport(producerTransport);
        connectSendTransport(producerTransport, {
          username,
          email,
          isHost: data.isAdmin,
        });
      }
    );
  };

  const joinRoom = (username: string, email: string): void => {
    let storedUserId = localStorage.getItem("userId");

    if (!storedUserId) {
      storedUserId = uuidv4(); // Create new session ID
      localStorage.setItem("userId", storedUserId);
    }

    setUserId(storedUserId);

    socket?.emit(
      "joinRoom",
      { roomName, username, email, userId: storedUserId },
      async (data: {
        rtpCapabilities: any;
        isAdmin: boolean;
        participants: Participant[];
        error?: boolean;
        message?: string;
        existingSession?: boolean;
      }) => {
        // Check if there was an error indicating existing session
        if (data.error && data.existingSession) {
          // Show modal or alert about existing session
          setShowExistingSessionModal(true);
          setErrorMessage(
            data.message ||
              "You are already connected to this room from another device or browser tab."
          );
          return; // Exit early
        }

        console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
        // we assign to local variable and will be used when
        // loading the client Device (see createDevice above)

        // Save session data with host status
        const sessionData = {
          username,
          email,
          roomId: roomId,
          isHost: data.isAdmin,
        };
        sessionStorage.setItem("session", JSON.stringify(sessionData));

        // Set the host status first
        const isUserHost = data.isAdmin;
        const existingParticipants = data.participants;
        setIsHost(isUserHost);
        setParticipants(existingParticipants);

        console.log("existing paticipants", existingParticipants);

        // Now define the parameters with the correct isHost value
        audioParams = {
          ...audioParams,
          appData: {
            ...audioParams.appData,
            isHost: isUserHost,
          },
        };

        videoParams = {
          ...videoParams,
          appData: {
            ...videoParams.appData,
            isHost: isUserHost,
            username,
            email,
          },
        };

        rtpCapabilities = data.rtpCapabilities;
        // once we have rtpCapabilities from the Router, create Device
        let device = await createDevice(rtpCapabilities);
        producerTransport = await createSendTransport(device);
        setMainTransport(producerTransport);
        connectSendTransport(producerTransport, {
          username,
          email,
          isHost: data.isAdmin,
        });
      }
    );
  };

  // A device is an endpoint connecting to a Router on the
  // server side to send/recive media
  const createDevice = async (rtpCapabilities: any): Promise<Device> => {
    try {
      let device = new Device();

      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
      // Loads the device with RTP capabilities of the Router (server side)
      await device.load({
        // see getRtpCapabilities() below
        routerRtpCapabilities: rtpCapabilities,
      });

      console.log("Device RTP Capabilities", device.rtpCapabilities);
      deviceRef.current = device;

      return device;

      // once the device loads, create transport
      // createSendTransport();
    } catch (error: any) {
      console.log(error);
      if (error.name === "UnsupportedError")
        console.warn("browser not supported");
      throw error; // Re-throw to handle it upstream
    }
  };

  const createSendTransport = async (device: Device): Promise<Transport> => {
    return new Promise((resolve, reject) => {
      socket?.emit(
        "createWebRtcTransport",
        { consumer: false },
        ({ params }: { params: any }) => {
          if (params.error) {
            console.error("Transport creation error:", params.error);
            reject(params.error);
            return;
          }

          console.log("Transport params:", params);

          const transport = device.createSendTransport(params);

          transport.on(
            "connect",
            async ({ dtlsParameters }, callback, errback) => {
              try {
                // Signal local DTLS parameters to the server side transport
                socket?.emit("transport-connect", {
                  dtlsParameters,
                  transportId: transport.id,
                });
                callback();
              } catch (error: any) {
                errback(error);
              }
            }
          );

          transport.on("produce", async (parameters, callback, errback) => {
            console.log("Produce parameters:", parameters);
            try {
              socket?.emit(
                "transport-produce",
                {
                  kind: parameters.kind,
                  rtpParameters: parameters.rtpParameters,
                  appData: parameters.appData,
                  transportId: transport.id,
                },
                ({
                  id,
                  producersExist,
                }: {
                  id: string;
                  producersExist: boolean;
                }) => {
                  callback({ id });
                  if (producersExist) getProducers(); // Fetch existing producers if needed
                }
              );
            } catch (error: any) {
              errback(error);
            }
          });

          resolve(transport);
        }
      );
    });
  };

  const produceStream = async (
    transport: Transport,
    params: any
  ): Promise<Producer> => {
    if (!params.track) {
      console.error("Invalid params: Track is required");
      throw new Error("Invalid params: Track is required");
    }
    return await transport.produce(params); // Pass the params object
  };

  const connectSendTransport = async (
    Transport: Transport,
    userdata: { username: string; email: string; isHost: boolean }
  ): Promise<void> => {
    // we now call produce() to instruct the producer transport
    // to send media to the Router
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
    // this action will trigger the 'connect' and 'produce' events above

    audioProducer = await produceStream(Transport, audioParams);
    videoProducer = await produceStream(Transport, videoParams);

    setAudioProducerId(audioProducer.id);
    setVideoProducerId(videoProducer.id);

    setStreams((prevStreams) => [
      ...prevStreams,
      {
        track: videoParams.track,
        kind: "video",
        type: videoParams.appData.type,
        userId: videoProducer.id,
        isCameraOn: videoParams.track.enabled,
        isMicrophoneOn: audioParams.track.enabled,
        isHost: userdata.isHost,
        name: userdata.username,
        email: userdata.email,
      },
    ]);

    audioProducer.on("trackended", () => {
      console.log("audio track ended");

      // close audio track
    });

    audioProducer.on("transportclose", () => {
      console.log("audio transport ended");

      // close audio track
    });

    videoProducer.on("trackended", () => {
      console.log("video track ended");

      // close video track
    });

    videoProducer.on("transportclose", () => {
      console.log("video transport ended");

      // close video track
    });
  };

  const signalNewConsumerTransport = async (
    remoteProducerId: string,
    appData: any
  ): Promise<void> => {
    //check if we are already consuming the remoteProducerId
    if (consumingTransports.includes(remoteProducerId)) return;
    consumingTransports.push(remoteProducerId);

    socket?.emit(
      "createWebRtcTransport",
      { consumer: true },
      ({ params }: { params: any }) => {
        // The server sends back params needed
        // to create Send Transport on the client side
        if (params.error) {
          console.log(params.error);
          return;
        }
        console.log(`PARAMS... ${params}`);

        let consumerTransport;
        try {
          consumerTransport = deviceRef.current?.createRecvTransport(params);
        } catch (error) {
          // exceptions:
          // {InvalidStateError} if not loaded
          // {TypeError} if wrong arguments.
          console.log(error);
          return;
        }

        consumerTransport?.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              // Signal local DTLS parameters to the server side transport
              // see server's socket.on('transport-recv-connect', ...)
              socket?.emit("transport-recv-connect", {
                dtlsParameters,
                serverConsumerTransportId: params.id,
              });

              // Tell the transport that parameters were transmitted.
              callback();
            } catch (error: any) {
              // Tell the transport that something was wrong
              errback(error);
            }
          }
        );

        if (consumerTransport) {
          connectRecvTransport(
            consumerTransport,
            remoteProducerId,
            appData,
            params.id
          );
        } else {
          console.error("Consumer transport is undefined");
        }
      }
    );
  };

  // server informs the client of a new producer just joined
  const handleNewProducer = ({
    producerId,
    appData,
  }: {
    producerId: string;
    appData: any;
  }): void => {
    signalNewConsumerTransport(producerId, appData);
  };

  const handleProducerClosed = (remoteProducerId: string): void => {
    // server notification is received when a producer is closed
    // we need to close the client-side consumer and associated transport
    console.log(remoteProducerId);
    console.log("inside the handleProducerClose function");

    const producerToClose = consumerTransports.find(
      (transportData) => transportData.producerId === remoteProducerId
    );

    if (producerToClose) {
      producerToClose.consumerTransport.close();
      producerToClose.consumer.close();

      // remove the consumer transport from the list
      consumerTransports = consumerTransports.filter(
        (transportData) => transportData.producerId !== remoteProducerId
      );
    }

    // Remove the video div element
    setStreams((prevStreams) => {
      //console.log("Before filtering streams:", prevStreams);
      const updatedStreams = prevStreams.filter(
        (stream) => stream.userId !== remoteProducerId
      );
      // console.log("After filtering streams:", updatedStreams);
      return updatedStreams;
    });
  };

  const getProducers = (): void => {
    socket?.emit("getProducers", (producers: ProducerData[]) => {
      //console.log("Available producers:", producers);

      // Filter to only get producers we're not already consuming
      const newProducers = producers.filter(
        ({ producerId }) => !consumingTransports.includes(producerId)
      );

      //console.log(`Found ${newProducers.length} new producers to consume`);

      // Only process new producers
      newProducers.forEach(({ producerId, appData }) => {
        signalNewConsumerTransport(producerId, appData);
      });
    });
  };

  const connectRecvTransport = async (
    consumerTransport: Transport,
    remoteProducerId: string,
    appData: any,
    serverConsumerTransportId: string
  ): Promise<void> => {
    // First check if this producerId is already in streams
    const existingStream = streams.find(
      (stream) => stream.userId === remoteProducerId
    );
    if (existingStream) {
      return;
    }

    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    socket?.emit(
      "consume",
      {
        rtpCapabilities: deviceRef.current?.rtpCapabilities,
        remoteProducerId,
        appData,
        serverConsumerTransportId,
      },
      async ({ params }: { params: any }) => {
        if (params.error) {
          console.log("Cannot Consume");
          return;
        }

        console.log(`Consumer Params ${params}`);

        // Log individual param values if needed
        // console.log("Consumer Params ID:", params.id);
        // console.log("Consumer Params Producer ID:", params.producerId);
        // console.log("Consumer Params Kind:", params.kind);
        // console.log("Consumer Params Type:", params.type);
        // console.log("Consumer Params RTP Parameters:", params.rtpParameters);

        // then consume with the local consumer transport
        // which creates a consumer
        const consumer = await consumerTransport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          //type: params.type,
          rtpParameters: params.rtpParameters,
        });

        consumerTransports = [
          ...consumerTransports,
          {
            consumerTransport,
            serverConsumerTransportId: params.id,
            producerId: remoteProducerId,
            consumer,
          },
        ];

        const { track } = consumer;

        console.log("consumerTransport", consumerTransports);

        let videoStyle: React.CSSProperties = {};

        if (params.type === "screen") {
          // Larger size for screen sharing
          videoStyle = { width: "1000px", height: "800px" };
        } else {
          // Regular camera video size
          videoStyle = { width: "500px", height: "300px" };
        }

        // Apply styles for both audio and video tracks
        if (params.kind === "audio") {
          setStreams((prevStreams) => {
            // Check if we already have this stream
            if (prevStreams.some((s) => s.userId === remoteProducerId)) {
              return prevStreams;
            }
            return [
              ...prevStreams,
              {
                track: track,
                kind: params.kind,
                userId: remoteProducerId,
              },
            ];
          });
        } else {
          setStreams((prevStreams) => {
            // Check if we already have this stream
            if (prevStreams.some((s) => s.userId === remoteProducerId)) {
              return prevStreams;
            }
            return [
              ...prevStreams,
              {
                track: track,
                kind: params.kind,
                type: params.appData?.type,
                userId: remoteProducerId,
                isCameraOn: track.enabled,
                isMicrophoneOn: track.enabled,
                videoStyle,
                isHost: params.appData?.isHost || false,
                name: params.appData?.username || "",
                email: params.appData?.email || "",
              },
            ];
          });
        }

        // the server consumer started with media paused
        // so we need to inform the server to resume
        socket?.emit("consumer-resume", {
          serverConsumerId: params.serverConsumerId,
        });
      }
    );
  };

  const handleParticipants = (newParticipant: any) => {
    console.log(`New participant joined: ${newParticipant.name}`);

    // Add the new participant to our state
    setParticipants((prevParticipants) => {
      const updatedParticipants = [...prevParticipants, newParticipant];
      console.log("Updated participant list:", updatedParticipants);
      return updatedParticipants;
    });
  };

  const handleParticipantsLeft = ({
    socketId,
    name,
  }: {
    socketId: string;
    name: string;
  }) => {
    setParticipants((prevParticipants) =>
      prevParticipants.filter(
        (participant) => participant.socketId !== socketId
      )
    );
  };

  // Listen for `new-producer` events
  useEffect(() => {
    if (socket) {
      socket.on("new-producer", handleNewProducer);
      socket.on(
        "producer-closed",
        ({ remoteProducerId }: { remoteProducerId: string }) => {
          handleProducerClosed(remoteProducerId);
        }
      );
      socket.on("cameraStateChanged", handleMediaChange);
      socket.on("participant-joined", handleParticipants);
      socket.on("participant-left", handleParticipantsLeft);
    }
    return () => {
      if (socket) {
        socket.off("new-producer", handleNewProducer);
        socket.off(
          "producer-closed",
          ({ remoteProducerId }: { remoteProducerId: string }) => {
            handleProducerClosed(remoteProducerId);
          }
        );
        socket.off("cameraStateChanged", handleMediaChange);
        socket.off("participant-joined", handleParticipants);
        socket.off("participant-left", handleParticipantsLeft);
      }
    };
  }, [socket]);

  const handleMediaChange = (data: MediaChangeData): void => {
    const { userId, isMuted, media } = data;
    setStreams((prevStreams) =>
      prevStreams.map((stream) => {
        // Check if the stream belongs to the user and is of type "video"
        if (stream.userId === userId) {
          // Update the stream state based on whether the camera is muted
          if (media === "video") {
            return {
              ...stream,
              isCameraOn: isMuted, // Toggle the camera state
            };
          } else if (media === "audio") {
            return {
              ...stream,
              isMicrophoneOn: isMuted, // Toggle the camera state
            };
          }
        }
        // Return the stream unmodified if it doesn't match
        return stream;
      })
    );
  };

  let screenRtpCapabilities: any;
  let newDevice: Device;
  let screenTransport: Transport;

  const getRtpCapabilities = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      socket?.emit(
        "getRtpCapabilities",
        { roomName },
        (data: { rtpCapabilities: any }) => {
          if (data.rtpCapabilities) {
            console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
            resolve(data.rtpCapabilities); // Resolve the promise with rtpCapabilities
          } else {
            reject("RTP capabilities not found");
          }
        }
      );
    });
  };

  interface ScreenProducers {
    video?: Producer;
    audio?: Producer;
  }

  const [screenProducers, setScreenProducers] = useState<ScreenProducers>({});

  const startScreenShare = async (): Promise<void> => {
    try {
      stopScreenSharing();
      // Request screen sharing
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      console.log("Start screen share", screenTransport);

      setIsScreenSharingOff(false);

      // Get the video and audio tracks
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = screenStream.getAudioTracks()[0];

      // Fallback check for window sharing
      const checkActive = () => {
        if (videoTrack.readyState === "ended") {
          setIsScreenSharingOff(true);
          screenTransport.close();
          setStreams((prev) =>
            prev.filter((s) => s.userId !== screenVideoProducer.id)
          );

          if (screenAudioProducer) {
            setStreams((prev) =>
              prev.filter((s) => s.userId !== screenAudioProducer.id)
            );
          }
        } else {
          setTimeout(checkActive, 1000); // Check every second
        }
      };
      checkActive();

      screenVideoParams = {
        track: screenStream.getVideoTracks()[0],
        ...screenVideoParams,
      };

      screenAudioParams = {
        track: screenStream.getAudioTracks()[0],
        ...videoParams,
      };

      // Get RTP capabilities from the server
      const screenRtpCapabilities = await getRtpCapabilities();

      // Create the device and transport using the RTP capabilities
      const newDevice = await createDevice(screenRtpCapabilities);

      screenTransport = await createSendTransport(newDevice);

      // Produce the screen stream
      screenVideoProducer = await produceStream(
        screenTransport,
        screenVideoParams
      );

      // Store the tracks separately in the state
      setStreams((prevStreams) => [
        ...prevStreams,
        {
          track: videoTrack,
          type: "screen-video",
          userId: screenVideoProducer.id,
          isCameraOn: true,
        },
      ]);

      if (audioTrack) {
        screenAudioProducer = await produceStream(
          screenTransport,
          screenAudioParams
        );

        setStreams((prevStreams) => [
          ...prevStreams,
          {
            track: audioTrack,
            kind: "audio",
            userId: screenAudioProducer.id,
            isMicrophoneOn: audioTrack.enabled,
          },
        ]);
      }
      //  Update state
      setScreenProducers({
        video: screenVideoProducer,
        audio: screenAudioProducer,
      });

      // Listen for 'trackended' and 'transportclose' events
      screenVideoProducer.on("trackended", () => {
        console.log("Video track ended");
        // Close the producer when the track ends
      });

      screenVideoProducer.on("transportclose", () => {
        console.log("Video transport closed");
        // Close the producer when transport closes
      });

      // Listen for 'trackended' and 'transportclose' events
      screenAudioProducer.on("trackended", () => {
        console.log("audio track ended");
        // Close the producer when the track ends
      });

      screenAudioProducer.on("transportclose", () => {
        console.log("audio transport closed");
        // Close the producer when transport closes
      });

      // Listen for the 'ended' event on the screen stream
      if (screenVideoProducer.track) {
        screenVideoProducer.track.onended = () => {
          console.log("Track ended");
          setIsScreenSharingOff(true);
          screenTransport.close();
          setStreams((prev) =>
            prev.filter((s) => s.userId !== screenVideoProducer.id)
          );
          setStreams((prev) =>
            prev.filter((s) => s.userId !== screenAudioProducer.id)
          );
        };
      }
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };
  const stopScreenSharing = async (): Promise<void> => {
    setIsScreenSharingOff(true);
    try {
      // Close producers if they exist
      if (screenProducers.video) {
        socket?.emit("producer-close", {
          producerId: screenProducers.video.id,
          roomName,
        });
        setStreams((prev) =>
          prev.filter((s) => s.userId !== screenProducers?.video?.id)
        );
        screenProducers.video.close();
      }

      if (screenProducers.audio) {
        socket?.emit("producer-close", {
          producerId: screenProducers.audio.id,
          roomName,
        });
        setStreams((prev) =>
          prev.filter((s) => s.userId !== screenProducers?.audio?.id)
        );
        screenProducers.audio.close();
      }

      // Close transport if it exists
      if (screenTransport) {
        screenTransport.close();
      }

      // Reset state
      setScreenProducers({});
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  };

  const producerClose = (): void => {
    if (mainTransport) {
      mainTransport.close();
    }
    window.history.back(); 
  };

  // New features
  const toggleInvitePopup = (): void =>
    setIsInvitePopupVisible(!isInvitePopupVisible);

  const [isInvitePopupVisible, setIsInvitePopupVisible] =
    useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  const toggleChat = (): void => setIsChatVisible(!isChatVisible);

  useEffect(() => {
    if (!socket) return; // Wait until the socket is initialized

    const handleConnectionSuccess = (
      socketId: string,
      existsProducer: boolean
    ) => {
      console.log(socketId, existsProducer); // Log the connection success message
      // getLocalStream();
    };

    socket.on("connection-success", handleConnectionSuccess);
    // server informs the client of a new producer just joined

    return () => {
      socket.off("connection-success", handleConnectionSuccess); // Cleanup
    };
  }, [socket]);

  const handleRejoin = async () => {
    if (!storedSession) return;

    // Then proceed with rejoin
    setUserData({
      username: storedSession.username,
      email: storedSession.email,
    });
    setShowRejoinPrompt(false);
    getLocalStream(storedSession.username, storedSession.email, true);
  };

  const handleNewSession = () => {
    sessionStorage.removeItem("session");
    localStorage.removeItem("userId");
    setStoredSession(null);
    setShowRejoinPrompt(false);
    setShowAuthForm(true);
  };

  const RejoinPrompt = () => {
    const userType = storedSession?.isHost ? "Host" : "Participant";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
          <div className="text-center mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full inline-flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-600 dark:text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Rejoin Session?
            </h2>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            {userType} session detected for{" "}
            <span className="font-semibold">{storedSession?.username}</span>.
            Would you like to rejoin as {userType.toLowerCase()}?
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleRejoin}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Rejoin as {userType}
            </button>
            <button
              onClick={handleNewSession}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors duration-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Rejoin Prompt */}
      {showRejoinPrompt && <RejoinPrompt />}

      {/* User Authentication Form */}
      <UserAuthForm onSubmit={handleUserAuth} isVisible={showAuthForm} />

      {/* Only show the room UI when auth is complete */}
      {!showAuthForm && !showRejoinPrompt && (
        <div
          id="room"
          className="relative flex flex-col h-screen bg-gray-900 text-white overflow-hidden"
        >
          {/* Rest of your existing UI components */}
          <VideoGrid streams={streams} />

          {/* Chat Sidebar */}
          <div
            className={`fixed top-0 right-0 h-full w-64 bg-gray-800 text-white shadow-lg transform transition-transform duration-300 z-50 ${
              isChatVisible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <SlideBar
              isChatVisible={isChatVisible}
              userData={userData}
              participants={participants}
              setIsChatVisible={toggleChat}
            />
          </div>

          {/* Invite Popup */}
          {isInvitePopupVisible && (
            <InvitePeople
              path="room"
              roomID={roomId}
              toggleInvitePopup={toggleInvitePopup}
              isInvitePopupVisible={isInvitePopupVisible}
            />
          )}
        </div>
      )}

      {/* Footer - only show when auth is complete */}
      {!showAuthForm && !showRejoinPrompt && (
        <div
          className={`fixed bottom-0 left-0 w-full bg-gray-800 text-white p-1 flex justify-center z-40 ${
            isChatVisible ? "opacity-100" : "opacity-100"
          }`}
        >
          <ControlsBtn
            myStream={localStream}
            toggleInvitePopup={toggleInvitePopup}
            toggleChat={toggleChat}
            startScreenShare={startScreenShare}
            producerClose={producerClose}
            audioProducerId={audioProducerId}
            videoProducerId={videoProducerId}
            isQuiz={false}
            isHost={isHost}
            stopScreenSharing={stopScreenSharing}
            isScreenSharingOff={isScreenSharingOff}
          />
        </div>
      )}

      {showExistingSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Already Connected
            </h3>
            <p className="mb-4 text-lg text-gray-800 dark:text-gray-200">
              {errorMessage}
            </p>
            <p className="mb-6 text-lg text-gray-800 dark:text-gray-200">
              Please close your other session before joining again.
            </p>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              onClick={() => window.history.back()}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
