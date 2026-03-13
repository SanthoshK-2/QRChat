import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import SocketContext from '../context/SocketContext';
import { SERVER_URL } from '../config';
import api from '../utils/api';
import QRScanner from '../components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import styled, { useTheme } from 'styled-components';
import { FaQrcode, FaSearch, FaUser, FaSignOutAlt, FaCog, FaBell, FaCheck, FaImage, FaFile, FaMicrophone, FaVideo, FaArrowLeft, FaTrash, FaPhone, FaPhoneSlash, FaComments } from 'react-icons/fa';
import CryptoJS from 'crypto-js';
import Avatar from '../components/Avatar';
import Chat from './Chat';

const Container = styled.div`
  width: 100%;
  max-width: ${props => props.isDesktop ? '100%' : '800px'};
  margin: 0 auto;
  padding: 0;
  background-color: #1a1d21;
  min-height: 100vh;
  color: white;
  display: flex;
  flex-direction: column;
  padding-bottom: ${props => props.isDesktop ? '0' : '70px'}; // Space for bottom tabs on mobile
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1rem;
  background: #1a1d21;
`;

const Title = styled.h2`
  color: #1890ff;
  margin: 0;
  font-size: 1.25rem; // Reduced slightly for better fit
  font-weight: 800;
  letter-spacing: -0.5px;
  white-space: nowrap;
  flex-shrink: 0;
  
  @media (min-width: 768px) {
    font-size: 1.4rem;
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  font-size: 1.4rem;
  color: #8e9297;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  padding: 0.5rem;
  flex-shrink: 0;
  &:hover { color: #1890ff; }
`;

const Section = styled.div`
  background: #22262b;
  padding: 2.5rem 1.5rem;
  border-radius: 20px;
  margin: 0 1rem 1.5rem 1rem;
  color: white;
  flex: 1;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  
  @media (max-width: 768px) {
    margin: 0 0.5rem 1rem 0.5rem;
    padding: 2rem 1rem;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.9rem;
  margin-top: 1rem;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover {
    opacity: 0.95;
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;

const UserList = styled.ul`
  list-style: none;
  padding: 0;
`;

const UserItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem;
  border-bottom: 1px solid #333;
  cursor: pointer;
  color: white;
  transition: background 0.2s;
  &:hover { background-color: #2b2f35; }
`;

const ConnectionCode = styled.div`
  text-align: center;
  margin: 0.75rem 0;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 2px;
  color: white;
`;

const Sidebar = styled.div`
  width: 100%;
`;

const Tabs = styled.div`
  display: flex;
  background: #1a1d21;
  border-bottom: 1px solid #333;
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
  
  @media (max-width: 768px) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    margin-bottom: 0;
    border-bottom: none;
    border-top: 1px solid #333;
    z-index: 1000;
    padding: 0;
    background: #1a1d21;
  }
`;

const Tab = styled.div`
  padding: 1.25rem 0.5rem;
  cursor: pointer;
  border-bottom: 3px solid ${props => props.active ? '#1890ff' : 'transparent'};
  color: ${props => props.active ? '#1890ff' : '#8e9297'};
  font-weight: ${props => props.active ? '700' : '500'};
  flex: 1;
  text-align: center;
  font-size: 0.95rem;
  transition: all 0.2s;
  
  &:hover {
    color: #1890ff;
  }

  @media (max-width: 768px) {
    padding: 1rem 0.25rem;
    border-bottom: none;
    border-top: 3px solid ${props => props.active ? '#1890ff' : 'transparent'};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.9rem;
  border: 2px solid #333;
  border-radius: 12px;
  margin-bottom: 1rem;
  background: #2b2f35;
  color: white;
  outline: none;
  font-size: 1rem;
  transition: border-color 0.2s;
  &:focus { border-color: #1890ff; }
`;

const NotificationWrapper = styled.div`
  position: relative;
  display: inline-block;
  z-index: 1200; /* Keep above header on mobile */
`;

const NotificationBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.25);
  z-index: 2000;
