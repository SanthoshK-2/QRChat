import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
import CryptoJS from 'crypto-js';
import { APP_SECRET } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to encrypt sensitive data before transport
  const encryptPayload = (data) => {
      return CryptoJS.AES.encrypt(data, APP_SECRET).toString();
  };

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/profile');
          setUser(data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (username, password) => {
    const encryptedPassword = encryptPayload(password);
    const { data } = await api.post('/auth/login', { username, password: encryptedPassword, isEncrypted: true });
    localStorage.setItem('token', data.token);
    setUser(data);
  };

  const register = async (username, password, email) => {
    try {
      const encryptedPassword = encryptPayload(password);
      const { data } = await api.post('/auth/register', { username, password: encryptedPassword, email, isEncrypted: true });
      localStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
  
  const updateProfile = async (updatedData) => {
      const { data } = await api.put('/auth/profile', updatedData);
      setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
