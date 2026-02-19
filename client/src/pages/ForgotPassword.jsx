import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../utils/api';
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';

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

const BackLink = styled.div`
    margin-top: 1rem;
    text-align: center;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    &:hover { color: #333; }
`;

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setMessage(data.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Error sending OTP');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
            setMessage(data.message);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error resetting password');
        }
    };

    return (
        <Container>
            <FormBox>
                <Title>Reset Password</Title>
                {step === 1 ? (
                    <form onSubmit={handleSendOTP}>
                        <p style={{marginBottom: '1rem', textAlign: 'center'}}>Enter your email to receive an OTP.</p>
                        <Input 
                            type="email" 
                            placeholder="Enter your registered email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                        <Button type="submit">Send OTP</Button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                         <p style={{marginBottom: '1rem', textAlign: 'center'}}>Enter the OTP sent to {email}</p>
                        <Input 
                            type="text" 
                            placeholder="Enter 6-digit OTP" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)} 
                            required 
                        />
                        <PasswordWrapper>
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="New Password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                required 
                                style={{ marginBottom: 0 }}
                            />
                            <EyeIcon onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </EyeIcon>
                        </PasswordWrapper>
                         <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '1rem'}}>
                            Password must be at least 8 chars, include uppercase, lowercase, number & symbol.
                        </p>
                        <Button type="submit">Reset Password</Button>
                    </form>
                )}

                {message && <p style={{ color: 'green', marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
                {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
                
                <BackLink onClick={() => navigate('/login')}>
                    <FaArrowLeft /> Back to Login
                </BackLink>
            </FormBox>
        </Container>
    );
};

export default ForgotPassword;
