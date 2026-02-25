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
  const [online, setOnline] = useState(0);
  const [range, setRange] = useState('week'); // day | week | month | custom
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [detail, setDetail] = useState(null); // { user, usage, calls }
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
        const q = new URLSearchParams();
        if (range) q.set('range', range);
        if (range === 'custom' && start && end) {
          q.set('start', start);
          q.set('end', end);
        }
        const [uRes, usageRes, callsRes, onlineRes] = await Promise.all([
          api.get('/auth/all-users'),
          api.get('/admin/usage/users?' + q.toString()),
          api.get('/admin/usage/calls?' + q.toString()),
          api.get('/admin/online')
        ]);
        setUsers(uRes.data);
        setUsage(usageRes.data || []);
        setCalls(callsRes.data || []);
        setOnline(onlineRes.data?.online || 0);
        setLoading(false);
    } catch (e) {
        console.error(e);
        setError("Failed to load admin data");
        setLoading(false);
    }
  };

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await api.get('/admin/online');
        setOnline(res.data?.online || 0);
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const exportUsage = async () => {
    const q = new URLSearchParams();
    if (range) q.set('range', range);
    if (range === 'custom' && start && end) {
      q.set('start', start);
      q.set('end', end);
    }
    const res = await api.get('/admin/export/usage.csv?' + q.toString(), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'usage.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportCalls = async () => {
    const q = new URLSearchParams();
    if (range) q.set('range', range);
    if (range === 'custom' && start && end) {
      q.set('start', start);
      q.set('end', end);
    }
    const res = await api.get('/admin/export/calls.csv?' + q.toString(), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'calls.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const viewDetail = async (userId) => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setDetail(res.data);
    } catch (e) {
      alert('Failed to load user detail');
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>Online now: <strong>{online}</strong></span>
          <Button onClick={logout} style={{ background: '#333' }}>Logout</Button>
        </div>
      </Header>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button onClick={() => { setRange('day'); fetchData(); }} style={{ background: range==='day' ? '#1890ff' : '#555' }}>24 Hours</Button>
        <Button onClick={() => { setRange('week'); fetchData(); }} style={{ background: range==='week' ? '#1890ff' : '#555' }}>7 Days</Button>
        <Button onClick={() => { setRange('month'); fetchData(); }} style={{ background: range==='month' ? '#1890ff' : '#555' }}>30 Days</Button>
        <span>Custom:</span>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        <Button onClick={() => { setRange('custom'); fetchData(); }} style={{ background: range==='custom' ? '#1890ff' : '#555' }}>Apply</Button>
        <Button onClick={exportUsage} style={{ background: '#16a34a' }}>Export Usage CSV</Button>
        <Button onClick={exportCalls} style={{ background: '#16a34a' }}>Export Calls CSV</Button>
      </div>
      
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
                  <Button onClick={() => viewDetail(user.id)} style={{ marginLeft: '0.5rem', background: '#1890ff' }}>Details</Button>
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

      {detail && (
        <div style={{ marginTop: '2rem' }}>
          <h2>User Detail: {detail.user?.username} ({detail.user?.email})</h2>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3>Recent Sessions</h3>
              <Table>
                <thead>
                  <tr><Th>Started</Th><Th>Ended</Th><Th>Duration (min)</Th></tr>
                </thead>
                <tbody>
                  {(detail.usage || []).map(s => (
                    <tr key={s.id}>
                      <Td>{new Date(s.startedAt).toLocaleString()}</Td>
                      <Td>{s.endedAt ? new Date(s.endedAt).toLocaleString() : '-'}</Td>
                      <Td>{((s.durationSeconds || 0) / 60).toFixed(1)}</Td>
                    </tr>
                  ))}
                  {(!detail.usage || detail.usage.length === 0) && (
                    <tr><Td colSpan="3" style={{ textAlign: 'center' }}>No sessions</Td></tr>
                  )}
                </tbody>
              </Table>
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3>Recent Calls</h3>
              <Table>
                <thead>
                  <tr><Th>Type</Th><Th>Status</Th><Th>Duration (min)</Th><Th>At</Th></tr>
                </thead>
                <tbody>
                  {(detail.calls || []).map(c => (
                    <tr key={c.id}>
                      <Td>{c.type}</Td>
                      <Td>{c.status}</Td>
                      <Td>{((c.duration || 0) / 60).toFixed(1)}</Td>
                      <Td>{new Date(c.createdAt).toLocaleString()}</Td>
                    </tr>
                  ))}
                  {(!detail.calls || detail.calls.length === 0) && (
                    <tr><Td colSpan="4" style={{ textAlign: 'center' }}>No calls</Td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Button onClick={() => setDetail(null)} style={{ background: '#333' }}>Close</Button>
          </div>
        </div>
      )}
    </Container>
  );
};

export default AdminDashboard;
