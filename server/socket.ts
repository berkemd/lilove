import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { z } from "zod";
import passport from "passport";
import { sessionMiddleware } from "./index.js";
import { notificationService } from "./notifications";
import { VisualizationEngine } from "./visualizationEngine";
import { db } from "./storage";
import { 
  teams, 
  teamMembers, 
  teamChatMessages,
  challenges, 
  challengeParticipants,
  goals,
  users,
  userProfiles
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import admin from 'firebase-admin';

// Track active connections and resources for cleanup
interface SocketConnection {
  userId: string;
  connectedAt: Date;
  intervals: NodeJS.Timeout[];
  rooms: Set<string>;
}

const activeConnections = new Map<string, SocketConnection>();
const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

// Validation schemas for Socket.IO events
const joinTeamSchema = z.object({
  teamId: z.string().uuid(),
});

const joinChallengeSchema = z.object({
  challengeId: z.string().uuid(),
});

const joinGoalSchema = z.object({
  goalId: z.string().uuid(),
});

const startVisualizationSchema = z.object({
  audioFileId: z.string(),
  visualizationId: z.string(),
  audioAnalysis: z.any(),
  visualization: z.any(),
});

const playbackControlSchema = z.object({
  action: z.enum(['play', 'pause', 'seek']),
  currentTime: z.number().optional(),
});

const updateSettingsSchema = z.object({
  settings: z.object({
    particleDensity: z.number().min(0).max(100).optional(),
    motionSpeed: z.number().min(0).max(100).optional(),
    colorIntensity: z.number().min(0).max(100).optional(),
    colors: z.array(z.string()).optional(),
    enableSync: z.boolean().optional(),
    enableGlow: z.boolean().optional(),
  }).partial(),
});

const changeThemeSchema = z.object({
  theme: z.enum(['particles', 'waveform', 'fractal', 'fluid']),
});

const teamMessageSchema = z.object({
  teamId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

const teamTypingSchema = z.object({
  teamId: z.string().uuid(),
  isTyping: z.boolean(),
});

/**
 * Verify Firebase token and return user info
 */
async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string; name?: string } | null> {
  try {
    if (!admin.apps.length) {
      console.log('[Socket.IO] Firebase Admin not initialized, skipping token verification');
      return null;
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (error: any) {
    if (error.code !== 'auth/argument-error') {
      console.log('[Socket.IO] Firebase token verification failed:', error.code || error.message);
    }
    return null;
  }
}

/**
 * Find or create user from Firebase auth for socket connections
 * Mirrors the findOrCreateFirebaseUser logic from auth middleware
 */
async function findOrCreateFirebaseUser(firebaseUser: { uid: string; email?: string; name?: string }): Promise<string | null> {
  try {
    // First try to find by firebaseUid
    let [user] = await db.select().from(users)
      .where(eq(users.firebaseUid, firebaseUser.uid))
      .limit(1);
    
    if (user) {
      return user.id;
    }
    
    // Try to find by email if firebaseUid not found
    if (firebaseUser.email) {
      [user] = await db.select().from(users)
        .where(eq(users.email, firebaseUser.email))
        .limit(1);
      
      if (user) {
        // Update the existing user with firebaseUid
        await db.update(users)
          .set({ firebaseUid: firebaseUser.uid })
          .where(eq(users.id, user.id));
        console.log(`[Socket.IO] Linked Firebase UID to existing user ${user.id}`);
        return user.id;
      }
    }
    
    // Create new user
    const [newUser] = await db.insert(users).values({
      email: firebaseUser.email || `${firebaseUser.uid}@firebase.local`,
      firebaseUid: firebaseUser.uid,
      firstName: firebaseUser.name?.split(' ')[0] || 'User',
      lastName: firebaseUser.name?.split(' ').slice(1).join(' ') || '',
      subscriptionTier: 'free',
    }).returning();
    
    console.log(`[Socket.IO] Created new user ${newUser.id} for Firebase UID ${firebaseUser.uid}`);
    return newUser.id;
  } catch (error) {
    console.error('[Socket.IO] Error finding/creating user by Firebase UID:', error);
    return null;
  }
}

/**
 * Session-based authentication middleware for Socket.IO
 * Validates Replit Auth session or Firebase token and extracts userId
 */
async function authenticateSocket(socket: Socket): Promise<string | null> {
  try {
    // First, try Firebase token from handshake auth
    const authData = socket.handshake.auth;
    if (authData?.token) {
      const firebaseUser = await verifyFirebaseToken(authData.token);
      if (firebaseUser) {
        const userId = await findOrCreateFirebaseUser(firebaseUser);
        if (userId) {
          console.log(`[Socket.IO] Firebase authenticated user ${userId} on socket ${socket.id}`);
          return userId;
        }
      }
    }
    
    // Fallback: Check session-based authentication
    const req = socket.request as any;
    
    // Check if session exists and is authenticated
    if (!req.session || !req.user || !req.isAuthenticated()) {
      console.warn(`[Socket.IO] Unauthenticated connection attempt from ${socket.id}`);
      return null;
    }

    // Extract userId from Replit Auth claims
    const userId = req.user.claims?.sub;
    
    if (!userId) {
      console.warn(`[Socket.IO] No user ID in session for socket ${socket.id}`);
      return null;
    }

    // Verify user exists in database
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      console.warn(`[Socket.IO] User ${userId} not found in database`);
      return null;
    }

    console.log(`[Socket.IO] Session authenticated user ${userId} on socket ${socket.id}`);
    return userId;
  } catch (error) {
    console.error(`[Socket.IO] Authentication error:`, error);
    return null;
  }
}

/**
 * Verify user owns/is member of a team
 */
async function verifyTeamAccess(userId: string, teamId: string): Promise<boolean> {
  try {
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.teamId, teamId)
      ))
      .limit(1);
    
    return !!membership;
  } catch (error) {
    console.error(`[Socket.IO] Error verifying team access:`, error);
    return false;
  }
}

