import React, { useContext, Suspense, lazy } from 'react';
import CallContext from '../context/CallContext';

// Lazy load VideoCall to prevent simple-peer initialization from crashing the app on startup
const VideoCall = lazy(() => import('./VideoCall'));

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
        <Suspense fallback={null}>
            <VideoCall
                otherUserId={otherUser?.id}
                otherUserName={otherUser?.username}
                isCaller={isCaller}
                callType={callType}
                incomingCallData={incomingCallData}
                onClose={resetCall}
            />
        </Suspense>
    );
};

export default CallManager;
