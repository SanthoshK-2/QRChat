import { useContext, useState } from 'react';
import styled from 'styled-components';
import AuthContext from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { FaMoon, FaSun, FaArrowLeft, FaCheck, FaEye, FaEyeSlash, FaCamera, FaTrash } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import Avatar from '../components/Avatar';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  
  h2 {
    color: ${({ theme }) => theme.headerText};
  }
  
  svg {
    color: ${({ theme }) => theme.text};
  }
`;

const Section = styled.div`
  background: ${({ theme }) => theme.sectionBackground};
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px ${({ theme }) => theme.shadow};
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.text};
`;

const Title = styled.h3`
  margin-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  padding-bottom: 0.5rem;
  color: ${({ theme }) => theme.headerText};
`;

const SubTitle = styled.h4`
    margin-bottom: 0.5rem;
    color: ${({ theme }) => theme.subText};
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 4px;
  min-height: 80px;
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
`;

const Button = styled.button`
  background: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    background: ${({ theme }) => theme.secondary};
    cursor: not-allowed;
  }
`;

const PasswordWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const EyeIcon = styled.div`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: ${({ theme }) => theme.subText};
`;

const ToggleSwitch = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
  color: ${({ theme }) => theme.text};
`;

const Select = styled.select`
    width: 100%;
    padding: 0.8rem;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 4px;
    background: ${({ theme }) => theme.inputBg};
    color: ${({ theme }) => theme.text};
`;

