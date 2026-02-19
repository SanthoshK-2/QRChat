import { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import AuthContext from './AuthContext';
import { SERVER_URL } from '../config';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      const newSocket = io(SERVER_URL, {
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
      });
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
          newSocket.emit('join_room', user.id);
      });

      newSocket.on('reconnect', (attempt) => {
          console.log('Socket reconnected after', attempt, 'attempts');
          newSocket.emit('join_room', user.id);
      });

      // Global listener for delivery receipts
      newSocket.on('receive_message', (message) => {
          if (message.receiverId === user.id) {
              newSocket.emit('message_delivered', { messageId: message.id, senderId: message.senderId });
          }
      });
      
      // Initial join in case we missed the 'connect' event (if it happened synchronously)
      if (newSocket.connected) {
          newSocket.emit('join_room', user.id);
      }

      return () => newSocket.close();
    } else {
        if(socket) {
            socket.close();
            setSocket(null);
        }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
