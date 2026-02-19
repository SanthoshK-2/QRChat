import React, { useContext } from 'react';
import CallContext from '../context/CallContext';
import VideoCall from './VideoCall';

const CallManager = () => {
    const { 
        callState, 
        callType, 
        otherUser, 
        signalData, 
        isCaller, 
        resetCall 
    } = useContext(CallContext);

    if (callState === 'idle') return null;

    // Prepare data for VideoCall component
    const incomingCallData = !isCaller ? {
        signal: signalData,
        from: otherUser?.id,
        type: callType
    } : null;

    return (
        <VideoCall
            otherUserId={otherUser?.id}
            otherUserName={otherUser?.username}
            isCaller={isCaller}
            callType={callType}
            incomingCallData={incomingCallData}
            onClose={resetCall}
        />
    );
};

export default CallManager;