const Settings = () => {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  
  const [bio, setBio] = useState(user?.bio || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState(user?.mode || 'local');
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus !== false);
  
  // Mock Settings State
  const [autoDownload, setAutoDownload] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [callQuality, setCallQuality] = useState('high');

  const handleSaveProfile = async () => {
      try {
          await updateProfile({ bio });
          alert('Profile updated');
      } catch (e) {
          alert('Error updating profile');
      }
  };

  const handleProfilePicChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('profilePic', file);
      
      try {
          await api.post('/auth/profile-pic', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          alert('Profile picture updated!');
          window.location.reload(); 
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

  const handleChangePassword = async () => {
      try {
          await updateProfile({ password });
          setPassword('');
          alert('Password updated');
      } catch (e) {
          alert('Error updating password');
      }
  };

  const handleModeSwitch = async () => {
      const newMode = mode === 'local' ? 'global' : 'local';
      if (window.confirm(`Are you sure you want to switch to ${newMode} mode?`)) {
          try {
              await updateProfile({ mode: newMode });
              setMode(newMode);
          } catch (e) {
              alert('Error switching mode');
          }
      }
  };

  const handleOnlineStatusSwitch = async () => {
      try {
          const newVal = !showOnlineStatus;
          await updateProfile({ showOnlineStatus: newVal });
          setShowOnlineStatus(newVal);
      } catch (e) {
          alert('Error updating privacy settings');
      }
  };
  
  const handleBackup = async () => {
      try {
          await api.post('/recovery/backup');
          alert('Backup sent to your registered email');
      } catch (e) {
          alert(e.response?.data?.message || 'Error sending backup');
      }
  };
  
  const handleRecover = async () => {
      try {
          await api.post('/recovery/recover');
          alert('Recovery email sent');
      } catch (e) {
          alert(e.response?.data?.message || 'Error sending recovery email');
      }
  };

  return (
    <Container>
      <Header>
        <FaArrowLeft onClick={() => navigate('/')} style={{ cursor: 'pointer', marginRight: '1rem' }} />
        <h2>Settings</h2>
      </Header>

      <Section>
        <Title>Profile</Title>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
                <Avatar user={user} size="100px" />
                <label htmlFor="profile-upload" style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: '#007bff',
                    color: 'white',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px solid white'
                }}>
                    <FaCamera size={14} />
                </label>
                <input 
                    id="profile-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProfilePicChange} 
                    style={{ display: 'none' }} 
                />
            </div>
            {user?.profilePic && (
                <Button onClick={handleDeleteProfilePic} style={{ background: '#ff4d4f', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                    <FaTrash style={{ marginRight: '5px' }} /> Remove Picture
                </Button>
            )}
        </div>

        {user && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', padding: '10px', borderRadius: '8px' }}>
                    <QRCodeSVG value={JSON.stringify({ id: user.id, username: user.username })} size={120} />
                </div>
                <div style={{ marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px' }}>
                    {user.uniqueCode}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Scan to Connect</div>
            </div>
        )}
        <FormGroup>
            <Label>Username</Label>
            <Input value={user?.username} disabled />
        </FormGroup>
        <FormGroup>
            <Label>Unique Code</Label>
            <Input value={user?.uniqueCode} disabled />
        </FormGroup>
        <FormGroup>
            <Label>Description</Label>
            <TextArea value={bio} onChange={(e) => setBio(e.target.value)} />
        </FormGroup>
        <Button onClick={handleSaveProfile} style={{marginBottom: '1rem'}}>Save Profile</Button>

        <ToggleSwitch>
            <span>Show Online Status</span>
            <div onClick={handleOnlineStatusSwitch} style={{cursor: 'pointer', fontSize: '1.2rem', color: showOnlineStatus ? 'green' : '#ccc'}}>
                {showOnlineStatus ? <FaCheck /> : 'Off'}
            </div>
        </ToggleSwitch>
      </Section>

      <Section>
        <Title>Appearance</Title>
        <ToggleSwitch>
            <span>Dark Mode</span>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: isDarkMode ? '#fbbf24' : '#f59e0b' }}>
                {isDarkMode ? <FaMoon /> : <FaSun />}
            </button>
        </ToggleSwitch>
      </Section>

      <Section>
        <Title>Privacy</Title>
        <p style={{marginBottom: '1rem'}}>Current Mode: <strong>{mode === 'local' ? 'Local (Private)' : 'Global (Public)'}</strong></p>
        <Button onClick={handleModeSwitch} style={{marginBottom: '1.5rem'}}>
            Switch to {mode === 'local' ? 'Global' : 'Local'} Mode
        </Button>
      </Section>

      <Section>
        <Title>Chat & Notifications</Title>
        <ToggleSwitch>
            <span>Enable Notifications</span>
            <div onClick={() => setNotifications(!notifications)} style={{cursor: 'pointer', fontSize: '1.2rem', color: notifications ? 'green' : '#ccc'}}>
                {notifications ? <FaCheck /> : 'Off'}
            </div>
        </ToggleSwitch>
        <FormGroup>
            <Label>Wallpaper</Label>
            <Select>
                <option>Default</option>
                <option>Dark</option>
                <option>Light</option>
            </Select>
        </FormGroup>
      </Section>

      <Section>
        <Title>File Sharing</Title>
        <ToggleSwitch>
            <span>Auto-Download Media</span>
            <div onClick={() => setAutoDownload(!autoDownload)} style={{cursor: 'pointer', fontSize: '1.2rem', color: autoDownload ? 'green' : '#ccc'}}>
                {autoDownload ? <FaCheck /> : 'Off'}
            </div>
        </ToggleSwitch>
      </Section>

      <Section>
        <Title>Calls</Title>
        <FormGroup>
            <Label>Video Quality</Label>
            <Select value={callQuality} onChange={(e) => setCallQuality(e.target.value)}>
                <option value="low">Low (Data Saver)</option>
                <option value="medium">Medium</option>
                <option value="high">High (HD)</option>
            </Select>
        </FormGroup>
      </Section>

      <Section>
        <Title>Security</Title>
        <FormGroup>
            <Label>New Password</Label>
            <PasswordWrapper>
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
                <EyeIcon onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                </EyeIcon>
            </PasswordWrapper>
        </FormGroup>
        <Button onClick={handleChangePassword} disabled={!password}>Update Password</Button>
      </Section>
      
      <Section>
        <Title>Recover</Title>
        <FormGroup>
            <Label>Account Chat/Audio/Video Backup</Label>
            <Button onClick={handleBackup}>Send Backup to Gmail</Button>
        </FormGroup>
        <FormGroup>
            <Label>Account Recovery</Label>
            <Button onClick={handleRecover}>Send Recovery Email</Button>
        </FormGroup>
      </Section>

      <Section>
        <Button onClick={() => { logout(); navigate('/login'); }} style={{ background: '#ff4d4f', width: '100%' }}>
            Logout
        </Button>
      </Section>
    </Container>
  );
};

export default Settings;
