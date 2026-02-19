import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import SocketContext from './SocketContext';
import AuthContext from './AuthContext';

const CallContext = createContext();

export const CallProvider = ({ children }) => {
    const { socket } = useContext(SocketContext);
    const { user } = useContext(AuthContext);

    const [callState, setCallState] = useState('idle'); // idle, incoming, outgoing, connected
    const [callType, setCallType] = useState(null); // audio, video
    const [otherUser, setOtherUser] = useState(null); // { id, username, ... }
    const [signalData, setSignalData] = useState(null);
    const [isCaller, setIsCaller] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data) => {
            // data: { from, name, signal, type }
            if (callState !== 'idle') {
                // Already in a call, maybe auto-reject or show busy?
                // For now, ignore or log
                console.log("Incoming call ignored (busy)");
                return;
            }

            setOtherUser({ id: data.from, username: data.name });
            setSignalData(data.signal);
            setCallType(data.type);
            setIsCaller(false);
            setCallState('incoming');
        };

        const handleEndCall = () => {
            resetCall();
        };

        socket.on('call_user', handleIncomingCall);
        socket.on('end_call', handleEndCall);

        return () => {
            socket.off('call_user', handleIncomingCall);
            socket.off('end_call', handleEndCall);
        };
    }, [socket, callState]);

    const startCall = (targetUser, type) => {
        setOtherUser(targetUser);
        setCallType(type);
        setIsCaller(true);
        setCallState('outgoing');
    };

    const endCall = () => {
        if (socket && otherUser) {
            socket.emit('end_call', { to: otherUser.id });
        }
        resetCall();
    };

    const resetCall = () => {
        setCallState('idle');
        setCallType(null);
        setOtherUser(null);
        setSignalData(null);
        setIsCaller(false);
    };

    return (
        <CallContext.Provider value={{
            callState,
            callType,
            otherUser,
            signalData,
            isCaller,
            startCall,
            endCall,
            resetCall,
            setCallState // Exposed for VideoCall to update state (e.g. to 'connected')
        }}>
            {children}
        </CallContext.Provider>
    );
};

export default CallContext;