/**
 * Verify user is participant in a challenge
 */
async function verifyChallengeAccess(userId: string, challengeId: string): Promise<boolean> {
  try {
    const [participation] = await db
      .select()
      .from(challengeParticipants)
      .where(and(
        eq(challengeParticipants.userId, userId),
        eq(challengeParticipants.challengeId, challengeId)
      ))
      .limit(1);
    
    return !!participation;
  } catch (error) {
    console.error(`[Socket.IO] Error verifying challenge access:`, error);
    return false;
  }
}

/**
 * Verify user owns a goal
 */
async function verifyGoalAccess(userId: string, goalId: string): Promise<boolean> {
  try {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(
        eq(goals.id, goalId),
        eq(goals.userId, userId)
      ))
      .limit(1);
    
    return !!goal;
  } catch (error) {
    console.error(`[Socket.IO] Error verifying goal access:`, error);
    return false;
  }
}

/**
 * Start heartbeat for connection health monitoring
 */
function startHeartbeat(socket: Socket, userId: string) {
  const interval = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping', { timestamp: Date.now() });
    } else {
      clearInterval(interval);
      heartbeatIntervals.delete(socket.id);
    }
  }, 30000); // Ping every 30 seconds

  heartbeatIntervals.set(socket.id, interval);

  // Listen for pong responses
  socket.on('pong', (data: { timestamp: number }) => {
    const latency = Date.now() - data.timestamp;
    console.log(`[Socket.IO] Heartbeat from user ${userId}: ${latency}ms latency`);
  });
}

/**
 * Clean up resources when socket disconnects
 */
function cleanupConnection(socketId: string) {
  const connection = activeConnections.get(socketId);
  
  if (connection) {
    // Clear all intervals
    connection.intervals.forEach(interval => clearInterval(interval));
    
    // Log disconnection
    const duration = Date.now() - connection.connectedAt.getTime();
    console.log(`[Socket.IO] User ${connection.userId} disconnected after ${Math.round(duration / 1000)}s`);
    
    activeConnections.delete(socketId);
  }

  // Clear heartbeat
  const heartbeat = heartbeatIntervals.get(socketId);
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeatIntervals.delete(socketId);
  }
}

/**
 * Initialize Socket.IO with authentication and event handlers
 */
