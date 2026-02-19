import React, { useState, useEffect, useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { FaPhone, FaVideo, FaArrowRight, FaArrowLeft, FaPhoneSlash } from 'react-icons/fa';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import Avatar from './Avatar';

const List = styled.ul`
  list-style: none;
  padding: 0;
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.hover};
  }
`;

const Info = styled.div`
  flex: 1;
  margin-left: 1rem;
`;

const Name = styled.div`
  font-weight: bold;
  font-size: 1rem;
`;

const Meta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.subText || theme.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const Time = styled.div`
  text-align: right;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.subText || theme.secondary};
`;

const Section = styled.div`
  background: ${({ theme }) => theme.sectionBackground};
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px ${({ theme }) => theme.shadow};
  color: ${({ theme }) => theme.text};
`;

const CallHistoryList = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/calls');
      setCalls(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Section><div>Loading history...</div></Section>;

  return (
    <Section>
      <h3>Call History</h3>
      {calls.length === 0 ? (
        <p style={{ textAlign: 'center', color: theme.subText }}>No recent calls</p>
      ) : (
        <List>
          {calls.map(call => {
            const isCaller = call.callerId === user.id;
            const otherUser = isCaller ? call.Receiver : call.Caller;
            // Fallback if user deleted or null
            const displayName = otherUser ? otherUser.username : 'Unknown User';
            
            const isVideo = call.type === 'video';
            const isMissed = call.status === 'missed';
            const isRejected = call.status === 'rejected';
            
            let statusIcon;
            let statusColor;
            
            if (isMissed) {
                statusIcon = <FaPhoneSlash />;
                statusColor = 'red';
            } else if (isRejected) {
                statusIcon = <FaPhoneSlash />;
                statusColor = 'orange';
            } else {
                statusIcon = isVideo ? <FaVideo /> : <FaPhone />;
                statusColor = isCaller ? 'green' : 'blue';
            }

            const directionIcon = isCaller ? <FaArrowRight size={10} /> : <FaArrowLeft size={10} />;

            return (
              <Item key={call.id}>
                 <Avatar 
                    user={otherUser}
                    size="45px" 
                 />
                 <Info>
                   <Name>{displayName}</Name>
                   <Meta style={{ color: statusColor }}>
                     {directionIcon}
                     {statusIcon}
                     <span>{isCaller ? 'Outgoing' : 'Incoming'} {call.type}</span>
                   </Meta>
                 </Info>
                 <Time>
                    <div style={{ fontWeight: 'bold' }}>{new Date(call.createdAt).toLocaleDateString()}</div>
                    <div>{new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                 </Time>
              </Item>
            );
          })}
        </List>
      )}
    </Section>
  );
};

export default CallHistoryList;
