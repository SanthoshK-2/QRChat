import { useEffect, useRef, useState, useContext } from 'react';
import Peer from 'simple-peer';
import styled from 'styled-components';
import SocketContext from '../context/SocketContext';
import AuthContext from '../context/AuthContext';
import Avatar from './Avatar';
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdCallEnd, MdPause, MdPlayArrow, MdVolumeUp, MdVolumeOff, MdCall, MdFlipCameraIos } from 'react-icons/md';

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.9);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  height: 80%;
  
  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    flex: 1;
    overflow-y: auto;
  }
`;

const StyledVideo = styled.video`
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 8px;
  margin: 10px;
  background: black;
  transform: scaleX(-1); // Mirror effect

  @media (max-width: 768px) {
    max-width: 100%;
    margin: 5px 0;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
  margin-top: auto; /* Push to bottom */
  flex-wrap: wrap;
  justify-content: center;
  padding: 20px;
  width: 100%;
  background: rgba(0,0,0,0.5); /* Semi-transparent background for better visibility */
  backdrop-filter: blur(5px);
  
  @media (max-width: 768px) {
      padding-bottom: 40px; /* Extra padding for mobile bottom bar */
      gap: 10px;
  }
`;

const IncomingCallContainer = styled.div`
    position: absolute;
    bottom: 50px;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    z-index: 2002;
    padding: 20px;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
`;

const ControlButton = styled.button`
  background: ${props => props.danger ? '#ff4d4f' : '#333'};
  color: #ffffff;
  border: none;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  
  &:hover {
    background: ${props => props.danger ? '#d9363e' : '#555'};
    transform: scale(1.1);
  }

  svg {
    display: block !important;
    width: 40px;
    height: 40px;
    fill: #ffffff !important;
    color: #ffffff !important;
    stroke: none !important;
  }

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
    
    svg {
        width: 50px;
        height: 50px;
    }
  }
`;

const AnswerButton = styled.button`
  padding: 15px 40px;
  background: #00C853;
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 200, 83, 0.4);
  display: flex;
  align-items: center;
  gap: 15px;
  animation: pulse 1.5s infinite;
  z-index: 2001;

  svg {
      width: 50px;
      height: 50px;
      fill: currentColor;
  }

  @media (max-width: 768px) {
      padding: 15px 30px;
      font-size: 1.2rem;
      width: 90%;
      justify-content: center;
  }

  @keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.7); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(0, 200, 83, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 200, 83, 0); }
  }
`;

const StatusText = styled.div`
  color: white;
  margin-bottom: 20px;
  font-size: 1.5rem;
  text-align: center;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
