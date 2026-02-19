import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { SERVER_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.body};
  padding: 1rem;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.cardBg};
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px ${({ theme }) => theme.shadow};
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    padding: 3rem;
  }
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.headerText};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.8rem;
  margin-bottom: 1rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
`;

const PasswordWrapper = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 1rem;
`;

const EyeIcon = styled.div`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #666;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.8rem;
  background-color: #0084ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #0073e6;
  }
`;

const ToggleText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #0084ff;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const LinkText = styled.span`
    color: #0084ff;
    cursor: pointer;
    font-size: 0.9rem;
    &:hover { text-decoration: underline; }
`;

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const checkPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    let label = '';
    let color = '';

    if (pass.length === 0) {
        label = '';
        color = '';
    } else if (score < 3) {
        label = 'Weak';
        color = '#ff4d4f'; // Red
    } else if (score < 5) {
        label = 'Medium';
        color = '#faad14'; // Orange
    } else {
        label = 'Strong';
        color = '#52c41a'; // Green
    }
    setPasswordStrength({ score, label, color });
  };

  const handlePasswordChange = (e) => {
    const newPass = e.target.value;
    setPassword(newPass);
    if (!isLogin) {
        checkPasswordStrength(newPass);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(username, password); // Username field can be email or username
        alert("Successfully Logined ");
      } else {
        await register(username, password, email);
      }
      navigate('/');
    } catch (error) {
      console.error("Login Error:", error);
      if (error.message === 'Network Error') {
          alert(`Network Error: Cannot connect to server at ${SERVER_URL}.\n\nPlease ensure:\n1. The server is running (npm start in server folder).\n2. Your device is on the same network.\n3. Firewall is not blocking the server port.`);
      } else {
          alert(error.response?.data?.message || error.message || 'An error occurred');
      }
    }
  };

  return (
    <Container>
      <Card>
        <Title>{isLogin ? 'Welcome Back' : 'Create Account'}</Title>
        <form onSubmit={handleSubmit}>
          <Input 
            type="text" 
            placeholder={isLogin ? "Username or Email" : "Username"} 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          {!isLogin && (
              <Input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
          )}
          <PasswordWrapper>
            <Input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={password} 
              onChange={handlePasswordChange} 
              required 
              style={{ marginBottom: 0 }}
            />
            <EyeIcon onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </EyeIcon>
          </PasswordWrapper>
          {!isLogin && password && (
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ height: '4px', width: '100%', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(passwordStrength.score / 5) * 100}%`, background: passwordStrength.color, transition: 'all 0.3s' }}></div>
                </div>
                <p style={{ fontSize: '0.8rem', color: passwordStrength.color, marginTop: '4px', textAlign: 'right' }}>
                    {passwordStrength.label}
                </p>
            </div>
          )}
          {!isLogin && <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '1rem'}}>Password must be at least 8 chars, include uppercase, lowercase, number & symbol.</p>}
          
          <Button type="submit">{isLogin ? 'Login' : 'Register'}</Button>
        </form>
        
        {isLogin && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <LinkText onClick={() => navigate('/forgot-password')}>Forgot Password?</LinkText>
            </div>
        )}

        <ToggleText onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </ToggleText>
      </Card>
    </Container>
  );
};

export default Login;
