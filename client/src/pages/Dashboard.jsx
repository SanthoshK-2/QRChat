import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import SocketContext from '../context/SocketContext';
import { SERVER_URL } from '../config';
import api from '../utils/api';
import QRScanner from '../components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
import styled, { useTheme } from 'styled-components';
import { FaQrcode, FaSearch, FaUser, FaSignOutAlt, FaCog, FaBell, FaCheck, FaImage, FaFile, FaMicrophone, FaVideo, FaArrowLeft, FaTrash, FaPhone, FaPhoneSlash } from 'react-icons/fa';
import CryptoJS from 'crypto-js';
import Avatar from '../components/Avatar';

const Container = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  background-color: ${({ theme }) => theme.body};
  min-height: 100vh;
  
  @media (max-width: 768px) {
    max-width: 100%;
    padding: 0.5rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: ${({ theme }) => theme.sectionBackground};
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px ${({ theme }) => theme.shadow};
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.primary};
  margin: 0;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.secondary};
  cursor: pointer;
  margin-left: 10px;
  &:hover { color: ${({ theme }) => theme.primary}; }
`;

const Section = styled.div`
  background: ${({ theme }) => theme.sectionBackground};
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px ${({ theme }) => theme.shadow};
  color: ${({ theme }) => theme.text};
`;

const Button = styled.button`
  width: 100%;
  padding: 0.8rem;
  margin-top: 1rem;
  background-color: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    opacity: 0.9;
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
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  color: ${({ theme }) => theme.text};
  &:hover { background-color: ${({ theme }) => theme.hover}; }
`;

const ConnectionCode = styled.div`
  text-align: center;
  margin: 1rem 0;
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 2px;
  color: ${({ theme }) => theme.headerText};
`;

const Sidebar = styled.div`
  width: 100%;
`;

const Tabs = styled.div`
  display: flex;
  margin-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Tab = styled.div`
  padding: 1rem;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? props.theme.primary : props.theme.secondary};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  flex: 1;
  text-align: center;
  
  &:hover {
    background-color: ${({ theme }) => theme.hover};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 4px;
  margin-bottom: 1rem;
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
`;

const NotificationWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const NotificationDropdown = styled.div`
  position: absolute;
  top: 120%;
  right: 0;
  width: 320px;
  background: ${({ theme }) => theme.sectionBackground};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px ${({ theme }) => theme.shadow};
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
`;

const NotificationItem = styled.div`
  padding: 0.8rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) => theme.hover};
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


  return (
    <Container>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {activeTab !== 'chats' && (
                <IconButton onClick={() => setActiveTab('chats')} style={{marginRight: '10px', marginLeft: '-10px'}}>
                    <FaArrowLeft />
                </IconButton>
            )}
            <Title>QR Chat</Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <NotificationWrapper>
                <IconButton onClick={() => setShowNotifications(!showNotifications)}>
                    <FaBell />
                    {requests.length > 0 && <Badge>{requests.length}</Badge>}
                </IconButton>
                {showNotifications && (
                    <NotificationDropdown>
                        <h4 style={{ margin: '0 0 0.5rem 0', padding: '0.5rem', borderBottom: `1px solid ${theme.border}` }}>Notifications</h4>
                        {requests.length === 0 ? (
                            <p style={{ padding: '1rem', textAlign: 'center', color: theme.subText }}>No new notifications</p>
                        ) : (
                            requests.map(req => (
                                <NotificationItem key={req.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Avatar user={req.Requester} size="32px" />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{req.Requester ? req.Requester.username : 'Unknown'}</div>
                                            <div style={{ fontSize: '0.75rem', color: theme.subText }}>Wants to connect</div>
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
            <IconButton onClick={() => navigate('/settings')}><FaCog /></IconButton>
        </div>
      </Header>

      <Tabs>
        <Tab active={activeTab === 'chats'} onClick={() => setActiveTab('chats')}>Chat</Tab>
        <Tab active={activeTab === 'calls'} onClick={() => setActiveTab('calls')}>Call</Tab>
        <Tab active={activeTab === 'connect'} onClick={() => setActiveTab('connect')}>Connect</Tab>
        <Tab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>Profile</Tab>
      </Tabs>

{/* Requests section moved to Notification Dropdown */}

      {activeTab === 'chats' && (
          <Section>
            <h3>Connected Users</h3>
            {chats.length === 0 ? (
                <p>No connected users</p>
            ) : (
                <UserList>
                    {chats.map(chatItem => {
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
                        <UserItem key={chatUser.id} onClick={() => navigate(`/chat/${chatUser.id}`)}>
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
                    <Button onClick={() => setShowScanner(true)}>
                        <FaQrcode /> Scan QR Code
                    </Button>
                    
                    <div style={{ margin: '2rem 0', textAlign: 'center', fontWeight: 'bold' }}>OR</div>
                    
                    <Input 
                        placeholder="Enter Unique Number" 
                        value={connectCode} 
                        onChange={(e) => setConnectCode(e.target.value)} 
                    />
                    <Button onClick={handleConnect}>
                        <FaSearch /> Connect
                    </Button>
                 </>
             )}
          </Section>
      )}

      {activeTab === 'profile' && user && (
          <Section>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '1rem' }}>
                      <Avatar user={user} size="100px" style={{ border: `2px solid ${theme.primary}` }} />
                       <label htmlFor="profile-upload" style={{
                          position: 'absolute',
                          bottom: '0',
                          right: '0',
                          background: theme.primary,
                          color: 'white',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10
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
                      {user.profilePic && (
                          <div 
                              onClick={handleDeleteProfilePic}
                              style={{
                                  position: 'absolute',
                                  bottom: '0',
                                  left: '0',
                                  background: '#ff4d4f',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: '30px',
                                  height: '30px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  zIndex: 10
                              }}
                              title="Remove Profile Picture"
                          >
                              <FaTrash size={14} />
                          </div>
                      )}
                  </div>
                  
                  <h3>{user.username}</h3>
                  <p style={{ color: theme.subText }}>{user.bio || 'No bio available'}</p>
                  
                  <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                      <div style={{ background: 'white', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                          <QRCodeSVG value={JSON.stringify({ id: user.id, username: user.username })} size={150} />
                      </div>
                      <ConnectionCode>{user.uniqueCode}</ConnectionCode>
                      <p style={{ fontSize: '0.9rem', color: theme.subText }}>Share this code to connect</p>
                  </div>
              </div>
          </Section>
      )}
    </Container>
  );
};

export default Dashboard;
