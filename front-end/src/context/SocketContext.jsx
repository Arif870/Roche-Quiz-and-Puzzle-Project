import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // ✅ FIX: Dynamically grab the IP address from the browser URL
    // If you are on 192.168.1.5:5173, this becomes 192.168.1.5
    const hostname = window.location.hostname;
    
    // Connect to the backend on port 3001 using that specific IP
    const backendUrl = `http://${hostname}:3001`;
    
    console.log("Connecting to Backend at:", backendUrl); // Debug log

    const newSocket = io(backendUrl);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};