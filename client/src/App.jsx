import React, { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import io from 'socket.io-client';
import Home from './pages/Home';
import Game from './pages/Game';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

const App = () => {
  const [socket, setSocket] = useState(null);
  const [userId] = useState(() => {
    const stored = localStorage.getItem('bingo_user_id');
    if (stored) return stored;
    const newId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('bingo_user_id', newId);
    return newId;
  });

  useEffect(() => {
    const newSocket = io('https://cosmic-bingo-cbqu.vercel.app', {
      transports: ['websocket', 'polling'], // Ensure reliable connection
      query: { userId }
    });
    setSocket(newSocket);
    return () => newSocket.close();
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, userId }}>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </div>
    </SocketContext.Provider>
  );
};

export default App;
