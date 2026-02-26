import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../utils/api';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: ${({ theme }) => theme.body};
  color: ${({ theme }) => theme.text};
`;

const Form = styled.div`
  background: ${({ theme }) => theme.cardBg};
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  @media (min-width: 768px) {
    padding: 2rem;
    max-width: 420px;
  }
`;

const Input = styled.input`
  padding: 0.9rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
  width: 100%;
`;

const Button = styled.button`
  padding: 0.9rem;
  background: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
  &:hover { opacity: 0.9; }
`;

const ErrorMsg = styled.div`
  color: #ff4d4f;
  font-size: 0.9rem;
  text-align: center;
`;

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setError('');
      const res = await api.post('/auth/login', {
        username,
        password,
        isEncrypted: false
      });
      const { token, isAdmin } = res.data || {};
      if (!isAdmin) {
        setError('Admin access required');
        return;
      }
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('admin_auth', 'true');
      navigate('/admin/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Container>
      <Form>
        <h2 style={{ textAlign: 'center' }}>Admin Login</h2>
        <Input 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
        />
        <Input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <Button onClick={handleLogin}>Login</Button>
      </Form>
    </Container>
  );
};

export default AdminLogin;
