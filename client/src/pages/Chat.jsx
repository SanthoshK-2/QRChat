import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import SocketContext from '../context/SocketContext';
import CallContext from '../context/CallContext';
import api from '../utils/api';
import styled, { useTheme } from 'styled-components';
import { FaArrowLeft, FaPaperPlane, FaPaperclip, FaVideo, FaPhone, FaCog, FaMicrophone, FaStop, FaUser, FaDownload, FaShare, FaTimes, FaCheck, FaCheckDouble, FaEllipsisV, FaBellSlash, FaBan, FaPause, FaPlay } from 'react-icons/fa';
import CustomAudioPlayer from '../components/CustomAudioPlayer';
import CryptoJS from 'crypto-js';
import { SERVER_URL } from '../config';
import Avatar from '../components/Avatar';

const TickContainer = styled.span`
  margin-left: 8px;
  font-size: 0.75rem;
  display: inline-block;
  vertical-align: text-bottom;
  color: ${props => props.read ? '#00e5ff' : 'rgba(255, 255, 255, 0.6)'};
`;

const pulseAnimation = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: ${({ theme }) => theme.body};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  ${pulseAnimation}
`;

const Header = styled.div`
  background: ${({ theme }) => theme.sectionBackground};
  padding: 1rem;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 2px ${({ theme }) => theme.shadow};
  justify-content: space-between;
  color: ${({ theme }) => theme.text};
  flex-shrink: 0;
  z-index: 10;
`;

const MessageList = styled.div`
  flex: 1;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
`;

const MessageBubble = styled.div`
  max-width: 85%;
  padding: 0.8rem;
  border-radius: 12px;
  margin-bottom: 0.5rem;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  background: ${props => props.isOwn ? props.theme.primary : props.theme.cardBg};
  color: ${props => props.isOwn ? 'white' : props.theme.text};
  box-shadow: 0 1px 2px ${({ theme }) => theme.shadow};
  word-wrap: break-word;

  @media (min-width: 768px) {
    max-width: 60%;
  }
