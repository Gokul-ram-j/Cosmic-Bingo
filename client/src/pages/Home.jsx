import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../App';

const Home = () => {
    const { socket, userId } = useSocket();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [joinId, setJoinId] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!socket) return;

        socket.emit('getRooms');

        socket.on('roomsList', (data) => {
            setRooms(data);
        });

        socket.on('roomsUpdate', (data) => {
            setRooms(data);
        });

        socket.on('roomCreated', (roomId) => {
            navigate(`/game/${roomId}`);
        });

        socket.on('error', (msg) => {
            setStatusMessage(msg);
            setTimeout(() => setStatusMessage(''), 3000);
        });

        // Clean up listeners
        return () => {
            socket.off('roomsList');
            socket.off('roomsUpdate');
            socket.off('roomCreated');
            socket.off('error');
        };
    }, [socket, navigate]);

    const handleCreateRoom = () => {
        if (socket) {
            socket.emit('createRoom', { password: createPassword });
        }
    };

    const handleJoinRoom = (id) => {
        if (socket) {
            // Check if room requires password from the list
            const targetRoom = rooms.find(r => r.id === id);
            const pwd = joinPassword; // Use manually entered password

            // Navigate to Game page which handles the actual joining logic
            // This prevents race conditions where events are missed during navigation
            navigate(`/game/${id}`, { state: { password: pwd } });
        }
    };

    if (!socket) return <div className="container">Connecting to server...</div>;

    return (
        <div className="container">
            <header className="home-header">
                <h1 className="title">COSMIC BINGO</h1>
                <p style={{ fontFamily: 'Exo 2', fontSize: '1.2rem', color: 'var(--primary)', letterSpacing: '2px' }}>INTERSTELLAR STRATEGY GAME</p>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Player ID: {userId}</div>

                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <input
                        className="input"
                        placeholder="Optional Password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                    <button className="btn btn-primary" onClick={handleCreateRoom} style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
                        CREATE NEW ROOM
                    </button>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Leave password empty for public room</div>
                </div>
            </header>

            {statusMessage && <div className="status-message" style={{ color: 'red', textAlign: 'center', margin: '1rem 0' }}>{statusMessage}</div>}

            <div className="d-flex" style={{ maxWidth: '500px', margin: '3rem auto 0', gap: '1rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="input"
                        placeholder="Room ID"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    />
                    <input
                        className="input"
                        placeholder="Password (if needed)"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        type="password"
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={() => handleJoinRoom(joinId)}
                        disabled={!joinId}
                    >
                        JOIN
                    </button>
                </div>
            </div>

            <h2 style={{ marginTop: '4rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Active Rooms</h2>

            {rooms.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No active rooms. Create one to start!
                </div>
            ) : (
                <div className="rooms-grid">
                    {rooms.map(room => (
                        <div key={room.id} className="room-card" onClick={() => {
                            setJoinId(room.id);
                            // If it has password, focus password field?
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>#{room.id}</span>
                                {room.hasPassword && <span title="Password Protected">🔒</span>}
                                <span className={`room-status status-${room.status}`}>
                                    {room.status.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                Players: {room.playersCount}/2
                            </div>
                            {room.status === 'waiting' && room.playersCount < 2 && (
                                <div style={{ marginTop: '1rem', textAlign: 'right', color: 'var(--primary)', fontWeight: 'bold' }}>
                                    Select →
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Home;
