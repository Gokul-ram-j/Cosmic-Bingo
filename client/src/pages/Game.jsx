import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../App';
import confetti from 'canvas-confetti';
import Board from '../components/Board';

const Game = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { socket, userId } = useSocket();
    const password = location.state?.password;

    const [status, setStatus] = useState('connecting'); // connecting, waiting, filling, playing, finished
    const [board, setBoard] = useState(Array(25).fill(null));
    const [crossedNumbers, setCrossedNumbers] = useState([]);
    const [turn, setTurn] = useState(null);
    const [fillCount, setFillCount] = useState(1);
    const [scores, setScores] = useState({ player1: 0, player2: 0 });
    const [timeLeft, setTimeLeft] = useState(60);
    const [winner, setWinner] = useState(null);
    const [waitMessage, setWaitMessage] = useState('Connecting to room...');

    const timerRef = useRef(null);

    // Initial connection
    // Initial connection
    useEffect(() => {
        if (!socket) return;

        // Timer Logic
        const startTimer = (duration) => {
            setTimeLeft(duration);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        };

        // Listeners for game updates
        socket.on('playerJoined', ({ players }) => {
            if (players.length < 2) {
                setStatus('waiting');
                setWaitMessage('Waiting for opponent...');
            }
        });

        socket.on('gameSync', (state) => {
            // Fully sync state on reconnect/join
            setStatus(state.status);
            if (state.board) setBoard(state.board);
            // Update fillCount based on board?
            // If board has numbers, fillCount should be next available number
            if (state.status === 'filling' || state.status === 'playing') {
                const maxNum = Math.max(0, ...state.board.filter(n => typeof n === 'number'));
                if (maxNum > 0) setFillCount(maxNum + 1);
            }

            setCrossedNumbers(state.crossedNumbers);
            setTurn(state.turn);
            setScores(state.scores);

            // Handle timer from sync
            if (state.status === 'filling' && state.timer > 0) {
                startTimer(state.timer);
            } else if (state.timer !== undefined) {
                setTimeLeft(state.timer);
            }
        });

        socket.on('startFilling', ({ duration }) => {
            setStatus('filling');
            startTimer(duration);
        });

        socket.on('gameStart', ({ turn, initialBoard }) => {
            setStatus('playing');
            setTurn(turn);
            if (timerRef.current) clearInterval(timerRef.current);
        });

        socket.on('moveMade', ({ number, crossedNumbers, turn, scores }) => {
            setCrossedNumbers(crossedNumbers);
            setTurn(turn);
            setScores(scores);
        });

        socket.on('gameOver', ({ winner }) => {
            setStatus('finished');
            setWinner(winner);

            if (winner === userId) {
                confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.6 },
                    shapes: ['star'],
                    colors: ['#00F3FF', '#FF00E6', '#4D61FC', '#FFEDA3'],
                    scalar: 1.5,
                    startVelocity: 55
                });
            }
        });

        socket.on('opponentLeft', () => {
            setWaitMessage('Opponent disconnected. Waiting for reconnect...');
        });

        socket.on('gameAbandoned', () => {
            setStatus('finished');
            setWinner(userId); // Auto win due to abandonment
            setWaitMessage('Opponent abandoned the game.');
        });

        socket.on('roomClosed', (msg) => {
            alert(msg || 'Room closed');
            navigate('/');
        });

        socket.on('error', (msg) => {
            alert(msg);
            navigate('/');
        });

        // Emit joinRoom AFTER setting up listeners to catch immediate events
        socket.emit('joinRoom', { roomId, userId, password });

        return () => {
            socket.off('playerJoined');
            socket.off('gameSync');
            socket.off('startFilling');
            socket.off('gameStart');
            socket.off('moveMade');
            socket.off('gameOver');
            socket.off('opponentLeft');
            socket.off('gameAbandoned');
            socket.off('roomClosed');
            socket.off('error');
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [socket, roomId, navigate, userId, password]);

    // Handle auto-fill on timer end or manual
    useEffect(() => {
        if (status === 'filling' && timeLeft === 0) {
            handleAutoFill();
        }
    }, [timeLeft, status]);

    const handleCellClick = (idx) => {
        if (status === 'filling') {
            if (board[idx] !== null) return; // Already filled

            const newBoard = [...board];
            newBoard[idx] = fillCount;
            setBoard(newBoard);
            setFillCount(prev => prev + 1);
        } else if (status === 'playing') {
            if (turn !== userId) return;
            const number = board[idx];
            if (!number || crossedNumbers.includes(number)) return;

            socket.emit('makeMove', { roomId, number, userId });
        }
    };

    // Auto-submit when board is full
    useEffect(() => {
        if (fillCount > 25 && status === 'filling') {
            // Check if we haven't already submitted?
            // Sending multiple times is idempotent on server (it overwrites board for this user)
            socket.emit('submitBoard', { roomId, board, userId });
            setWaitMessage('Waiting for opponent to finish filling...');
        }
    }, [fillCount, status, board, roomId, socket, userId]);

    const handleAutoFill = () => {
        const newBoard = [...board];
        const usedNumbers = new Set(newBoard.filter(n => n !== null));
        const availableNumbers = Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !usedNumbers.has(n));

        // Shuffle available
        for (let i = availableNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableNumbers[i], availableNumbers[j]] = [availableNumbers[j], availableNumbers[i]];
        }

        let nextIdx = 0;
        for (let i = 0; i < 25; i++) {
            if (newBoard[i] === null) {
                newBoard[i] = availableNumbers[nextIdx++];
            }
        }

        setBoard(newBoard);
        setFillCount(26); // Trigger submission via effect
    };

    return (
        <div className="container">
            {/* Header / HUD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(0, 243, 255, 0.1)' }}>
                <button className="btn btn-secondary" onClick={() => {
                    if (socket) socket.emit('leaveRoom', { roomId, userId });
                    navigate('/');
                }}>← ABORT MISSION</button>

                <div style={{ textAlign: 'center', position: 'relative' }}>
                    <h2 style={{ margin: 0, textShadow: '0 0 10px var(--primary)' }}>SECTOR: {roomId}</h2>

                    {/* Planetary Turn Indicator */}
                    <div style={{
                        width: '80px', height: '80px',
                        margin: '10px auto',
                        borderRadius: '50%',
                        background: status === 'playing'
                            ? (turn === userId ? 'radial-gradient(circle at 30% 30%, #00F3FF, #050B14)' : 'radial-gradient(circle at 30% 30%, #FF3864, #050B14)')
                            : 'radial-gradient(circle at 30% 30%, #4D61FC, #050B14)',
                        boxShadow: status === 'playing'
                            ? (turn === userId ? '0 0 30px #00F3FF' : '0 0 30px #FF3864')
                            : '0 0 20px rgba(77, 97, 252, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.5s ease',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        {status === 'filling' && (
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{timeLeft}</span>
                        )}
                        {status === 'playing' && (
                            <span style={{ fontSize: '2rem', color: '#fff' }}>
                                {turn === userId ? '★' : '⚔'}
                            </span>
                        )}
                    </div>

                    {status === 'playing' && (
                        <div className={`turn-indicator ${turn === userId ? 'turn-active' : ''}`}
                            style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                            {turn === userId ? "YOUR COMMAND" : "ENEMY MOVEMENT"}
                        </div>
                    )}
                    {status === 'filling' && <div style={{ color: timeLeft < 10 ? 'var(--error)' : 'var(--primary)', marginTop: '0.5rem' }}>SYSTEM INITIALIZATION</div>}
                    {status === 'waiting' && <div style={{ color: 'var(--success)', marginTop: '0.5rem' }}>SCANNING FOR OPPONENT...</div>}
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OPERATOR: {userId.substring(0, 6)}</div>
                    <div style={{ fontSize: '0.9rem', color: status === 'playing' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        ● {status}
                    </div>
                </div>
            </div>

            <div className="game-layout">
                {/* Left Panel: Stats/Info */}
                <div className="player-panel">
                    <h3>COMMANDER</h3>


                    {status === 'filling' && fillCount <= 25 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Next: {fillCount}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        if (fillCount <= 1) return;
                                        const lastNum = fillCount - 1;
                                        const idx = board.indexOf(lastNum);
                                        if (idx !== -1) {
                                            const newBoard = [...board];
                                            newBoard[idx] = null;
                                            setBoard(newBoard);
                                            setFillCount(lastNum);
                                        }
                                    }}
                                    disabled={fillCount <= 1}
                                    title="Undo last number"
                                >
                                    ↩ Undo
                                </button>
                                <button className="btn btn-primary" onClick={handleAutoFill}>
                                    Auto-Fill
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Center: Board */}
                <div className="board-container">
                    {status === 'waiting' || status === 'connecting' ? (
                        <div className="card">
                            <h3>{waitMessage}</h3>
                            <div className="loader" style={{ marginTop: '1rem', fontSize: '2rem' }}>⟳</div>
                        </div>
                    ) : (
                        <>

                            <Board
                                board={board}
                                crossedNumbers={crossedNumbers}
                                isMyTurn={turn === userId}
                                phase={status}
                                onCellClick={handleCellClick}
                            />
                        </>
                    )}
                </div>

                {/* Right Panel: Opponent */}
                <div className="player-panel" style={{ opacity: 0.8 }}>
                    <h3>ADVERSARY</h3>


                </div>
            </div>

            {/* Game Over Modal */}
            {status === 'finished' && (
                <div className="overlay">
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '500px', height: '500px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255, 0, 230, 0.5) 30%, transparent 70%)',
                        borderRadius: '50%',
                        zIndex: -1,
                        animation: 'supernova 1.5s ease-out forwards'
                    }}></div>
                    <div className="modal">
                        {winner === userId ? (
                            <>
                                <div className="win-text">VICTORY ACHIEVED</div>
                                <p>SECTOR SECURED, COMMANDER.</p>
                            </>
                        ) : (
                            <>
                                <div className="lose-text">MISSION FAILED</div>
                                <p>RETREAT AND REGROUP.</p>
                            </>
                        )}
                        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '2rem' }}>
                            RETURN TO BASE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game;
