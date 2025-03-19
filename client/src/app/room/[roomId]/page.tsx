"use client";
import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/context/SocketProvider";
import { Device } from "mediasoup-client";
import { Producer } from "mediasoup-client/lib/Producer";
import { Transport } from "mediasoup-client/lib/Transport";
import { Consumer } from "mediasoup-client/lib/Consumer";
import { useParams, useSearchParams } from "next/navigation";

import "@/app/globals.css";
import VideoGrid from "@/components/VideoGrid";
import ControlsBtn from "@/components/ControlsBtn";
import SlideBar from "@/components/SlideBar";
import InvitePeople from "@/components/InvitePeople";

interface Stream {
  track: MediaStreamTrack;
  kind?: string;
  type?: string;
  userId: string;
  isCameraOn?: boolean;
  isMicrophoneOn?: boolean;
  videoStyle?: React.CSSProperties;
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

function Home() {
  const path = useParams(); // Dynamic route segments
  const roomId = path.roomId as string;
  const socket = useSocket();
  const [roomName, setRoomName] = useState<string | string[]>(roomId);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  let device: Device;
  let rtpCapabilities: any;
  let producerTransport: Transport;
  let consumerTransports: ConsumerTransportData[] = [];
  let audioProducer: Producer;
  let videoProducer: Producer;
  let screenVideoProducer: Producer;
  let screenAudioProducer: Producer;

  const [mainTransport, setMainTransport] = useState<Transport | null>(null);
  const [audioProducerId, setAudioProducerId] = useState<string >('');
  const [videoProducerId, setVideoProducerId] = useState<string >('');

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
  
  const getLocalStream = async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 1920, height: 1080 }, // Increase resolution for better quality
    });

    setLocalStream(stream);

    audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
    videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

    joinRoom();
  };

  const joinRoom = (): void => {
    socket?.emit("joinRoom", { roomName }, async (data: { rtpCapabilities: any }) => {
      console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
      // we assign to local variable and will be used when
      // loading the client Device (see createDevice above)
      rtpCapabilities = data.rtpCapabilities;
      // once we have rtpCapabilities from the Router, create Device
      device = await createDevice(rtpCapabilities);
      producerTransport = await createSendTransport(device);
      setMainTransport(producerTransport);
      connectSendTransport(producerTransport);
    });
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
              } catch (error : any) {
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
                ({ id, producersExist }: { id: string, producersExist: boolean }) => {
                  callback({ id });
                  if (producersExist) getProducers(); // Fetch existing producers if needed
                }
              );
            } catch (error : any) {
              errback(error);
            }
          });

          resolve(transport);
        }
      );
    });
  };

  const produceStream = async (transport: Transport, params: any): Promise<Producer> => {
    if (!params.track) {
      console.error("Invalid params: Track is required");
      throw new Error("Invalid params: Track is required");
    }
    return await transport.produce(params); // Pass the params object
  };

  const connectSendTransport = async (Transport: Transport): Promise<void> => {
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

  const signalNewConsumerTransport = async (remoteProducerId: string, appData: any): Promise<void> => {
    //check if we are already consuming the remoteProducerId
    if (consumingTransports.includes(remoteProducerId)) return;
    consumingTransports.push(remoteProducerId);

    socket?.emit("createWebRtcTransport", { consumer: true }, ({ params }: { params: any }) => {
      // The server sends back params needed
      // to create Send Transport on the client side
      if (params.error) {
        console.log(params.error);
        return;
      }
      console.log(`PARAMS... ${params}`);

      let consumerTransport;
      try {
        consumerTransport = device.createRecvTransport(params);
      } catch (error) {
        // exceptions:
        // {InvalidStateError} if not loaded
        // {TypeError} if wrong arguments.
        console.log(error);
        return;
      }

      consumerTransport.on(
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
          } catch (error : any) {
            // Tell the transport that something was wrong
            errback(error);
          }
        }
      );

      connectRecvTransport(consumerTransport, remoteProducerId, appData, params.id);
    });
  };

  // server informs the client of a new producer just joined
  const handleNewProducer = ({ producerId, appData }: { producerId: string, appData: any }): void => {
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

    // remove the video div element

    // Remove the video div element
    setStreams((prevStreams) => {
      console.log("Before filtering streams:", prevStreams);
      const updatedStreams = prevStreams.filter(
        (stream) => stream.userId !== remoteProducerId
      );
      console.log("After filtering streams:", updatedStreams);
      return updatedStreams;
    });
  };

  const getProducers = (): void => {
    socket?.emit("getProducers", (producers: ProducerData[]) => {
        console.log("Producers:", producers); // Check if producers contain appData
        producers.forEach(({ producerId, appData }) => {
            console.log("Producer ID:", producerId);
            console.log("App Data:", appData);
            // Call your function to create a consumer for each producer
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
    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    socket?.emit(
      "consume",
      {
        rtpCapabilities: device.rtpCapabilities,
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
        console.log("Consumer Params ID:", params.id);
        console.log("Consumer Params Producer ID:", params.producerId);
        console.log("Consumer Params Kind:", params.kind);
        console.log("Consumer Params Type:", params.type);
        console.log("Consumer Params RTP Parameters:", params.rtpParameters);

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
          setStreams((prevStreams) => [
            ...prevStreams,
            {
              track: track,
              kind: params.kind,
              userId: remoteProducerId,
            },
          ]);
        } else {
          setStreams((prevStreams) => [
            ...prevStreams,
            {
              track: track,
              kind: params.kind,
              type: params.type,
              userId: remoteProducerId,
              isCameraOn: track.enabled,
              isMicrophoneOn: track.enabled,
              videoStyle, // Pass the dynamic style to adjust the size
            },
          ]);
        }

        // the server consumer started with media paused
        // so we need to inform the server to resume
        socket?.emit("consumer-resume", {
          serverConsumerId: params.serverConsumerId,
        });
      }
    );
  };

  // Listen for `new-producer` events
  useEffect(() => {
    if (socket) {
      socket.on("new-producer", handleNewProducer);
      socket.on("producer-closed", ({ remoteProducerId }: { remoteProducerId: string }) => {
        handleProducerClosed(remoteProducerId);
      });
      socket.on("cameraStateChanged", handleMediaChange);
    }
    return () => {
      if (socket) {
        socket.off("new-producer", handleNewProducer);
        socket.off("producer-closed", ({ remoteProducerId }: { remoteProducerId: string }) => {
          handleProducerClosed(remoteProducerId);
        });
        socket.off("cameraStateChanged", handleMediaChange);
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
      socket?.emit("getRtpCapabilities", { roomName }, (data: { rtpCapabilities: any }) => {
        if (data.rtpCapabilities) {
          console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
          resolve(data.rtpCapabilities); // Resolve the promise with rtpCapabilities
        } else {
          reject("RTP capabilities not found");
        }
      });
    });
  };

  const startScreenShare = async (): Promise<void> => {
    try {
      // Request screen sharing
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      console.log("Start screen share", screenTransport);

      // Get the video and audio tracks
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = screenStream.getAudioTracks()[0];

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
      // const videoCardId = screenProducer.id;
      // screenVideoElement.id = videoCardId;

      // Listen for 'trackended' and 'transportclose' events
      screenVideoProducer.on("trackended", () => {
        console.log("Video track ended");
        // Close the producer when the track ends
      });

      screenVideoProducer.on("transportclose", () => {
        console.log("Video transport closed");
        // Close the producer when transport closes
      });

      // Listen for the 'ended' event on the screen stream
      if(screenVideoProducer.track){
      screenVideoProducer.track.onended = () => {
        console.log("Track ended");
        screenTransport.close();
        stopScreenSharing(screenVideoProducer.id);
        stopScreenSharing(screenAudioProducer?.id);
      };
    }} catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenSharing = (videoCardId: string): void => {
    setStreams((prevStreams) =>
      prevStreams.filter((stream) => stream.userId !== videoCardId)
    );
  };

  const producerClose = (): void => {
    if (mainTransport) {
      mainTransport.close();
    }
    window.location.href = "/Home";
  };

  // New features
  const toggleInvitePopup = (): void =>
    setIsInvitePopupVisible(!isInvitePopupVisible);

  const [isInvitePopupVisible, setIsInvitePopupVisible] = useState<boolean>(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

  const toggleChat = (): void => setIsChatVisible(!isChatVisible);

  useEffect(() => {
    if (!socket) return; // Wait until the socket is initialized

    const handleConnectionSuccess = (socketId: string, existsProducer: boolean) => {
      console.log(socketId, existsProducer); // Log the connection success message
      getLocalStream();
    };

    socket.on("connection-success", handleConnectionSuccess);
    // server informs the client of a new producer just joined

    return () => {
      socket.off("connection-success", handleConnectionSuccess); // Cleanup
    };
  }, [socket]);

  return (
    <>
      <div
        id="room"
        className="relative flex flex-col h-screen bg-gray-900 text-white overflow-hidden"
      >
        {/* Video Container */}
        <VideoGrid streams={streams} />

        {/* Chat Sidebar */}
        <div
          className={`fixed top-0 right-0 h-full w-64 bg-gray-800 text-white shadow-lg transform transition-transform duration-300 z-50 ${
            isChatVisible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SlideBar isChatVisible={isChatVisible} />
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

      {/* Footer */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-gray-800 text-white p-1 flex justify-center z-40 ${
          isChatVisible ? "opacity-100" : "opacity-100"
        }`}
      >
        <ControlsBtn
          myStream={localStream}
          toggleInvitePopup={toggleInvitePopup}
          // isChatVisible={isChatVisible}
          toggleChat={toggleChat}
          startScreenShare={startScreenShare}
          producerClose={producerClose}
          audioProducerId={audioProducerId}
          videoProducerId={videoProducerId}
        />
      </div>
    </>
  );
}

export default Home;