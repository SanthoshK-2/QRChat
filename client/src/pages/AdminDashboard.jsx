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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (!isAuth) {
      navigate('/admin');
      return;
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
        setLoading(true);
        const res = await api.get('/auth/all-users');
        setUsers(res.data);
        setLoading(false);
    } catch (e) {
        console.error(e);
        setError("Failed to load users");
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
    </Container>
  );
};

export default AdminDashboard;
