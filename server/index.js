const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { calculateScore } = require('./gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;

// Game State
// rooms[roomId]
// {
//   id: roomId,
//   players: [userId1, userId2],
//   sockets: { userId1: socketId, userId2: socketId },
//   boards: { userId1: [], userId2: [] },
//   crossedNumbers: [],
//   turn: userId,
//   scores: { userId1: 0, userId2: 0 },
//   status: waiting | filling | playing | finished,
//   timer: null,
//   disconnectTimers: { userId: timeoutId }
// }
const rooms = {};

// Helper to generate Room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) {
        console.log('No userId provided, disconnecting socket:', socket.id);
        socket.disconnect();
        return;
    }

    console.log(`User connected: ${userId} (${socket.id})`);

    // List Rooms
    socket.on('getRooms', () => {
        const availableRooms = Object.values(rooms).map(r => ({
            id: r.id,
            playersCount: r.players.length,
            status: r.status,
            hasPassword: !!r.password
        }));
        socket.emit('roomsList', availableRooms);
    });

    // Create Room
    socket.on('createRoom', ({ password } = {}) => {
        cleanupUserFromRooms(userId); // Ensure user leaves other rooms first

        const roomId = generateRoomId();
        rooms[roomId] = {
            id: roomId,
            creatorId: userId,
            password: password || null,
            players: [userId],
            sockets: { [userId]: socket.id },
            boards: {},
            crossedNumbers: [],
            turn: null,
            scores: {},
            status: 'waiting',
            disconnectTimers: {}
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        io.emit('roomsUpdate', Object.values(rooms).map(r => ({
            id: r.id,
            playersCount: r.players.length,
            status: r.status,
            hasPassword: !!r.password
        })));
    });

    // Join Room / Reconnect
    socket.on('joinRoom', ({ roomId, userId: joinedUserId, password }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        // Check if player is reconnecting
        if (room.players.includes(joinedUserId)) {
            // Reconnect logic
            console.log(`User ${joinedUserId} reconnecting to room ${roomId}`);

            // Clear disconnect timer if any
            if (room.disconnectTimers[joinedUserId]) {
                clearTimeout(room.disconnectTimers[joinedUserId]);
                delete room.disconnectTimers[joinedUserId];
            }

            // Update socket mapping
            room.sockets[joinedUserId] = socket.id;
            socket.join(roomId);

            // Send full state sync
            let remainingTime = 0;
            if (room.status === 'filling' && room.fillingStartTime) {
                const elapsed = Math.floor((Date.now() - room.fillingStartTime) / 1000);
                remainingTime = Math.max(0, 60 - elapsed);
            }

            socket.emit('gameSync', {
                status: room.status,
                board: room.boards[joinedUserId] || Array(25).fill(null),
                crossedNumbers: room.crossedNumbers,
                turn: room.turn,
                scores: room.scores,
                timer: remainingTime
            });

            // Notify opponent that player is back?
            // Not strictly necessary if game just continues, but good UX
            return;
        }

        // Check password
        if (room.password && room.password !== password) {
            socket.emit('error', 'Incorrect password');
            return;
        }

        cleanupUserFromRooms(joinedUserId); // Ensure user leaves other rooms before joining new one

        // New Player Joining
        if (room.players.length < 2 && room.status === 'waiting') {
            room.players.push(joinedUserId);
            room.sockets[joinedUserId] = socket.id;
            socket.join(roomId);

            // Notify players
            io.to(roomId).emit('playerJoined', { roomId, players: room.players });

            if (room.players.length === 2) {
                room.status = 'filling';
                room.fillingStartTime = Date.now();
                // Start filling phase
                io.to(roomId).emit('startFilling', { duration: 60 });

                // Server creates a 60s timeout to force start if desired, 
                // but for now we rely on client events
            }

            io.emit('roomsUpdate', Object.values(rooms).map(r => ({
                id: r.id,
                playersCount: r.players.length,
                status: r.status,
                hasPassword: !!r.password
            })));
        } else {
            socket.emit('error', 'Room full or game in progress');
        }
    });

    // Submit Board
    socket.on('submitBoard', ({ roomId, board, userId: senderId }) => {
        const room = rooms[roomId];
        if (!room) return;

        room.boards[senderId] = board;
        room.scores[senderId] = 0;

        // Check if both players submitted
        if (Object.keys(room.boards).length === 2) {
            room.status = 'playing';
            const startPlayer = room.players[Math.floor(Math.random() * room.players.length)];
            room.turn = startPlayer;

            io.to(roomId).emit('gameStart', { turn: startPlayer });
        }
    });

    // Make Move
    socket.on('makeMove', ({ roomId, number, userId: senderId }) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;

        if (room.turn !== senderId) return;

        if (room.crossedNumbers.includes(number)) return;

        room.crossedNumbers.push(number);

        // Calculate scores for both players
        let winnerId = null;

        room.players.forEach(pid => {
            const score = calculateScore(room.boards[pid], room.crossedNumbers);
            room.scores[pid] = score;
            if (score >= 5 && !winnerId) {
                winnerId = pid;
            }
        });

        // Switch turn
        const nextTurn = room.players.find(id => id !== senderId);
        room.turn = nextTurn;

        // Broadcast update
        io.to(roomId).emit('moveMade', {
            number,
            crossedNumbers: room.crossedNumbers,
            turn: nextTurn,
            scores: room.scores
        });

        if (winnerId) {
            room.status = 'finished';
            io.to(roomId).emit('gameOver', { winner: winnerId });

            // Clean up room immediately after game ends
            delete rooms[roomId];
            io.emit('roomsUpdate', Object.values(rooms).map(r => ({
                id: r.id,
                playersCount: r.players.length,
                status: r.status,
                hasPassword: !!r.password
            })));
        }
    });

    // Helper to cleanup user from other rooms
    const cleanupUserFromRooms = (userId) => {
        for (const rId in rooms) {
            const r = rooms[rId];
            if (r.players.includes(userId)) {
                // If user is in another room, treat as leaving that room
                handleLeaveRoom(rId, userId);
            }
        }
    };

    // Shared Leave/Disconnect Logic
    const handleLeaveRoom = (roomId, userId, isDisconnect = false) => {
        const room = rooms[roomId];
        if (!room) return;

        const isCreator = room.creatorId === userId;

        // If game is finished or just waiting
        if (room.status === 'finished' || room.status === 'waiting') {
            if (room.status === 'waiting') {
                if (isCreator) {
                    // Creator closed waiting room
                    io.to(roomId).emit('roomClosed', 'Room closed by creator');
                    delete rooms[roomId];
                } else {
                    // Guest left
                    room.players = room.players.filter(p => p !== userId);
                    delete room.sockets[userId];
                    // If no players left, delete
                    if (room.players.length === 0) {
                        delete rooms[roomId];
                    }
                }
                io.emit('roomsUpdate', Object.values(rooms).map(r => ({
                    id: r.id,
                    playersCount: r.players.length,
                    status: r.status,
                    hasPassword: !!r.password
                })));
            } else {
                // finished game, just remove user from tracking if needed
                // actually finished games are deleted immediately in makeMove now, so this might not be reached
                // but if it persists:
                if (room.players.length === 0) delete rooms[roomId];
            }
            return;
        }

        // Playing/Filling Phase
        if (isDisconnect) {
            // Start Timer
            console.log(`Starting disconnect timer for ${userId} in room ${roomId}`);
            room.disconnectTimers[userId] = setTimeout(() => {
                console.log(`Disconnect timeout for ${userId} - ending game`);
                finalizeGameAbandonment(roomId, userId);
            }, 10000); // 10s

            // Notify opponent
            const opponent = room.players.find(id => id !== userId);
            if (opponent && room.sockets[opponent]) {
                io.to(room.sockets[opponent]).emit('opponentLeft');
            }
        } else {
            // Immediate Leave
            finalizeGameAbandonment(roomId, userId);
        }
    };

    const finalizeGameAbandonment = (roomId, userId) => {
        const room = rooms[roomId];
        if (!room) return;

        const isCreator = room.creatorId === userId;
        const opponent = room.players.find(id => id !== userId);

        if (opponent) {
            const winner = opponent;
            if (room.sockets[opponent]) {
                io.to(room.sockets[opponent]).emit('gameOver', {
                    winner,
                    reason: 'opponent_left'
                });
            }
        }

        delete rooms[roomId]; // Delete room immediately
        io.emit('roomsUpdate', Object.values(rooms).map(r => ({
            id: r.id,
            playersCount: r.players.length,
            status: r.status,
            hasPassword: !!r.password
        })));
    };

    // Listen to leaveRoom (Explicit)
    socket.on('leaveRoom', ({ roomId, userId: uid }) => {
        // Clear any disconnect timers if they exist (user might have "disconnected" then "left"?)
        // Actually leaveRoom implies active socket.
        handleLeaveRoom(roomId, uid || userId, false);
    });

    // Disconnect Handling
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId} (${socket.id})`);

        // Find rooms
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players.includes(userId)) {
                if (room.sockets[userId] === socket.id) {
                    handleLeaveRoom(roomId, userId, true);
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
