import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: ${({ theme }) => theme.body};
  color: ${({ theme }) => theme.text};
`;

const Form = styled.div`
  background: ${({ theme }) => theme.cardBg};
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.8rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
`;

const Button = styled.button`
  padding: 0.8rem;
  background: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    opacity: 0.9;
  }
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

  const handleLogin = () => {
    // Hardcoded for "Me" only as requested
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('admin_auth', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Invalid Credentials');
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