`;

const VideoCall = ({ otherUserId, otherUserName, isCaller, callType, incomingCallData, onClose }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === 'video');
  const [isOnHold, setIsOnHold] = useState(false);
  const [isMutedSpeaker, setIsMutedSpeaker] = useState(false);
  const [status, setStatus] = useState(isCaller ? `Calling ${otherUserName || 'User'}...` : 'Incoming Call...');
  const [facingMode, setFacingMode] = useState('user');
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const streamRef = useRef();
  const startTime = useRef(null);
  const audioContextRef = useRef(null);
  const ringIntervalRef = useRef(null);

  // Stop Ringing Function
  const stopRinging = () => {
      if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
      }
      if (audioContextRef.current) {
          audioContextRef.current.close().catch(e => console.error(e));
          audioContextRef.current = null;
      }
  };

  // Ringing Sound Logic (Caller only)
  useEffect(() => {
      if (isCaller && !callAccepted) {
          const startRinging = () => {
              try {
                  const AudioContext = window.AudioContext || window.webkitAudioContext;
                  const ctx = new AudioContext();
                  audioContextRef.current = ctx;
                  
                  const playRing = () => {
                      if (!ctx || ctx.state === 'closed') return;
                      if (ctx.state === 'suspended') ctx.resume();
                      
                      const t = ctx.currentTime;
                      const osc1 = ctx.createOscillator();
                      const osc2 = ctx.createOscillator();
                      const gain = ctx.createGain();
                      
                      osc1.frequency.value = 440; // Hz
                      osc2.frequency.value = 480; // Hz
                      
                      osc1.connect(gain);
                      osc2.connect(gain);
                      gain.connect(ctx.destination);
                      
                      // Volume envelope
                      gain.gain.setValueAtTime(0, t);
                      gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
                      gain.gain.setValueAtTime(0.1, t + 1.8);
                      gain.gain.linearRampToValueAtTime(0, t + 2.0);
                      
                      osc1.start(t);
                      osc2.start(t);
                      osc1.stop(t + 2.0);
                      osc2.stop(t + 2.0);
                  };

                  playRing();
                  ringIntervalRef.current = setInterval(playRing, 3000);
              } catch (e) {
                  console.error("Ringing sound failed:", e);
              }
          };
          startRinging();
      } else {
          stopRinging();
      }

      return stopRinging;
  }, [isCaller, callAccepted]);

  useEffect(() => {
    if (userVideo.current && remoteStream) {
        userVideo.current.srcObject = remoteStream;
        // Explicitly unmute and play to ensure audio is heard
        userVideo.current.muted = false;
        userVideo.current.onloadedmetadata = () => {
            userVideo.current.play().catch(e => console.error("Remote video auto-play failed:", e));
        };
    }
  }, [remoteStream, callAccepted]); // Re-run when stream arrives or UI switches to call mode

  useEffect(() => {
    // Check for secure context and mediaDevices availability
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Media devices not supported or blocked by browser security (non-HTTPS).";
        alert(`${errorMsg}\n\nTo test on mobile/LAN, you must:\n1. Use localhost/127.0.0.1 on the host machine\n2. OR enable 'Insecure origins treated as secure' in chrome://flags on the client device.`);
        setStatus("Media Access Blocked (Insecure Origin)");
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        streamRef.current = currentStream;
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
        
        if (!isCaller && incomingCallData) {
             setStatus(`Incoming ${incomingCallData.type === 'video' ? 'Video' : 'Audio'} Call...`);
        }
      })
      .catch((err) => {
          console.error("Error accessing media devices:", err);
          let errorMsg = "Error accessing camera/microphone";
          if (err.name === 'NotAllowedError') errorMsg = "Permission denied. Allow camera/mic access.";
          if (err.name === 'NotFoundError') errorMsg = "No camera/microphone found.";
          if (err.name === 'NotReadableError') errorMsg = "Camera/mic is in use by another app.";
          setStatus(errorMsg);
          alert(`${errorMsg}\nNote: Browsers often block media on http://IP_ADDRESS. Use localhost or enable 'Insecure origins treated as secure' flag.`);
      });

      return () => {
          // Cleanup
          if(streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
          }
          if(connectionRef.current) {
              connectionRef.current.destroy();
          }
      }
  }, []);

  const toggleHold = () => {
      if (stream) {
          const newHoldState = !isOnHold;
          
          if (newHoldState) {
              // Enable Hold: Disable all tracks
              stream.getTracks().forEach(track => {
                  track.enabled = false;
              });
          } else {
              // Disable Hold: Restore tracks based on user settings
              stream.getAudioTracks().forEach(track => {
                  track.enabled = micOn;
              });
              stream.getVideoTracks().forEach(track => {
                  track.enabled = cameraOn;
              });
          }
          setIsOnHold(newHoldState);
      }
  };

  const toggleSpeaker = () => {
      // For browser, we can just mute the remote video element locally
      if (userVideo.current) {
          userVideo.current.muted = !isMutedSpeaker;
          setIsMutedSpeaker(!isMutedSpeaker);
      }
  };

  const [iceServers, setIceServers] = useState([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/ice');
        if (mounted && res.data?.iceServers?.length) {
          setIceServers(res.data.iceServers);
        }
      } catch (e) {
        console.warn('Using default ICE servers due to fetch error');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const answerCall = () => {
    setCallAccepted(true);
    startTime.current = Date.now();
    try {
        const peer = new Peer({ 
            initiator: false, 
            trickle: true, 
            stream,
            config: {
                iceServers
            }
        });

        peer.on('signal', (data) => {
          if (data.type === 'answer' || data.type === 'pranswer' || data.sdp) {
             socket.emit('answer_call', { signal: data, to: incomingCallData.from });
          } else if (data.candidate) {
             socket.emit('ice_candidate', { candidate: data, to: incomingCallData.from });
          }
        });

        socket.on('ice_candidate', (candidate) => {
          try { peer.signal(candidate); } catch {}
        });

        peer.on('stream', (currentStream) => {
          console.log("Remote Stream Received (Caller):", currentStream);
          setRemoteStream(currentStream);
        });
        
        peer.on('error', (err) => {
            console.error('Peer error:', err);
            // Ignore user-initiated abort errors which happen during hangup
            if (err.code === 'ERR_DATA_CHANNEL' || err.message.includes('User-Initiated Abort') || err.message.includes('Close called')) {
                return;
            }
            setStatus('Call Error: ' + err.message);
        });

        peer.signal(incomingCallData.signal);
        connectionRef.current = peer;
        setStatus('Connected');
    } catch (err) {
        console.error("Peer creation failed:", err);
        setStatus("Call failed to start");
    }
  };

  const callUser = () => {
    try {
        const peer = new Peer({ 
            initiator: true, 
            trickle: true, 
            stream,
            config: {
                iceServers
            }
        });

        peer.on('signal', (data) => {
          if (data.type === 'offer') {
               socket.emit('call_user', {
                userToCall: otherUserId,
                signalData: data,
                from: user.id,
                name: user.username,
                type: callType
              });
          } else if (data.candidate) {
               socket.emit('ice_candidate', { candidate: data, to: otherUserId });
          } else {
               // Fallback for untyped signals (rare in trickle, but possible)
               if (data.sdp) {
                   socket.emit('call_user', {
                    userToCall: otherUserId,
                    signalData: data,
                    from: user.id,
                    name: user.username,
                    type: callType
                  });
               } else {
                   socket.emit('ice_candidate', { candidate: data, to: otherUserId });
               }
          }
        });

        peer.on('stream', (currentStream) => {
          console.log("Remote Stream Received (Caller):", currentStream);
          setRemoteStream(currentStream);
        });
        
        peer.on('error', (err) => {
            console.error('Peer error:', err);
            // Ignore "User-Initiated Abort" as it happens during normal hangup
            if (err.code === 'ERR_DATA_CHANNEL' || err.message.includes('User-Initiated Abort')) {
                return;
            }
            setStatus('Call Error: ' + err.message);
        });

        socket.on('call_accepted', (signal) => {
          stopRinging(); // Stop ringing immediately
          setCallAccepted(true);
          startTime.current = Date.now();
          peer.signal(signal);
          setStatus('Connected');
        });

        socket.on('ice_candidate', (candidate) => {
            try { peer.signal(candidate); } catch {}
        });

        connectionRef.current = peer;
    } catch (err) {
        console.error("Peer creation failed:", err);
        setStatus("Call failed to start");
    }
  };
  
  // Auto-call if initiator
  useEffect(() => {
      if (isCaller && stream && !connectionRef.current) {
          callUser();
      }
  }, [stream, isCaller]);

  // Listen for end call
  useEffect(() => {
      if(socket) {
          socket.on('end_call', () => {
              onClose();
          });
          return () => socket.off('end_call');
      }
  }, [socket, onClose]);

  const saveCallHistory = async (status) => {
    if (!otherUserId) return;
    
    let duration = 0;
    if (startTime.current && status === 'completed') {
        duration = Math.round((Date.now() - startTime.current) / 1000);
    }

    try {
        await api.post('/calls/save', {
            callerId: isCaller ? user.id : otherUserId,
            receiverId: isCaller ? otherUserId : user.id,
            type: callType,
            status: status,
            duration: duration
        });
    } catch (error) {
        console.error("Failed to save call history:", error);
    }
  };

  const leaveCall = () => {
    if(connectionRef.current) connectionRef.current.destroy();
    
    // Explicitly stop all tracks to turn off camera light
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    // Determine status
    let callStatus = 'missed';
    if (callAccepted) {
        callStatus = 'completed';
    } else {
        if (isCaller) {
             callStatus = 'missed'; // Caller cancelled
        } else {
             callStatus = 'rejected'; // Receiver declined
        }
    }
    
    saveCallHistory(callStatus);

    socket.emit('end_call', { to: otherUserId });
    onClose();
  };

  const toggleMic = () => {
      setMicOn(!micOn);
      if(stream) stream.getAudioTracks()[0].enabled = !micOn;
  };

  const toggleCamera = () => {
      setCameraOn(!cameraOn);
      if(stream) {
          const videoTrack = stream.getVideoTracks()[0];
          if(videoTrack) videoTrack.enabled = !cameraOn;
      }
  };

  const switchCamera = async () => {
      if (callType !== 'video') return;
      
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacingMode);
      
      try {
          if (stream) {
              stream.getTracks().forEach(track => track.stop());
          }
          
          const newStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: newFacingMode },
              audio: true
          });
          
          setStream(newStream);
          if (myVideo.current) {
              myVideo.current.srcObject = newStream;
          }
          
          // If in a call, replace the video track in the peer connection
          if (connectionRef.current) {
              const videoTrack = newStream.getVideoTracks()[0];
              const sender = connectionRef.current._pc.getSenders().find(s => s.track.kind === 'video');
              if (sender) {
                  sender.replaceTrack(videoTrack);
              }
          }
          
          // Ensure mic/camera state matches UI
          newStream.getAudioTracks()[0].enabled = micOn;
          newStream.getVideoTracks()[0].enabled = cameraOn;
          
      } catch (err) {
          console.error("Failed to switch camera:", err);
          setStatus("Camera Switch Failed");
      }
  };

  return (
    <Overlay>
      <StatusText>{status}</StatusText>
      
      {!callAccepted && !isCaller && (
          <IncomingCallContainer>
              <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <ControlButton danger onClick={leaveCall} style={{ width: 100, height: 100 }}>
                        <MdCallEnd style={{ width: 50, height: 50 }} />
                    </ControlButton>
                    <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Decline</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <AnswerButton onClick={answerCall} style={{ width: 100, height: 100, padding: 0, justifyContent: 'center', borderRadius: '50%' }}>
                        {incomingCallData?.type === 'audio' ? (
                             <MdCall style={{ width: 50, height: 50 }} />
                        ) : (
                             <MdVideocam style={{ width: 50, height: 50 }} />
                        )}
                    </AnswerButton>
                    <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Accept</span>
                </div>
              </div>
              <span style={{color: 'white', opacity: 0.8, fontSize: '1.2rem', marginTop: '10px'}}>Incoming Call...</span>
          </IncomingCallContainer>
      )}

      <VideoContainer>
        <div style={{ position: 'relative', margin: '10px', width: '100%', maxWidth: '600px' }}>
             {/* If video is off or no stream, show Avatar */}
             {(!stream || !cameraOn) && (
                 <div style={{ width: '100%', height: '0', paddingBottom: '75%', background: 'black', position: 'relative', borderRadius: '8px' }}>
                     <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Avatar user={user} size="80px" />
                     </div>
                 </div>
             )}
            <StyledVideo 
                playsInline 
                muted 
                ref={myVideo} 
                autoPlay 
                style={{ display: (stream && cameraOn) ? 'block' : 'none' }} 
            />
            <span style={{ position: 'absolute', bottom: 10, left: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: 4 }}>You</span>
        </div>

        {callAccepted ? (
            <div style={{ position: 'relative', margin: '10px', width: '100%', maxWidth: '600px' }}>
                 {/* Remote video toggle logic would require signaling camera status. 
                     For now, we just show video if track is enabled. 
                     If remote turns off camera, we might see black or frozen frame.
                     Ideally we listen for track mute/unmute events. 
                 */}
                <StyledVideo playsInline ref={userVideo} autoPlay />
                <span style={{ position: 'absolute', bottom: 10, left: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: 4 }}>{otherUserName || 'Remote'}</span>
            </div>
        ) : (
             /* Show Remote Avatar while calling/connecting */
             <div style={{ position: 'relative', margin: '10px', width: '100%', maxWidth: '600px' }}>
                 <div style={{ width: '100%', height: '0', paddingBottom: '75%', background: 'rgba(255,255,255,0.1)', position: 'relative', borderRadius: '8px' }}>
                     <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Avatar user={{ username: otherUserName }} size="80px" />
                        <div style={{ color: 'white', marginTop: '10px', fontWeight: 'bold' }}>{otherUserName}</div>
                     </div>
                 </div>
             </div>
        )}
      </VideoContainer>

      {(callAccepted || isCaller) && (
      <Controls>
        <ControlButton onClick={toggleMic} title={micOn ? "Mute Mic" : "Unmute Mic"}>
            {micOn ? <MdMic /> : <MdMicOff />}
        </ControlButton>
        
        {callType === 'video' && (
            <ControlButton onClick={toggleCamera} title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}>
                {cameraOn ? <MdVideocam /> : <MdVideocamOff />}
            </ControlButton>
        )}

        <ControlButton onClick={toggleSpeaker} title={isMutedSpeaker ? "Unmute Speaker" : "Mute Speaker"}>
             {isMutedSpeaker ? <MdVolumeOff /> : <MdVolumeUp />}
        </ControlButton>

        {callType === 'video' && (
            <ControlButton onClick={switchCamera} title="Switch Camera">
                <MdFlipCameraIos />
            </ControlButton>
        )}

        <ControlButton onClick={toggleHold} title={isOnHold ? "Resume Call" : "Hold Call"}>
             {isOnHold ? <MdPlayArrow /> : <MdPause />}
        </ControlButton>

        <ControlButton danger onClick={leaveCall} title="End Call">
            <MdCallEnd />
        </ControlButton>
      </Controls>
      )}
    </Overlay>
  );
};

export default VideoCall;