`;

const InputArea = styled.div`
  background: ${({ theme }) => theme.sectionBackground};
  padding: 0.5rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  z-index: 10;
  
  @media (min-width: 768px) {
    padding: 1rem;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 0.8rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 20px;
  margin: 0 0.5rem;
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
  min-width: 0; // Prevent overflow on small screens
`;

const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.primary};
  font-size: 1.2rem;
  padding: 0.5rem;
  
  &:disabled {
    color: ${({ theme }) => theme.secondary};
  }
`;

const ActionButton = styled.button`
    font-size: 0.8rem;
    background: none;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 4px;
    padding: 2px 6px;
    margin-right: 5px;
    cursor: pointer;
    color: ${({ theme }) => theme.text};
    
    &:hover {
        background: ${({ theme }) => theme.hover};
    }
`;

const Chat = () => {
  const { userId: otherUserId } = useParams();
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const { startCall: startGlobalCall } = useContext(CallContext);
  const theme = useTheme();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const scrollRef = useRef();
  const fileInputRef = useRef();
  // Call state moved to Global Context
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordChunks, setRecordChunks] = useState([]);
  const chunksRef = useRef([]); // Use ref to avoid stale closure in onstop
  const [otherUser, setOtherUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0); // Timer state
  const recordingTimerRef = useRef(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [messageToShare, setMessageToShare] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
      const fetchStatus = async () => {
          if (!otherUserId) return;
          try {
              const res = await api.get(`/connections/status/${otherUserId}`);
              setIsBlocked(res.data.isBlocked);
              setIsBlockedByPartner(res.data.isBlockedByPartner);
              setIsMuted(res.data.isMuted);
          } catch (e) { console.error(e); }
      };
      fetchStatus();
  }, [otherUserId]);

  const handleBlock = async () => {
      try {
          if (isBlocked) {
              await api.post('/connections/unblock', { userId: otherUserId });
              setIsBlocked(false);
              alert('User unblocked');
          } else {
              if (window.confirm('Block this user?')) {
                  await api.post('/connections/block', { userId: otherUserId });
              setIsBlocked(true);
              // Immediately hide online status
              setOtherUser(prev => prev ? { ...prev, isOnline: false, lastSeen: null } : prev);
              alert('User blocked');
              }
          }
          setMenuOpen(false);
      } catch (e) { alert('Error updating block status'); }
  };

  const handleMute = async (duration = null) => {
      try {
          if (isMuted && !duration) {
              await api.post('/connections/unmute', { userId: otherUserId });
              setIsMuted(false);
          } else {
              await api.post('/connections/mute', { userId: otherUserId, duration });
              setIsMuted(true);
          }
          setMenuOpen(false);
          setShowMuteOptions(false);
      } catch (e) { alert('Error updating mute status'); }
  };

  useEffect(() => {
      const fetchOtherUser = async () => {
          try {
              // Fixed endpoint: /auth/user/:id (was /auth/users/:id)
              const res = await api.get(`/auth/user/${otherUserId}`);
              setOtherUser(res.data);
          } catch (e) {
              console.error("Failed to fetch user", e);
          }
      };
      if (otherUserId) fetchOtherUser();
  }, [otherUserId]);

  useEffect(() => {
    if (forwardModalOpen) {
        const fetchConnections = async () => {
            try {
                const res = await api.get('/connections');
                // Server returns formatted objects with { user, lastMessage, ... }
                const users = res.data.map(item => item.user).filter(u => u);
                setConnectedUsers(users);
            } catch (e) { console.error(e); }
        };
        fetchConnections();
    }
  }, [forwardModalOpen]);

  // E2EE Helper
  const getSecretKey = (partnerId = otherUserId) => {
      if (!user || !partnerId) return 'default-secret';
      // Sort UUIDs as strings to ensure consistent key regardless of who is sender/receiver
      const participants = [user.id, partnerId].sort();
      return participants.join('-');
  };

  const encryptMessage = (text, partnerId = otherUserId) => {
      return CryptoJS.AES.encrypt(text, getSecretKey(partnerId)).toString();
  };

  const decryptMessage = (ciphertext, partnerId = otherUserId) => {
      try {
          // If it's a URL or not encrypted properly, this might fail or return garbage
          // For this demo, we assume all content in DB is encrypted if it's new
          // But for backward compat with older msgs, we might need a check
          if (!ciphertext) return '';
          const bytes = CryptoJS.AES.decrypt(ciphertext, getSecretKey(partnerId));
          const originalText = bytes.toString(CryptoJS.enc.Utf8);
          return originalText || ciphertext; // Fallback if empty (maybe not encrypted)
      } catch (e) {
          return ciphertext;
      }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/chat/${otherUserId}`);
        const decryptedMessages = data
          .filter(msg => !msg.deletedAt)
          .map(msg => ({
            ...msg,
            content: msg.type === 'text' ? decryptMessage(msg.content) : msg.content
          }));
        setMessages(decryptedMessages);

        if (socket && otherUserId) {
            socket.emit('mark_all_read', { senderId: otherUserId, receiverId: user.id });
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchMessages();
  }, [otherUserId, socket, user]);

  useEffect(() => {
    if (socket) {
      // Avoid duplicate listeners
      socket.off('receive_message');
      socket.off('message_sent');
      socket.off('message_updated');
      socket.off('message_deleted');
      socket.off('call_user');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('user_recording');
      socket.off('user_stop_recording');
      socket.off('user_status');

      socket.on('receive_message', (message) => {
        if (message.senderId === otherUserId || message.receiverId === otherUserId) {
          const decryptedContent = message.type === 'text' ? decryptMessage(message.content) : message.content;
          setMessages(prev => [...prev, { ...message, content: decryptedContent }]);
          
          // Mark as read immediately if it's from the current chat partner
          if (message.senderId === otherUserId) {
              socket.emit('message_read', { messageId: message.id, senderId: message.senderId });
          }
        }
      });
      
      socket.on('message_status_update', ({ messageId, status }) => {
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status, isRead: status === 'read' ? true : m.isRead } : m));
      });
      
      socket.on('all_messages_read', ({ receiverId }) => {
          // If the person we are chatting with (otherUserId) read all messages
          // Then all OUR messages (senderId=user.id) should be marked read
          // Wait, the event payload should probably indicate WHO read them. 
          // Server sends: io.to(senderId).emit('all_messages_read', { receiverId });
          // receiverId is the person who read them.
          if (receiverId === otherUserId) {
             setMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, status: 'read', isRead: true } : m));
          }
      });
      
      socket.on('message_sent', (message) => {
          if (message.receiverId === otherUserId) {
               const decryptedContent = message.type === 'text' ? decryptMessage(message.content) : message.content;
               setMessages(prev => [...prev, { ...message, content: decryptedContent }]);
          }
      });
      
      socket.on('message_updated', (updatedMessage) => {
        if (updatedMessage.senderId === user.id || updatedMessage.receiverId === user.id) {
          const decryptedContent = updatedMessage.type === 'text' ? decryptMessage(updatedMessage.content) : updatedMessage.content;
          setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...updatedMessage, content: decryptedContent } : m));
        }
      });
      
      socket.on('message_deleted', (messageId) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      });
      
      // call_user listener moved to CallContext
      
      socket.on('user_typing', ({ senderId }) => {
          if (senderId === otherUserId) setIsTyping(true);
      });

      socket.on('user_stop_typing', ({ senderId }) => {
          if (senderId === otherUserId) setIsTyping(false);
      });

      socket.on('user_recording', ({ senderId }) => {
          if (senderId === otherUserId) setIsRecording(true);
      });

      socket.on('user_stop_recording', ({ senderId }) => {
          if (senderId === otherUserId) setIsRecording(false);
      });

      socket.on('user_status', ({ userId, isOnline }) => {
          if (userId === otherUserId) {
              setOtherUser(prev => prev ? { ...prev, isOnline } : prev);
          }
      });
      
      socket.on('blocking_update', ({ type, blockerId, blockedId }) => {
          if (blockerId === otherUserId && blockedId === user.id) {
              // I was blocked/unblocked by them
              if (type === 'block') {
                  setIsBlockedByPartner(true);
                  // Hide their status immediately
                  setOtherUser(prev => prev ? { ...prev, isOnline: false, lastSeen: null } : prev);
              } else {
                  setIsBlockedByPartner(false);
                  // Optionally refetch status or wait for next update
                  // But we can assume they might be online if they just unblocked us
              }
          } else if (blockerId === user.id && blockedId === otherUserId) {
              // I blocked/unblocked them (e.g. from another device)
              if (type === 'block') {
                  setIsBlocked(true);
                  setOtherUser(prev => prev ? { ...prev, isOnline: false, lastSeen: null } : prev);
              } else {
                  setIsBlocked(false);
              }
          }
      });

      return () => {
        socket.off('receive_message');
        socket.off('message_sent');
        socket.off('message_updated');
        socket.off('message_deleted');
        // socket.off('call_user'); // Handled globally
        socket.off('user_typing');
        socket.off('user_stop_typing');
        socket.off('user_recording');
        socket.off('user_stop_recording');
        socket.off('user_status');
        socket.off('message_status_update');
        socket.off('all_messages_read');
        socket.off('blocking_update');
      };
    }
  }, [socket, otherUserId, user.id]);
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isRecording]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && otherUserId) {
        socket.emit('typing', { receiverId: otherUserId });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { receiverId: otherUserId });
        }, 2000);
    }
  };

  const handleSend = async () => {
    if (isBlocked || isBlockedByPartner) {
        alert("You cannot send messages to this user.");
        return;
    }
    if ((!newMessage.trim() && !file) || !socket) return;
    
    // Stop typing indicator immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', { receiverId: otherUserId });

    let messageData = {
      senderId: user.id,
      receiverId: otherUserId,
      content: newMessage, // Will be encrypted
      type: 'text',
      fileName: null,
      fileUrl: null
    };

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const { data } = await api.post('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        messageData.type = data.type;
        messageData.fileName = data.fileName;
        messageData.fileUrl = data.fileUrl;
        messageData.content = data.fileName; // For files, we send filename as content
      } catch (error) {
        console.error('Upload failed', error);
        return;
      }
    } else {
        // Encrypt text message
        messageData.content = encryptMessage(newMessage);
    }

    socket.emit('send_message', messageData);
    
    setNewMessage('');
    setFile(null);
  };

  const getSupportedMimeType = () => {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4', // Safari
        '' // Fallback
    ];
    for (const type of types) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      
      setRecorder(mediaRecorder);
      setRecordChunks([]);
      chunksRef.current = []; // Clear chunks ref
      
      if (socket && otherUserId) {
          socket.emit('recording_audio', { receiverId: otherUserId });
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            setRecordChunks((prev) => [...prev, e.data]);
            chunksRef.current.push(e.data); // Store in ref
        }
      };
      mediaRecorder.onstop = async () => {
        // Use chunksRef.current to get the latest chunks
        if (chunksRef.current.length === 0) {
            console.error("No audio chunks recorded");
            setRecording(false);
            return;
        }
        
        // Re-determine mime type for Blob creation
        const blobMimeType = mimeType || 'audio/webm'; 
        const blob = new Blob(chunksRef.current, { type: blobMimeType });
        
        if (blob.size === 0) {
             console.error("Audio blob is empty");
             setRecording(false);
             return;
        }
        
        // Determine extension
        let ext = 'webm';
        if (blobMimeType.includes('mp4')) ext = 'mp4';
        if (blobMimeType.includes('ogg')) ext = 'ogg';

        const fileObj = new File([blob], `voice_${Date.now()}.${ext}`, { type: blobMimeType });
        
        const formData = new FormData();
        formData.append('file', fileObj);
        try {
          const { data } = await api.post('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          socket.emit('send_message', {
            senderId: user.id,
            receiverId: otherUserId,
            content: data.fileName,
            type: data.type,
            fileName: data.fileName,
            fileUrl: data.fileUrl
          });
        } catch (e) {
          console.error(e);
        }
        setRecording(false);
        if (socket && otherUserId) {
            socket.emit('stop_recording_audio', { receiverId: otherUserId });
        }
      };
      mediaRecorder.start();
      setRecording(true);
      setIsPaused(false);
      
      // Start Timer
      setRecordingDuration(0);
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (e) {
      alert('Microphone permission required for voice messages');
    }
  };

  const pauseRecording = () => {
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      setIsPaused(true);
      clearInterval(recordingTimerRef.current); // Stop timer
    }
  };

  const resumeRecording = () => {
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      setIsPaused(false);
      // Resume Timer
      recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach(t => t.stop());
      setIsPaused(false);
      clearInterval(recordingTimerRef.current); // Stop timer
    }
  };

  // Helper to format duration
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const canEdit = (msg) => {
    if (msg.senderId !== user.id) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return new Date() - new Date(msg.createdAt) <= fiveMinutes;
  };

  const editTextMessage = async (msg) => {
    const updated = window.prompt('Edit message', msg.content);
    if (updated == null) return;
    try {
      const payload = { content: encryptMessage(updated) };
      const { data } = await api.put(`/chat/${msg.id}`, payload);
      if (socket) socket.emit('edit_message', data);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: updated, isEdited: true } : m));
    } catch (e) {
      alert('Edit failed');
    }
  };

  const replaceFileMessage = async (msg) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const formData = new FormData();
      formData.append('file', f);
      try {
        const { data } = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const payload = { type: data.type, fileName: data.fileName, fileUrl: data.fileUrl, content: data.fileName };
        const { data: updated } = await api.put(`/chat/${msg.id}`, payload);
        if (socket) socket.emit('edit_message', updated);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, type: data.type, fileName: data.fileName, fileUrl: data.fileUrl, content: data.fileName, isEdited: true } : m));
      } catch (err) {
        alert('Replace failed');
      }
    };
    input.click();
  };
  
  const deleteOwnMessage = async (msg) => {
    try {
      await api.delete(`/chat/${msg.id}`);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      if (socket) {
        socket.emit('delete_message', { messageId: msg.id, senderId: msg.senderId, receiverId: msg.receiverId });
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const downloadFile = async (url, filename) => {
      try {
          const response = await fetch(`${SERVER_URL}${url}`);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
          console.error('Download failed', e);
      }
  };

  const shareMessage = (msg) => {
      setMessageToShare(msg);
      setForwardModalOpen(true);
      setSelectedMessageId(null);
  };

  const handleForward = async (targetUserId) => {
    if (!messageToShare || !socket) return;
    
    let contentToSend = messageToShare.content;
    if (messageToShare.type === 'text') {
        contentToSend = encryptMessage(messageToShare.content, targetUserId);
    }

    const messageData = {
        senderId: user.id,
        receiverId: targetUserId,
        content: contentToSend,
        type: messageToShare.type,
        fileName: messageToShare.fileName,
        fileUrl: messageToShare.fileUrl
    };

    socket.emit('send_message', messageData);
    alert('Message forwarded!');
    setForwardModalOpen(false);
    setMessageToShare(null);
  };

  const startCall = (type) => {
      startGlobalCall({ id: otherUserId, username: otherUser?.username || 'Unknown' }, type);
  };

  return (
    <Container>
      
      <Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <FaArrowLeft onClick={() => navigate('/')} style={{ cursor: 'pointer', marginRight: '1rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
                {otherUser && <Avatar user={otherUser} size="40px" />}
                <div>
                    <h3 style={{ margin: 0, color: theme.text, display: 'flex', alignItems: 'center' }}>
                        {otherUser ? otherUser.username : 'Loading...'}
                        {isMuted && <FaBellSlash size={16} color="red" style={{ marginLeft: 8 }} title="Muted" />}
                        {(isBlocked || isBlockedByPartner) && <FaBan size={16} color="red" style={{ marginLeft: 8 }} title={isBlocked ? "You blocked this user" : "You are blocked"} />}
                    </h3>
                    {otherUser && (
                        <div style={{ fontSize: '0.8rem', color: isTyping || isRecording ? theme.primary : theme.subText, fontWeight: isTyping || isRecording ? 'bold' : 'normal' }}>
                            {isTyping ? 'Typing...' : isRecording ? 'Record Audio...' : otherUser.isOnline ? 'Online' : 'Offline'}
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => startCall('audio')}><FaPhone /></IconButton>
            <IconButton onClick={() => startCall('video')}><FaVideo /></IconButton>
            <div style={{ position: 'relative' }}>
                <IconButton onClick={() => { setMenuOpen(!menuOpen); setShowMuteOptions(false); }}><FaEllipsisV /></IconButton>
                {menuOpen && (
                    <>
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setMenuOpen(false)} />
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            background: theme.cardBg,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            zIndex: 100,
                            minWidth: '160px',
                            border: `1px solid ${theme.border}`
                        }}>
                            {!showMuteOptions ? (
                                <>
                                    <div 
                                        onClick={() => isMuted ? handleMute() : setShowMuteOptions(true)} 
                                        style={{ padding: '10px 12px', cursor: 'pointer', color: theme.text, display: 'flex', alignItems: 'center' }}
                                    >
                                        {isMuted ? 'Unmute Messages' : 'Mute Messages'}
                                    </div>
                                    <div onClick={handleBlock} style={{ padding: '10px 12px', cursor: 'pointer', color: isBlocked ? theme.text : '#ff4d4f', display: 'flex', alignItems: 'center' }}>
                                        {isBlocked ? 'Unblock' : 'Block'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ padding: '5px 12px', fontSize: '0.8rem', color: theme.subText, fontWeight: 'bold' }}>Mute for...</div>
                                    <div onClick={() => handleMute('1_hour')} style={{ padding: '8px 12px', cursor: 'pointer', color: theme.text }}>1 Hour</div>
                                    <div onClick={() => handleMute('1_day')} style={{ padding: '8px 12px', cursor: 'pointer', color: theme.text }}>1 Day</div>
                                    <div onClick={() => handleMute('1_week')} style={{ padding: '8px 12px', cursor: 'pointer', color: theme.text }}>1 Week</div>
                                    <div onClick={() => handleMute('1_month')} style={{ padding: '8px 12px', cursor: 'pointer', color: theme.text }}>1 Month</div>
                                    <div onClick={() => setShowMuteOptions(false)} style={{ padding: '8px 12px', cursor: 'pointer', color: theme.subText, borderTop: `1px solid ${theme.border}`, marginTop: '5px' }}>Cancel</div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
      </Header>

      <MessageList>
        {messages.map((msg, index) => (
          <MessageBubble 
            key={index} 
            isOwn={msg.senderId === user.id}
            onClick={() => {
                // Allow selection for ALL messages to enable Share/Download
                setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            {msg.type === 'text' && (
                <div>
                    {msg.content}
                    {msg.isEdited && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', marginLeft: '5px', fontStyle: 'italic' }}>(Edited)</span>}
                </div>
            )}
            {msg.type === 'image' && (
                <div style={{position:'relative'}}>
                    <img src={`${SERVER_URL}${msg.fileUrl}`} alt="shared" style={{ maxWidth: '100%', borderRadius: 8 }} />
                    <div style={{position:'absolute', bottom:5, right:5, background:'rgba(0,0,0,0.5)', borderRadius:'50%', padding:5, cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); downloadFile(msg.fileUrl, msg.fileName); }}>
                        <FaDownload color="white" size={12}/>
                    </div>
                </div>
            )}
            {msg.type === 'file' && <a href={`${SERVER_URL}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{color: 'inherit'}}>{msg.fileName}</a>}
            {msg.type === 'audio' && (
                <div style={{ width: '100%', minWidth: '250px' }}>
                    <CustomAudioPlayer src={`${SERVER_URL}${msg.fileUrl}`} fileName={msg.fileName} />
                </div>
            )}
            {msg.type === 'video' && (
                <div style={{position:'relative'}}>
                    <video controls src={`${SERVER_URL}${msg.fileUrl}`} style={{ maxWidth: '100%', borderRadius: 8 }} />
                </div>
            )}
            
            {/* Action Bar for Selected Message */}
            {selectedMessageId === msg.id && (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)', padding: '4px', borderRadius: '4px' }}>
                <ActionButton onClick={(e) => { e.stopPropagation(); shareMessage(msg); }} title="Share"><FaShare/></ActionButton>
                {(msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'file') && (
                     <ActionButton onClick={(e) => { e.stopPropagation(); downloadFile(msg.fileUrl, msg.fileName); }} title="Download"><FaDownload/></ActionButton>
                )}
                {canEdit(msg) && (
                    <>
                        {msg.type === 'text' ? (
                        <ActionButton onClick={(e) => { e.stopPropagation(); editTextMessage(msg); }}>Edit</ActionButton>
                        ) : (
                        <ActionButton onClick={(e) => { e.stopPropagation(); replaceFileMessage(msg); }}>Replace</ActionButton>
                        )}
                        <ActionButton onClick={(e) => { e.stopPropagation(); deleteOwnMessage(msg); }} style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}>Delete</ActionButton>
                    </>
                )}
              </div>
            )}
            {/* Metadata: Time + Ticks */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                    {new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.senderId === user.id && (
                    <TickContainer read={msg.status === 'read' || msg.isRead}>
                        {msg.status === 'read' || msg.isRead ? <FaCheckDouble /> : 
                         msg.status === 'delivered' ? <FaCheckDouble /> : <FaCheck />}
                    </TickContainer>
                )}
            </div>
          </MessageBubble>
        ))}
        {isTyping && <div style={{ fontSize: '0.8rem', color: theme.subText, marginLeft: '1rem' }}>Typing...</div>}
        <div ref={scrollRef} />
      </MessageList>

      <InputArea>
        <IconButton onClick={() => fileInputRef.current.click()} disabled={isBlocked || isBlockedByPartner}>
            <FaPaperclip />
        </IconButton>
        <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => setFile(e.target.files[0])} 
            disabled={isBlocked || isBlockedByPartner}
        />
        {file && <span style={{ fontSize: '0.8rem', marginRight: '0.5rem', color: theme.text }}>{file.name}</span>}
        <Input 
            placeholder={isBlocked ? "You blocked this user" : isBlockedByPartner ? "You have been blocked" : "Type a secure message..."} 
            value={newMessage} 
            onChange={handleTyping} 
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isBlocked || isBlockedByPartner}
        />
        {!recording ? (
            <IconButton onClick={startRecording} title="Record voice" disabled={isBlocked || isBlockedByPartner}>
                <FaMicrophone />
            </IconButton>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <span style={{ fontSize: '0.8rem', color: 'red', marginRight: 5, animation: isPaused ? 'none' : 'pulse 1s infinite', minWidth: '60px' }}>
                {isPaused ? 'Paused' : 'Recording...'}
             </span>
             <span style={{ fontSize: '0.8rem', color: theme.text, marginRight: 10, fontWeight: 'bold' }}>
                {formatDuration(recordingDuration)}
             </span>
             {isPaused ? (
                 <IconButton onClick={resumeRecording} title="Resume" style={{ color: theme.primary }}>
                    <FaPlay size={14} />
                 </IconButton>
             ) : (
                 <IconButton onClick={pauseRecording} title="Pause" style={{ color: theme.text }}>
                    <FaPause size={14} />
                 </IconButton>
             )}
             <IconButton onClick={stopRecording} title="Stop recording" style={{ color: 'red' }} disabled={isBlocked || isBlockedByPartner}>
                <FaStop />
             </IconButton>
          </div>
        )}
        {!recording && (
            <IconButton onClick={handleSend} disabled={(!newMessage.trim() && !file) || isBlocked || isBlockedByPartner}>
                <FaPaperPlane />
            </IconButton>
        )}
      </InputArea>

      {/* Forward Modal */}
      {forwardModalOpen && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
          }}>
              <div style={{
                  background: theme.cardBg,
                  width: '90%',
                  maxWidth: '400px',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '80vh'
              }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: theme.text }}>Forward to...</h3>
                      <FaTimes onClick={() => setForwardModalOpen(false)} style={{ cursor: 'pointer', color: theme.text }} />
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                      {connectedUsers.map(u => (
                          <div key={u.id} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              padding: '0.5rem', 
                              borderBottom: `1px solid ${theme.border}`,
                              justifyContent: 'space-between'
                          }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <Avatar user={u} size="32px" />
                                  <span style={{ color: theme.text }}>{u.username}</span>
                              </div>
                              <button 
                                  onClick={() => handleForward(u.id)}
                                  style={{
                                      background: theme.primary,
                                      color: 'white',
                                      border: 'none',
                                      padding: '5px 10px',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                  }}
                              >
                                  Send
                              </button>
                          </div>
                      ))}
                      {connectedUsers.length === 0 && (
                          <div style={{ padding: '1rem', textAlign: 'center', color: theme.subText }}>No connected users found.</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Profile Info Modal */}
      {showProfileModal && otherUser && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowProfileModal(false)}>
            <div style={{
                background: theme.cardBg, width: '90%', maxWidth: '350px',
                borderRadius: '12px', padding: '20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative',
                color: theme.text,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }} onClick={e => e.stopPropagation()}>
                <FaTimes style={{ position: 'absolute', top: 15, right: 15, cursor: 'pointer' }} onClick={() => setShowProfileModal(false)} />
                <Avatar user={otherUser} size="100px" style={{ marginBottom: '15px', border: `3px solid ${theme.primary}` }} />
                <h2 style={{ margin: '0 0 5px 0' }}>{otherUser.username}</h2>
                <div style={{ color: otherUser.isOnline ? '#00e676' : '#999', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: otherUser.isOnline ? '#00e676' : '#999' }}></div>
                    {otherUser.isOnline ? 'Online' : 'Offline'}
                </div>
                
                <div style={{ width: '100%', textAlign: 'left', background: theme.body, padding: '15px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: theme.subText, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>About</h4>
                    <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {otherUser.bio || "No description provided."}
                    </p>
                </div>
            </div>
        </div>
      )}
    </Container>
  );
};

export default Chat;
