import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import api from '../utils/api';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: ${({ theme }) => theme.body};
`;

const FormBox = styled.div`
  background: ${({ theme }) => theme.cardBg};
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px ${({ theme }) => theme.shadow};
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 2rem;
  color: ${({ theme }) => theme.headerText};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.8rem;
  margin-bottom: 1rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 4px;
  font-size: 1rem;
  background: ${({ theme }) => theme.inputBg};
  color: ${({ theme }) => theme.text};
`;

const Button = styled.button`
  width: 100%;
  padding: 0.8rem;
  background-color: #0084ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0073e6;
  }
`;

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { token } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        try {
            const { data } = await api.post('/auth/reset-password', { token, newPassword });
            setMessage(data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error resetting password');
        }
    };

    return (
        <Container>
            <FormBox>
                <Title>Set New Password</Title>
                <form onSubmit={handleSubmit}>
                    <Input 
                        type="password" 
                        placeholder="New Password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required 
                    />
                    <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '1rem'}}>
                        Must be at least 8 chars, include uppercase, lowercase, number & symbol.
                    </p>
                    <Input 
                        type="password" 
                        placeholder="Confirm New Password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        required 
                    />
                    <Button type="submit">Reset Password</Button>
                </form>
                {message && <p style={{ color: 'green', marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
                {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
            </FormBox>
        </Container>
    );
};

export default ResetPassword;