`;

const NotificationDropdown = styled.div`
  position: absolute;
  top: 110%;
  right: 0;
  width: 320px;
  max-width: 92vw;
  background: #22262b;
  border: 1px solid #333;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 2001;
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.75rem;
  
  @media (max-width: 768px) {
    width: 300px;
    max-width: 95vw;
    right: -10px;
  }
  
  @media (max-width: 480px) {
    position: fixed;
    top: 60px;
    left: 10px;
    right: 10px;
    width: auto;
    max-width: none;
    transform: none;
  }
`;

const NotificationItem = styled.div`
  padding: 0.8rem;
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: #2b2f35;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: red;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: bold;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 5px;
`;

const Dashboard = () => {
  const { user, logout, updateProfile } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chats');
  const [callHistory, setCallHistory] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [connectCode, setConnectCode] = useState('');
  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const isMobileDevice = typeof window !== 'undefined' ? /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) : false;
  const [desktopSite, setDesktopSite] = useState(() => {
    try { 
        const saved = localStorage.getItem('desktopSite');
        if (saved !== null) return saved === 'true';
        return !isMobileDevice; // Default to desktop UI on desktop devices, mobile UI on mobile devices
    } catch { return true; }
  });
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatFilter, setChatFilter] = useState('all');

  const isDesktopMode = desktopSite;
  const isMobile = !desktopSite; // For UI components that check isMobile explicitly
  useEffect(() => { try { localStorage.setItem('desktopSite', desktopSite ? 'true' : 'false'); } catch {} }, [desktopSite]);

  useEffect(() => {
    if (!socket) return;
    const handleIncomingRequest = () => {
      api.get('/connections/pending').then(res => setRequests(res.data)).catch(() => {});
    };
    const handleAccepted = () => {
      api.get('/connections').then(res => setChats(res.data)).catch(() => {});
      api.get('/connections/pending').then(res => setRequests(res.data)).catch(() => {});
    };
    socket.on('connection_request', handleIncomingRequest);
    socket.on('connection_accepted', handleAccepted);
    return () => {
      socket?.off('connection_request', handleIncomingRequest);
      socket?.off('connection_accepted', handleAccepted);
    };
  }, [socket]);

  useEffect(() => {
    let timer = null;
    if (showUserSearch && searchQuery.trim().length > 0) {
      setIsSearching(true);
      timer = setTimeout(async () => {
        try {
          const res = await api.get('/auth/search?query=' + encodeURIComponent(searchQuery.trim()));
          setSearchResults(Array.isArray(res.data) ? res.data : []);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [showUserSearch, searchQuery]);

  // E2EE Helper (Duplicated from Chat.jsx, ideally move to util)
  const getSecretKey = (user1Id, user2Id) => {
      const participants = [user1Id, user2Id].sort();
      return participants.join('-');
  };

  const decryptMessage = (ciphertext, user1Id, user2Id) => {
      try {
          if (!ciphertext) return '';
          const bytes = CryptoJS.AES.decrypt(ciphertext, getSecretKey(user1Id, user2Id));
          const originalText = bytes.toString(CryptoJS.enc.Utf8);
          return originalText || ciphertext; 
      } catch (e) {
          return ciphertext;
      }
  };

  useEffect(() => {
    // Fetch accepted connections (Chats)
    const fetchChats = async () => {
        try {
            const res = await api.get('/connections');
            setChats(res.data);
        } catch (e) {
            console.error(e);
        }
    };
    
    const fetchRequests = async () => {
        try {
            const res = await api.get('/connections/pending');
            setRequests(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchCallHistory = async () => {
        try {
            const res = await api.get('/calls');
            // Ensure we set the state with the actual array from response
            setCallHistory(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Error fetching call history:', e);
            setCallHistory([]);
        }
    };

    fetchChats();
    fetchRequests();
    fetchCallHistory();

    if (socket) {
        // Ensure initial fetch happens when socket is ready or user changes
        fetchChats();
        
        const handleMessageUpdate = (message) => {
            setChats(prev => {
                const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
                const index = prev.findIndex(c => c.user.id === otherUserId);
                
                if (index > -1) {
                    const updated = [...prev];
                    
                    // Increment unread count if message is from the other user
                    let newUnreadCount = updated[index].unreadCount || 0;
                    if (message.senderId !== user.id) {
                         newUnreadCount += 1;
                    }

                    updated[index] = {
                        ...updated[index],
                        lastMessage: message.content,
                        lastMessageType: message.type,
                        lastMessageAt: message.createdAt,
                        unreadCount: newUnreadCount
                    };
                    // Move to top
                    const item = updated.splice(index, 1)[0];
                    updated.unshift(item);
                    return updated;
                } else {
                    fetchChats(); 
                    return prev;
                }
            });
        };

        const handleCallUpdate = () => {
            fetchCallHistory();
        };

        socket.on('receive_message', handleMessageUpdate);
        socket.on('message_sent', handleMessageUpdate);
        socket.on('call_ended', handleCallUpdate); // Listen for call end to update history

        return () => {
            socket.off('receive_message', handleMessageUpdate);
            socket.off('message_sent', handleMessageUpdate);
            socket.off('call_ended', handleCallUpdate);
        };
    }
  }, [user, socket]); // Add user dependency for decrypt logic if needed

  const handleScan = (data) => {
    if (data) {
        try {
             const parsed = JSON.parse(data);
             if (parsed.id) {
                 navigate(`/chat/${parsed.id}`);
             }
        } catch (e) {
             alert('Invalid QR Code');
        }
        setShowScanner(false);
    }
  };

  const handleConnect = async () => {
      try {
          const res = await api.post('/connections/connect-by-code', { uniqueCode: connectCode });
          navigate(`/chat/${res.data.id}`);
      } catch (e) {
          alert(e.response?.data?.message || 'User not found');
      }
  };

  const handleConnectToUser = async (targetUser) => {
      try {
          const res = await api.post('/connections/request', { targetId: targetUser.id });
          if (res.data?.status === 'accepted') {
              navigate(`/chat/${targetUser.id}`);
          } else {
              alert(res.data?.message || 'Request sent');
          }
      } catch (e) {
          alert(e.response?.data?.message || 'Failed to send request');
      }
  };

  const handleRespond = async (connectionId, status) => {
      try {
          await api.post('/connections/respond', { connectionId, status });
          setRequests(prev => prev.filter(req => req.id !== connectionId));
          // If accepted, maybe refresh chats or show success?
          // alert(`Request ${status}`);
      } catch (e) {
          console.error(e);
          alert('Failed to respond to request');
      }
  };
  
  // Profile Picture Upload Handler
  const handleProfilePicChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('profilePic', file);
      
      try {
          await api.post('/auth/profile-pic', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          // Ideally refresh user context or profile here
          alert('Profile picture updated!');
          window.location.reload(); // Simple reload to reflect changes
      } catch (error) {
          console.error('Error updating profile picture:', error);
          const errorMsg = error.response?.data?.message || error.message || 'Failed to update profile picture.';
          alert(`Profile update failed: ${errorMsg}`);
      }
  };

  const handleDeleteProfilePic = async () => {
      if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
      
      try {
          await api.delete('/auth/profile-pic');
          alert('Profile picture removed');
          window.location.reload();
      } catch (error) {
          console.error('Error removing profile picture:', error);
          alert('Failed to remove profile picture');
      }
  };


  if (isDesktopMode) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: theme.body }}>
        <div style={{ width: 100, borderRight: `1px solid ${theme.border}`, background: theme.sectionBackground, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '24px 8px' }}>
          <div style={{ marginBottom: 10, textAlign: 'center' }}>
            <Title style={{ fontSize: '0.9rem', color: '#1890ff', fontWeight: '900' }}>QR CHAT</Title>
          </div>
          <IconButton title="Chats" onClick={() => setActiveTab('chats')} style={{ color: activeTab === 'chats' ? theme.primary : '#8e9297', fontSize: '1.6rem' }}>
            <FaUser />
          </IconButton>
          <IconButton title="Calls" onClick={() => setActiveTab('calls')} style={{ color: activeTab === 'calls' ? theme.primary : '#8e9297', fontSize: '1.6rem' }}>
            <FaPhone />
          </IconButton>
          <IconButton title="Connect" onClick={() => setActiveTab('connect')} style={{ color: activeTab === 'connect' ? theme.primary : '#8e9297', fontSize: '1.6rem' }}>
            <FaQrcode />
          </IconButton>
          <NotificationWrapper style={{ position: 'relative' }}>
              <IconButton onClick={() => setShowNotifications(!showNotifications)} style={{ color: requests.length > 0 ? theme.primary : '#8e9297', fontSize: '1.6rem' }}>
                  <FaBell />
                  {requests.length > 0 && <Badge>{requests.length}</Badge>}
              </IconButton>
              {showNotifications && (
                  <NotificationDropdown style={{ left: '100%', top: 0, marginLeft: 10, right: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0 }}>Notifications</h4>
                      </div>
                      {requests.length === 0 ? (
                          <p style={{ color: '#8e9297', textAlign: 'center', padding: '1rem 0' }}>No new notifications</p>
                      ) : (
                          requests.map(req => (
                              <NotificationItem key={req.id} style={{ borderBottom: '1px solid #333' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <Avatar user={req.Requester} size="32px" />
                                      <div>
                                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{req.Requester ? req.Requester.username : 'Unknown'}</div>
                                          <div style={{ fontSize: '0.75rem', color: '#8e9297' }}>Wants to connect</div>
                                      </div>
                                  </div>
                                  <ActionButtons>
                                      <Button onClick={() => handleRespond(req.id, 'accepted')} style={{ padding: '5px', fontSize: '0.8rem', background: 'green', marginTop: 0, flex: 1 }}>Accept</Button>
                                      <Button onClick={() => handleRespond(req.id, 'rejected')} style={{ padding: '5px', fontSize: '0.8rem', background: 'red', marginTop: 0, flex: 1 }}>Reject</Button>
                                  </ActionButtons>
                              </NotificationItem>
                          ))
                      )}
                  </NotificationDropdown>
              )}
          </NotificationWrapper>
          <IconButton title="Settings" onClick={() => navigate('/settings')} style={{ fontSize: '1.6rem' }}>
            <FaCog />
          </IconButton>
        </div>
        {activeTab === 'chats' && (
        <div style={{ width: 360, borderRight: `1px solid ${theme.border}`, overflowY: 'auto', background: theme.sectionBackground }}>
          <div style={{ padding: '1rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, color: theme.text }}>Chats</h3>
            <button onClick={() => setDesktopSite(false)} style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: 6, padding: '4px 8px', color: theme.text, fontSize: '0.8rem', cursor: 'pointer' }}>
                Mobile UI
            </button>
          </div>
          <div style={{ padding: '0.75rem' }}>
            <input 
              placeholder="Search connected users" 
              value={chatSearchQuery} 
              onChange={(e) => setChatSearchQuery(e.target.value)} 
              style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 0.75rem 0.75rem' }}>
            <button onClick={() => setChatFilter('all')} style={{ background: chatFilter==='all' ? theme.primary : 'transparent', color: chatFilter==='all' ? 'white' : theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '6px 10px' }}>All</button>
            <button onClick={() => setChatFilter('unread')} style={{ background: chatFilter==='unread' ? theme.primary : 'transparent', color: chatFilter==='unread' ? 'white' : theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '6px 10px' }}>Unread</button>
          </div>
          <div>
            {chats
              .filter(ci => {
                if (!chatSearchQuery.trim()) return true;
                const name = (ci.user?.username || '').toLowerCase();
                return name.includes(chatSearchQuery.trim().toLowerCase());
              })
              .filter(ci => {
                if (chatFilter === 'unread') return (ci.unreadCount || 0) > 0;
                return true;
              })
              .map(chatItem => {
                const chatUser = chatItem.user;
                const lastMsg = chatItem.lastMessage;
                const lastMsgType = chatItem.lastMessageType;
                const lastMsgAt = chatItem.lastMessageAt;
                const unreadCount = chatItem.unreadCount || 0;
                
                let displayMessage = 'Start a conversation';
                if (lastMsg) {
                    if (lastMsgType === 'text') {
                        displayMessage = decryptMessage(lastMsg, user.id, chatUser.id);
                    } else if (lastMsgType === 'image') {
                        displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaImage size={12}/> Image</span>;
                    } else if (lastMsgType === 'audio') {
                        displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaMicrophone size={12}/> Audio</span>;
                    } else if (lastMsgType === 'video') {
                        displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaVideo size={12}/> Video</span>;
                    } else {
                        displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaFile size={12}/> File</span>;
                    }
                }
                return (
                  <div key={chatUser.id} 
                       onClick={() => {
                        setSelectedChatId(chatUser.id);
                        // Reset unread count on click
                        const index = chats.findIndex(c => c.user.id === chatUser.id);
                        if (index > -1) {
                          const newChats = [...chats];
                          newChats[index].unreadCount = 0;
                          setChats(newChats);
                        }
                       }} 
                       style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, background: selectedChatId===chatUser.id ? theme.hover : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                      <Avatar user={chatUser} size="40px" />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 'bold' }}>{chatUser.username}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                {lastMsgAt && <div style={{ fontSize: '0.7rem', color: theme.subText }}>{new Date(lastMsgAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                                {unreadCount > 0 && (
                                    <div style={{ 
                                        background: theme.primary, 
                                        color: 'white', 
                                        borderRadius: '50%', 
                                        minWidth: '20px', 
                                        height: '20px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontSize: '0.7rem', 
                                        fontWeight: 'bold',
                                        marginTop: '4px',
                                        padding: '0 4px'
                                    }}>
                                        {unreadCount}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: theme.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {displayMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        )}
        {activeTab === 'calls' && (
          <div style={{ width: 360, borderRight: `1px solid ${theme.border}`, overflowY: 'auto', background: theme.sectionBackground }}>
            <div style={{ padding: '1rem', borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={{ margin: 0, color: theme.text }}>Call History</h3>
            </div>
            <UserList>
              {callHistory.map(call => {
                const isCaller = call.callerId === user.id;
                const otherUser = isCaller ? call.Receiver : call.Caller;
                const icon = call.type === 'video' ? <FaVideo /> : <FaMicrophone />;
                const statusIcon = call.status === 'missed' ? <FaPhoneSlash color="red"/> : <FaPhone color="green"/>;
                return (
                  <UserItem key={call.id} style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                      <Avatar user={otherUser} size="45px" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{otherUser ? otherUser.username : 'Unknown'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: theme.subText, marginTop: '2px' }}>
                          {statusIcon}
                          <span>{isCaller ? 'Outgoing' : 'Incoming'} {call.type} call</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{new Date(call.createdAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.7rem', color: theme.subText }}>{new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    </div>
                  </UserItem>
                );
              })}
            </UserList>
          </div>
        )}
        {activeTab === 'connect' && (
          <div style={{ width: 360, borderRight: `1px solid ${theme.border}`, overflowY: 'auto', background: theme.sectionBackground, padding: '1rem' }}>
            <h3 style={{ margin: 0, color: theme.text, marginBottom: '1rem' }}>Connect</h3>
            <Button onClick={() => setShowScanner(true)}><FaQrcode /> Scan QR Code</Button>
            <div style={{ margin: '1rem 0', textAlign: 'center', fontWeight: 'bold' }}>OR</div>
            <Input placeholder="Enter Unique Number" value={connectCode} onChange={(e) => setConnectCode(e.target.value)} />
            <Button onClick={handleConnect}><FaSearch /> Connect</Button>
            <div style={{ margin: '1rem 0', textAlign: 'center', fontWeight: 'bold' }}>OR</div>
            <Button onClick={() => setShowUserSearch(s => !s)} style={{ background: theme.secondary }}><FaSearch /> Search Global Users</Button>
            {showUserSearch && (
              <div style={{ marginTop: '1rem' }}>
                <Input placeholder="Search Global Account by Username" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <div style={{ maxHeight: '40vh', overflowY: 'auto', border: `1px solid ${theme.border}`, borderRadius: 8 }}>
                  {isSearching && <p style={{ padding: '0.75rem', color: theme.subText }}>Searching...</p>}
                  {!isSearching && searchResults.length === 0 && searchQuery.trim() !== '' && (
                    <p style={{ padding: '0.75rem', color: theme.subText }}>No global users found</p>
                  )}
                  {searchResults.map(u => (
                    <div key={u.id} onClick={() => handleConnectToUser(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', cursor: 'pointer', borderBottom: `1px solid ${theme.border}` }}>
                      <Avatar user={u} size="34px" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                        <div style={{ fontSize: '0.8rem', color: theme.subText }}>{u.bio || 'Global account'}</div>
                      </div>
                      <span style={{ background: theme.primary, color: 'white', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem' }}>Connect</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.body }}>
          {!selectedChatId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subText }}>
              Select a chat to start messaging
            </div>
          ) : (
            <Chat overrideOtherUserId={selectedChatId} variant="desktop" onBack={() => setSelectedChatId(null)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <Container isDesktop={isDesktopMode}>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            {activeTab !== 'chats' && (
                <IconButton onClick={() => setActiveTab('chats')} style={{ flexShrink: 0, padding: '0.5rem 0.25rem' }}>
                    <FaArrowLeft />
                </IconButton>
            )}
            <Title style={{ flexShrink: 0 }}>QR Chat</Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setDesktopSite(true)} style={{ background: 'none', border: `1px solid #333`, borderRadius: 6, padding: '6px 10px', color: '#8e9297', fontSize: '0.8rem', cursor: 'pointer' }}>
                Desktop site
            </button>
            <NotificationWrapper>
                <IconButton onClick={() => setShowNotifications(!showNotifications)}>
                    <FaBell />
                    {requests.length > 0 && <Badge>{requests.length}</Badge>}
                </IconButton>
                {showNotifications && (
                    <>
                    <NotificationBackdrop onClick={() => setShowNotifications(false)} />
                    <NotificationDropdown style={{ background: '#22262b', borderColor: '#333' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', padding: '0.5rem', borderBottom: `1px solid #333`, color: 'white' }}>Notifications</h4>
                        {requests.length === 0 ? (
                            <p style={{ padding: '1rem', textAlign: 'center', color: '#8e9297' }}>No new notifications</p>
                        ) : (
                            requests.map(req => (
                                <NotificationItem key={req.id} style={{ borderBottom: '1px solid #333' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Avatar user={req.Requester} size="32px" />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{req.Requester ? req.Requester.username : 'Unknown'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#8e9297' }}>Wants to connect</div>
                                        </div>
                                    </div>
                                    <ActionButtons>
                                        <Button onClick={() => handleRespond(req.id, 'accepted')} style={{ padding: '5px', fontSize: '0.8rem', background: 'green', marginTop: 0, flex: 1 }}>Accept</Button>
                                        <Button onClick={() => handleRespond(req.id, 'rejected')} style={{ padding: '5px', fontSize: '0.8rem', background: 'red', marginTop: 0, flex: 1 }}>Reject</Button>
                                    </ActionButtons>
                                </NotificationItem>
                            ))
                        )}
                    </NotificationDropdown>
                    </>
                )}
            </NotificationWrapper>
            <IconButton onClick={() => navigate('/settings')}><FaCog /></IconButton>
        </div>
      </Header>

      <Tabs>
        <Tab active={activeTab === 'chats'} onClick={() => setActiveTab('chats')}>
          {isMobile && <FaComments size={18} />}
          Chat
        </Tab>
        <Tab active={activeTab === 'calls'} onClick={() => setActiveTab('calls')}>
          {isMobile && <FaPhone size={18} />}
          Call
        </Tab>
        <Tab active={activeTab === 'connect'} onClick={() => setActiveTab('connect')}>
          {isMobile && <FaQrcode size={18} />}
          Connect
        </Tab>
        <Tab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
          {isMobile && <FaUser size={18} />}
          Profile
        </Tab>
      </Tabs>

{/* Requests section moved to Notification Dropdown */}

      {activeTab === 'chats' && (
          <Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Connected Users</h3>
              <IconButton onClick={() => setShowChatSearch(s => !s)} title="Search Connected">
                <FaSearch />
              </IconButton>
            </div>
            {showChatSearch && (
              <Input
                placeholder="Search connected users"
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
              />
            )}
            {chats.length === 0 ? (
                <p>No connected users</p>
            ) : (
                <UserList>
                    {chats
                      .filter(ci => {
                        if (!chatSearchQuery.trim()) return true;
                        const name = (ci.user?.username || '').toLowerCase();
                        return name.includes(chatSearchQuery.trim().toLowerCase());
                      })
                      .map(chatItem => {
                        const chatUser = chatItem.user;
                        const lastMsg = chatItem.lastMessage;
                        const lastMsgType = chatItem.lastMessageType;
                        const lastMsgAt = chatItem.lastMessageAt;
                        const unreadCount = chatItem.unreadCount || 0;
                        
                        let displayMessage = 'Start a conversation';
                        if (lastMsg) {
                            if (lastMsgType === 'text') {
                                displayMessage = decryptMessage(lastMsg, user.id, chatUser.id);
                            } else if (lastMsgType === 'image') {
                                displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaImage size={12}/> Image</span>;
                            } else if (lastMsgType === 'audio') {
                                displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaMicrophone size={12}/> Audio</span>;
                            } else if (lastMsgType === 'video') {
                                displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaVideo size={12}/> Video</span>;
                            } else {
                                displayMessage = <span style={{display:'flex', alignItems:'center', gap:5}}><FaFile size={12}/> File</span>;
                            }
                        }

                        return (
                        <UserItem key={chatUser.id} onClick={() => isDesktopMode ? setSelectedChatId(chatUser.id) : navigate(`/chat/${chatUser.id}`)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                <Avatar user={chatUser} size="40px" />
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {chatUser.username}

                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            {lastMsgAt && <div style={{ fontSize: '0.7rem', color: theme.subText }}>{new Date(lastMsgAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                                            {unreadCount > 0 && (
                                                <div style={{ 
                                                    background: theme.primary, 
                                                    color: 'white', 
                                                    borderRadius: '50%', 
                                                    minWidth: '20px', 
                                                    height: '20px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: 'bold',
                                                    marginTop: '4px',
                                                    padding: '0 4px'
                                                }}>
                                                    {unreadCount}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: theme.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {displayMessage}
                                    </div>
                                </div>
                            </div>
                        </UserItem>
                        );
                    })}
                </UserList>
            )}
          </Section>
      )}



      {activeTab === 'calls' && (
          <Section>
            <h3>Call History</h3>
            {callHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: theme.subText, padding: '2rem' }}>No recent calls</p>
            ) : (
                <UserList>
                    {callHistory.map(call => {
                        const isCaller = call.callerId === user.id;
                        const otherUser = isCaller ? call.Receiver : call.Caller;
                        const icon = call.type === 'video' ? <FaVideo /> : <FaMicrophone />;
                        const statusColor = call.status === 'missed' ? 'red' : (call.status === 'rejected' ? 'orange' : 'green');
                        const statusIcon = call.status === 'missed' ? <FaPhoneSlash color="red"/> : <FaPhone color="green"/>;
                        
                        return (
                            <UserItem key={call.id} style={{ cursor: 'default' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                                    <Avatar user={otherUser} size="45px" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{otherUser ? otherUser.username : 'Unknown'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: theme.subText, marginTop: '2px' }}>
                                            {statusIcon}
                                            <span>{isCaller ? 'Outgoing' : 'Incoming'} {call.type} call</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{new Date(call.createdAt).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.7rem', color: theme.subText }}>{new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    </div>
                                </div>
                            </UserItem>
                        );
                    })}
                </UserList>
            )}
          </Section>
      )}

      {activeTab === 'connect' && (
          <Section>
             {showScanner ? (
                 <>
                    <QRScanner onScan={handleScan} />
                    <Button onClick={() => setShowScanner(false)} style={{ background: theme.secondary }}>Cancel Scan</Button>
                 </>
             ) : (
                 <>
                    <Button onClick={() => setShowUserSearch(s => !s)} style={{ background: theme.secondary, marginBottom: '1rem' }}><FaSearch /> Search Global Users</Button>
                    
                    {showUserSearch && (
                      <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                        <Input 
                          placeholder="Search Global Account by Username"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ border: '2px solid #555' }} // Darker border for better visibility
                        />
                        <div style={{ maxHeight: '40vh', overflowY: 'auto', border: `1px solid ${theme.border}`, borderRadius: 8, background: '#1a1d21' }}>
                          {isSearching && <p style={{ padding: '0.75rem', color: theme.subText }}>Searching...</p>}
                          {!isSearching && searchResults.length === 0 && searchQuery.trim() !== '' && (
                            <p style={{ padding: '0.75rem', color: theme.subText }}>No global users found</p>
                          )}
                          {searchResults.map(u => (
                            <div key={u.id} onClick={() => handleConnectToUser(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', cursor: 'pointer', borderBottom: `1px solid ${theme.border}` }}>
                              <Avatar user={u} size="34px" />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                                <div style={{ fontSize: '0.8rem', color: theme.subText }}>{u.bio || 'Global account'}</div>
                              </div>
                              <span style={{ background: theme.primary, color: 'white', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem' }}>Connect</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button onClick={() => setShowScanner(true)}><FaQrcode /> Scan QR Code</Button>
                    
                    <div style={{ margin: '1rem 0', textAlign: 'center', fontWeight: 'bold' }}>OR</div>
                    
                    <Input 
                        placeholder="Enter Unique Number" 
                        value={connectCode} 
                        onChange={(e) => setConnectCode(e.target.value)} 
                        style={{ border: '2px solid #555' }}
                    />
                    <Button onClick={handleConnect}>
                        <FaSearch /> Connect
                    </Button>
                 </>
             )}
          </Section>
      )}

      {activeTab === 'profile' && user && (
          <Section style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto' }}>
                  <Avatar user={user} size="120px" style={{ border: `4px solid #1890ff` }} />
                  
                  {/* Delete Icon (Left) */}
                  {user.profilePic && (
                      <div 
                          onClick={handleDeleteProfilePic}
                          style={{
                              position: 'absolute',
                              bottom: '5px',
                              left: '5px',
                              background: '#ff4d4f',
                              color: 'white',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                          }}
                          title="Remove Profile Picture"
                      >
                          <FaTrash size={14} />
                      </div>
                  )}

                  {/* Plus Icon (Right) */}
                   <label htmlFor="profile-upload" style={{
                      position: 'absolute',
                      bottom: '5px',
                      right: '5px',
                      background: '#1890ff',
                      color: 'white',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                      +
                  </label>
                  <input 
                      id="profile-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePicChange} 
                      style={{ display: 'none' }} 
                  />
              </div>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'white' }}>{user.username}</h3>
              <p style={{ color: '#8e9297', fontSize: '1rem', margin: '0.5rem 0 2rem' }}>{user.bio || 'No bio available'}</p>
              
              <div style={{ textAlign: 'center' }}>
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                      <QRCodeSVG value={JSON.stringify({ id: user.id, username: user.username })} size={180} />
                  </div>
                  <ConnectionCode style={{ marginTop: '1.5rem', color: 'white' }}>{user.uniqueCode}</ConnectionCode>
                  <p style={{ fontSize: '0.9rem', color: '#8e9297' }}>Share this code to connect</p>
              </div>
          </Section>
      )}
    </Container>
  );
};

export default Dashboard;
