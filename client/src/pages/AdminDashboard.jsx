import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../utils/api';

const Container = styled.div`
  padding: 2rem;
  background: ${({ theme }) => theme.body};
  color: ${({ theme }) => theme.text};
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.cardBg};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  background: ${({ theme }) => theme.primary};
  color: white;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #d9363e;
  }
`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [usage, setUsage] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (!isAuth) {
      navigate('/admin');
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        setLoading(true);
        // Users list (existing endpoint)
        const [uRes, usageRes, callsRes] = await Promise.all([
          api.get('/auth/all-users'),
          api.get('/admin/usage/users'),
          api.get('/admin/usage/calls')
        ]);
        setUsers(uRes.data);
        setUsage(usageRes.data || []);
        setCalls(callsRes.data || []);
        setLoading(false);
    } catch (e) {
        console.error(e);
        setError("Failed to load admin data");
        setLoading(false);
    }
  };

  const deleteUser = async (id) => {
      if(!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
      try {
          await api.delete(`/auth/user/${id}`);
          setUsers(users.filter(u => u.id !== id));
      } catch (e) {
          console.error(e);
          alert("Failed to delete user");
      }
  };

  const logout = () => {
      localStorage.removeItem('admin_auth');
      navigate('/admin');
  };

  if (loading) return <Container>Loading...</Container>;
  if (error) return <Container>{error}</Container>;

  return (
    <Container>
      <Header>
        <h1>Admin Dashboard</h1>
        <Button onClick={logout} style={{ background: '#333' }}>Logout</Button>
      </Header>
      
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <Td>{user.id}</Td>
                <Td>{user.username}</Td>
                <Td>{user.email}</Td>
                <Td>
                  <Button onClick={() => deleteUser(user.id)}>Delete</Button>
                </Td>
              </tr>
            ))}
            {users.length === 0 && (
                <tr>
                    <Td colSpan="4" style={{textAlign: 'center'}}>No users found</Td>
                </tr>
            )}
          </tbody>
        </Table>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Usage (Hours by User)</h2>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Total Hours</Th>
              <Th>Sessions</Th>
            </tr>
          </thead>
          <tbody>
            {usage.map(row => {
              const seconds = parseInt(row.dataValues?.totalSeconds || row.totalSeconds || 0, 10);
              const hours = (seconds / 3600).toFixed(2);
              const sessions = parseInt(row.dataValues?.sessions || row.sessions || 0, 10);
              const u = row.User || row.user || {};
              return (
                <tr key={row.userId || (u && u.id)}>
                  <Td>{u.username} ({u.email})</Td>
                  <Td>{hours}</Td>
                  <Td>{sessions}</Td>
                </tr>
              );
            })}
            {usage.length === 0 && (
              <tr><Td colSpan="3" style={{ textAlign: 'center' }}>No usage recorded</Td></tr>
            )}
          </tbody>
        </Table>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Call Durations (per Caller)</h2>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <thead>
            <tr>
              <Th>Caller</Th>
              <Th>Audio Hours</Th>
              <Th>Video Hours</Th>
              <Th>Total Calls</Th>
            </tr>
          </thead>
          <tbody>
            {calls.map(row => {
              const audioSec = parseInt(row.dataValues?.audioSeconds || row.audioSeconds || 0, 10);
              const videoSec = parseInt(row.dataValues?.videoSeconds || row.videoSeconds || 0, 10);
              const totalCalls = parseInt(row.dataValues?.totalCalls || row.totalCalls || 0, 10);
              const caller = row.Caller || row.caller || {};
              return (
                <tr key={row.callerId || (caller && caller.id)}>
                  <Td>{caller.username} ({caller.email})</Td>
                  <Td>{(audioSec/3600).toFixed(2)}</Td>
                  <Td>{(videoSec/3600).toFixed(2)}</Td>
                  <Td>{totalCalls}</Td>
                </tr>
              );
            })}
            {calls.length === 0 && (
              <tr><Td colSpan="4" style={{ textAlign: 'center' }}>No call history</Td></tr>
            )}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default AdminDashboard;