export function initializeSocketIO(httpServer: HTTPServer, io: SocketIOServer) {
  console.log('[Socket.IO] Initializing authenticated Socket.IO server...');

  // Create visualization engine instance
  const visualizationEngine = new VisualizationEngine(io);

  // Pass io instance to services
  notificationService.setSocketIO(io);
  
  // Import and initialize social service
  import('./social').then(({ initializeSocialSocket }) => {
    initializeSocialSocket(io);
  });

  // Import and initialize gamification service
  import('./gamification').then(({ setSocketInstance }) => {
    setSocketInstance(io);
  });

  // CRITICAL FIX: Apply session middleware at Engine level
  // This preserves real request/response lifecycle for session persistence
  io.engine.use(sessionMiddleware as any);

  // Cookie-store fallback for when req.session is missing
  io.use(async (socket, next) => {
    const req = socket.request as any;
    
    // If session already loaded by Engine middleware, continue
    if (req.session) {
      return next();
    }
    
    // Fallback: Parse cookie and load session manually
    try {
      const cookie = require('cookie');
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const sessionId = cookies['connect.sid'];
      
      if (!sessionId) {
        console.warn('[Socket.IO] No session cookie found');
        return next();
      }
      
      // Extract session ID from signed cookie
      const signature = require('cookie-signature');
      const unsigned = signature.unsign(sessionId.slice(2), process.env.SESSION_SECRET!);
      
      if (!unsigned) {
        console.warn('[Socket.IO] Invalid session signature');
        return next();
      }
      
      // Load session from store
      const sessionStore = (sessionMiddleware as any).store;
      sessionStore.get(unsigned, (err: any, session: any) => {
        if (err) {
          console.error('[Socket.IO] Session store error:', err);
          return next();
        }
        
        if (session) {
          req.session = session;
          console.log('[Socket.IO] Session loaded via cookie fallback');
        }
        next();
      });
    } catch (error) {
      console.error('[Socket.IO] Cookie fallback error:', error);
      next();
    }
  });

  // Apply Passport initialization at handshake level
  io.use((socket, next) => {
    const req = socket.request as any;
    const res = {} as any; // Minimal response object for Passport
    
    passport.initialize()(req, res, (err) => {
      if (err) return next(err);
      passport.session()(req, res, next);
    });
  });

  // Authentication middleware - runs AFTER session middleware
  io.use(async (socket, next) => {
    try {
      const userId = await authenticateSocket(socket);
      
      if (!userId) {
        console.warn(`[Socket.IO] Rejecting unauthenticated connection from ${socket.id}`);
        return next(new Error('Authentication required'));
      }

      // Store userId in socket data for later use
      socket.data.userId = userId;
      next();
    } catch (error) {
      console.error(`[Socket.IO] Authentication middleware error:`, error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    
    console.log(`[Socket.IO] User ${userId} connected on socket ${socket.id}`);

    // Track connection
    activeConnections.set(socket.id, {
      userId,
      connectedAt: new Date(),
      intervals: [],
      rooms: new Set(),
    });

    // Start heartbeat
    startHeartbeat(socket, userId);

    // Auto-join user's personal notification room
    socket.join(`user:${userId}`);
    activeConnections.get(socket.id)?.rooms.add(`user:${userId}`);

    // Send initial unread notification count
    notificationService.getUnreadCount(userId).then(count => {
      socket.emit('notification_unread_count', count);
    }).catch(err => {
      console.error(`[Socket.IO] Error fetching unread count:`, err);
    });

    // ===== TEAM EVENTS =====
    
    socket.on('join_team', async (payload: unknown) => {
      try {
        const { teamId } = joinTeamSchema.parse(payload);
        
        // Verify user has access to this team
        const hasAccess = await verifyTeamAccess(userId, teamId);
        
        if (!hasAccess) {
          socket.emit('error', { 
            event: 'join_team',
            message: 'You are not a member of this team'
          });
          return;
        }

        // Join team room
        const roomName = `team:${teamId}`;
        socket.join(roomName);
        activeConnections.get(socket.id)?.rooms.add(roomName);
        
        console.log(`[Socket.IO] User ${userId} joined team ${teamId}`);
        socket.emit('joined_team', { teamId });
      } catch (error) {
        console.error(`[Socket.IO] Error joining team:`, error);
        socket.emit('error', { 
          event: 'join_team',
          message: error instanceof Error ? error.message : 'Failed to join team'
        });
      }
    });

    socket.on('leave_team', async (payload: unknown) => {
      try {
        const { teamId } = joinTeamSchema.parse(payload);
        const roomName = `team:${teamId}`;
        
        socket.leave(roomName);
        activeConnections.get(socket.id)?.rooms.delete(roomName);
        
        console.log(`[Socket.IO] User ${userId} left team ${teamId}`);
        socket.emit('left_team', { teamId });
      } catch (error) {
        console.error(`[Socket.IO] Error leaving team:`, error);
        socket.emit('error', {
          event: 'leave_team',
          message: error instanceof Error ? error.message : 'Failed to leave team'
        });
      }
    });

    // Team chat message handler
    socket.on('team_message', async (payload: unknown) => {
      try {
        const { teamId, message } = teamMessageSchema.parse(payload);
        
        // Verify user has access to this team
        const hasAccess = await verifyTeamAccess(userId, teamId);
        
        if (!hasAccess) {
          socket.emit('error', { 
            event: 'team_message',
            message: 'You are not a member of this team'
          });
          return;
        }

        // Get user info for the message
        const [user] = await db.select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
        }).from(users).where(eq(users.id, userId)).limit(1);

        // Save message to database
        const [chatMessage] = await db.insert(teamChatMessages).values({
          teamId,
          userId,
          message,
          messageType: 'text',
        }).returning();

        // Create message payload with user info
        const messagePayload = {
          id: chatMessage.id,
          teamId: chatMessage.teamId,
          userId: chatMessage.userId,
          message: chatMessage.message,
          messageType: chatMessage.messageType,
          createdAt: chatMessage.createdAt?.toISOString() || new Date().toISOString(),
          user: {
            id: user?.id || userId,
            displayName: user?.displayName,
            username: user?.username,
            profileImageUrl: user?.profileImageUrl,
          }
        };

        // Broadcast to team room
        io.to(`team:${teamId}`).emit(`team_message_${teamId}`, messagePayload);
        
        console.log(`[Socket.IO] User ${userId} sent message in team ${teamId}`);
      } catch (error) {
        console.error(`[Socket.IO] Error sending team message:`, error);
        socket.emit('error', { 
          event: 'team_message',
          message: error instanceof Error ? error.message : 'Failed to send message'
        });
      }
    });

    // Team typing indicator handler
    socket.on('team_typing', async (payload: unknown) => {
      try {
        const { teamId, isTyping } = teamTypingSchema.parse(payload);
        
        // Verify user has access to this team
        const hasAccess = await verifyTeamAccess(userId, teamId);
        
        if (!hasAccess) {
          return; // Silently ignore for typing indicators
        }

        // Get user info
        const [user] = await db.select({
          displayName: users.displayName,
          username: users.username,
        }).from(users).where(eq(users.id, userId)).limit(1);

        // Broadcast typing indicator to team room (except sender)
        socket.to(`team:${teamId}`).emit(`team_typing_${teamId}`, {
          userId,
          userName: user?.displayName || user?.username || 'Someone',
          isTyping,
        });
      } catch (error) {
        console.error(`[Socket.IO] Error handling typing indicator:`, error);
      }
    });

    // ===== CHALLENGE EVENTS =====
    
    socket.on('join_challenge', async (payload: unknown) => {
      try {
        const { challengeId } = joinChallengeSchema.parse(payload);
        
        // Verify user is participant
        const hasAccess = await verifyChallengeAccess(userId, challengeId);
        
        if (!hasAccess) {
          socket.emit('error', {
            event: 'join_challenge',
            message: 'You are not a participant in this challenge'
          });
          return;
        }

        // Join challenge room
        const roomName = `challenge:${challengeId}`;
        socket.join(roomName);
        activeConnections.get(socket.id)?.rooms.add(roomName);
        
        console.log(`[Socket.IO] User ${userId} joined challenge ${challengeId}`);
        socket.emit('joined_challenge', { challengeId });
      } catch (error) {
        console.error(`[Socket.IO] Error joining challenge:`, error);
        socket.emit('error', {
          event: 'join_challenge',
          message: error instanceof Error ? error.message : 'Failed to join challenge'
        });
      }
    });

    socket.on('leave_challenge', async (payload: unknown) => {
      try {
        const { challengeId } = joinChallengeSchema.parse(payload);
        const roomName = `challenge:${challengeId}`;
        
        socket.leave(roomName);
        activeConnections.get(socket.id)?.rooms.delete(roomName);
        
        console.log(`[Socket.IO] User ${userId} left challenge ${challengeId}`);
        socket.emit('left_challenge', { challengeId });
      } catch (error) {
        console.error(`[Socket.IO] Error leaving challenge:`, error);
        socket.emit('error', {
          event: 'leave_challenge',
          message: error instanceof Error ? error.message : 'Failed to leave challenge'
        });
      }
    });

    // ===== GOAL EVENTS =====
    
    socket.on('join_goal', async (payload: unknown) => {
      try {
        const { goalId } = joinGoalSchema.parse(payload);
        
        // Verify user owns this goal
        const hasAccess = await verifyGoalAccess(userId, goalId);
        
        if (!hasAccess) {
          socket.emit('error', {
            event: 'join_goal',
            message: 'You do not own this goal'
          });
          return;
        }

        // Join goal room for real-time updates
        const roomName = `goal:${goalId}`;
        socket.join(roomName);
        activeConnections.get(socket.id)?.rooms.add(roomName);
        
        console.log(`[Socket.IO] User ${userId} joined goal ${goalId}`);
        socket.emit('joined_goal', { goalId });
      } catch (error) {
        console.error(`[Socket.IO] Error joining goal:`, error);
        socket.emit('error', {
          event: 'join_goal',
          message: error instanceof Error ? error.message : 'Failed to join goal'
        });
      }
    });

    // ===== VISUALIZATION EVENTS =====
    // These are delegated to the VisualizationEngine but with validation
    
    socket.on('start_visualization', async (payload: unknown) => {
      try {
        const data = startVisualizationSchema.parse(payload);
        // VisualizationEngine handles the actual logic
        // It already has access to io and socket through its handlers
      } catch (error) {
        console.error(`[Socket.IO] Invalid visualization start payload:`, error);
        socket.emit('visualization_error', { 
          error: 'Invalid payload for start_visualization'
        });
      }
    });

    socket.on('playback_control', async (payload: unknown) => {
      try {
        playbackControlSchema.parse(payload);
        // VisualizationEngine handles the actual logic
      } catch (error) {
        console.error(`[Socket.IO] Invalid playback control payload:`, error);
        socket.emit('visualization_error', {
          error: 'Invalid payload for playback_control'
        });
      }
    });

    socket.on('update_settings', async (payload: unknown) => {
      try {
        updateSettingsSchema.parse(payload);
        // VisualizationEngine handles the actual logic
      } catch (error) {
        console.error(`[Socket.IO] Invalid settings update payload:`, error);
        socket.emit('visualization_error', {
          error: 'Invalid payload for update_settings'
        });
      }
    });

    socket.on('change_theme', async (payload: unknown) => {
      try {
        changeThemeSchema.parse(payload);
        // VisualizationEngine handles the actual logic
      } catch (error) {
        console.error(`[Socket.IO] Invalid theme change payload:`, error);
        socket.emit('visualization_error', {
          error: 'Invalid payload for change_theme'
        });
      }
    });

    // ===== DISCONNECT HANDLER =====
    
    socket.on('disconnect', (reason: string) => {
      console.log(`[Socket.IO] User ${userId} disconnected: ${reason}`);
      cleanupConnection(socket.id);
    });

    // ===== ERROR HANDLER =====
    
    socket.on('error', (error: Error) => {
      console.error(`[Socket.IO] Socket error for user ${userId}:`, error);
    });
  });

  // Graceful shutdown handler
  process.on('SIGTERM', () => {
    console.log('[Socket.IO] SIGTERM received, closing all connections...');
    
    // Close all active connections gracefully
    activeConnections.forEach((connection, socketId) => {
      cleanupConnection(socketId);
    });

    io.close(() => {
      console.log('[Socket.IO] All connections closed');
    });
  });

  console.log('[Socket.IO] Initialization complete');
  return io;
}

/**
 * Get active connection statistics
 */
export function getConnectionStats() {
  return {
    totalConnections: activeConnections.size,
    connections: Array.from(activeConnections.entries()).map(([socketId, conn]) => ({
      socketId,
      userId: conn.userId,
      connectedAt: conn.connectedAt,
      rooms: Array.from(conn.rooms),
      activeIntervals: conn.intervals.length,
    })),
  };
}
