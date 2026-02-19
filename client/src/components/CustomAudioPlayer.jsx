import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';

const PlayerContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 8px;
  min-width: 200px;
  width: 100%;
  gap: 8px;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PlayButton = styled.button`
  background: ${({ theme }) => theme.primary};
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: transform 0.1s;
  
  &:hover {
    filter: brightness(1.1);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    display: block !important;
    fill: #ffffff !important;
    color: #ffffff !important;
    width: 24px;
    height: 24px;
    stroke: none !important;
  }
`;

const ProgressBarContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
  height: 6px; /* Thicker for easier interaction */
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
  margin: 0 5px;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: #fff;
  border-radius: 3px;
  width: ${props => props.width}%;
  position: relative;
  transition: width 0.1s linear;
  
  &::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`;

const TimeDisplay = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

const SpeedControl = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
  
  &::-webkit-scrollbar {
    height: 0px;
  }
`;

const SpeedButton = styled.button`
  background: ${props => props.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)'};
  color: ${props => props.active ? '#333' : '#fff'};
  border: none;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  
  &:hover {
    background: rgba(255,255,255,0.5);
  }
`;

const CustomAudioPlayer = ({ src, fileName }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
      // Fallback for duration if not set initially
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
          setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    // Attempt to load duration immediately
    if (audio.readyState >= 1) {
        setAudioData();
    }

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('durationchange', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        // alert("Audio failed to load"); 
    });

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('durationchange', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
          playPromise.catch(error => {
              console.error("Playback failed:", error);
              // Handle NotSupportedError (format not supported)
              if (error.name === 'NotSupportedError') {
                  alert('Audio format not supported by your browser');
              }
          });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percent = x / width;
    const newTime = percent * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <PlayerContainer onClick={e => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="auto" />
      
      <ControlsRow>
        <PlayButton onClick={togglePlay}>
            {isPlaying ? <FaPause size={24} color="white" /> : <FaPlay size={24} color="white" />}
          </PlayButton>
        
        <ProgressBarContainer onClick={handleSeek}>
          <ProgressBarFill width={(currentTime / (duration || 1)) * 100} />
        </ProgressBarContainer>
        
        <TimeDisplay>
          {formatTime(currentTime)}
        </TimeDisplay>
      </ControlsRow>

      <SpeedControl>
        {[0.5, 1.0, 1.5, 2.0, 2.5].map(speed => (
          <SpeedButton 
            key={speed} 
            active={playbackRate === speed}
            onClick={() => handleSpeedChange(speed)}
          >
            {speed}x
          </SpeedButton>
        ))}
      </SpeedControl>
    </PlayerContainer>
  );
};

export default CustomAudioPlayer;
