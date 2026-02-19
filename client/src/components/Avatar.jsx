import styled from 'styled-components';
import { SERVER_URL } from '../config';
import { FaUser } from 'react-icons/fa';
import { useState } from 'react';

const AvatarContainer = styled.div`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.bgColor || '#ccc'};
  color: #fff;
  font-weight: bold;
  font-size: ${props => parseInt(props.size || '40px') / 2}px;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => theme.border};
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// Generate a consistent color from a string
const stringToColor = (str) => {
  if (!str) return '#ccc';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const Avatar = ({ user, size, style }) => {
  // Use state to handle image error
  const [imageError, setImageError] = useState(false);

  // Handle case where user might be null or undefined
  if (!user) {
      return (
        <AvatarContainer size={size} style={style}>
            <FaUser size={parseInt(size || '40px') / 2} />
        </AvatarContainer>
      );
  }

  const { username, profilePic } = user;

  // Render Image if profilePic exists and no error occurred
  if (profilePic && !imageError) {
    // If profilePic is a full URL (external), use it. Otherwise, prepend SERVER_URL
    const src = profilePic.startsWith('http') ? profilePic : `${SERVER_URL}${profilePic}`;
    return (
      <AvatarContainer size={size} style={style}>
        <Img 
            src={src} 
            alt={username} 
            onError={() => setImageError(true)} 
        />
      </AvatarContainer>
    );
  }

  // Fallback: First letter with generated background color
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const bgColor = stringToColor(username);

  return (
    <AvatarContainer size={size} bgColor={bgColor} style={style}>
      {initial}
    </AvatarContainer>
  );
};

export default Avatar;
