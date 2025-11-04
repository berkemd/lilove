import { io, Socket } from 'socket.io-client';

// Socket instance
let socket: Socket | null = null;

// Initialize socket connection
export function initializeSocket(userId?: string): Socket {
  if (!socket) {
    try {
      socket = io(window.location.origin, {
        transports: ['websocket', 'polling'], // Add polling as fallback
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          userId
        }
      });

      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
      });

      socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
      // Return a mock socket that doesn't crash the app
      return createMockSocket();
    }
  }

  return socket;
}

// Create a mock socket for when initialization fails
function createMockSocket(): Socket {
  return {
    connected: false,
    emit: () => false,
    on: () => {},
    off: () => {},
    disconnect: () => {},
    connect: () => {},
    id: 'mock-socket',
  } as any;
}

// Get socket instance
export function getSocket(): Socket | null {
  return socket;
}

// Disconnect socket
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Socket event types
export interface NotificationEvent {
  id: string;
  type: 'friend_request' | 'team_invite' | 'challenge_update' | 'achievement' | 'message' | 'mention';
  title: string;
  message: string;
  data?: any;
  createdAt: string;
  read?: boolean;
}

export interface TeamChatMessage {
  id: string;
  teamId: string;
  userId: string;
  message: string;
  user: {
    id: string;
    displayName?: string;
    profileImageUrl?: string;
  };
  createdAt: string;
}

export interface ChallengeUpdate {
  challengeId: string;
  leaderboard: any[];
  participantCount: number;
  latestActivity?: {
    userId: string;
    userName: string;
    score: number;
    rank: number;
  };
}

export interface FriendActivityUpdate {
  userId: string;
  type: 'achievement' | 'goal_completed' | 'level_up' | 'streak' | 'challenge_joined';
  data: any;
  timestamp: string;
}

// Typed event emitters
export function emitJoinTeamRoom(teamId: string) {
  socket?.emit('join_team', teamId);
}

export function emitLeaveTeamRoom(teamId: string) {
  socket?.emit('leave_team', teamId);
}

export function emitJoinChallengeRoom(challengeId: string) {
  socket?.emit('join_challenge', challengeId);
}

export function emitLeaveChallengeRoom(challengeId: string) {
  socket?.emit('leave_challenge', challengeId);
}

export function emitSendTeamMessage(teamId: string, message: string) {
  socket?.emit('team_message', { teamId, message });
}

export function emitSendDirectMessage(receiverId: string, message: string) {
  socket?.emit('direct_message', { receiverId, message });
}

export function emitMarkNotificationRead(notificationId: string) {
  socket?.emit('mark_notification_read', notificationId);
}