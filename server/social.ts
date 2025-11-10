// Social Service - Friend connections, feed posts, and social interactions
import { db } from './storage';
import { friendConnections, socialFeedPosts, users } from '@shared/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export class SocialService {
  private io: any = null;

  initializeSocialSocket(socketIO: any) {
    this.io = socketIO;
    console.log('✅ Socket.IO connected to SocialService');
    
    // Setup socket event handlers
    this.io.on('connection', (socket: any) => {
      console.log('👤 User connected to social socket:', socket.id);
      
      // Join user's personal room
      socket.on('join', (userId: string) => {
        socket.join(`user:${userId}`);
      });
      
      // Handle social events
      socket.on('like_post', async (data: any) => {
        this.io.to(`user:${data.postOwnerId}`).emit('post_liked', data);
      });
      
      socket.on('disconnect', () => {
        console.log('👤 User disconnected from social socket:', socket.id);
      });
    });
  }

  async sendFriendRequest(fromUserId: string, toUserId: string) {
    // Check if connection already exists
    const existing = await db.select()
      .from(friendConnections)
      .where(or(
        and(eq(friendConnections.userId, fromUserId), eq(friendConnections.friendId, toUserId)),
        and(eq(friendConnections.userId, toUserId), eq(friendConnections.friendId, fromUserId))
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Friend request already exists');
    }

    // Create friend request
    await db.insert(friendConnections).values({
      userId: fromUserId,
      friendId: toUserId,
      status: 'pending'
    });

    return { success: true, message: 'Friend request sent' };
  }

  async acceptFriendRequest(userId: string, friendId: string) {
    await db.update(friendConnections)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(and(
        eq(friendConnections.userId, friendId),
        eq(friendConnections.friendId, userId)
      ));

    return { success: true, message: 'Friend request accepted' };
  }

  async getFriends(userId: string) {
    const connections = await db.select()
      .from(friendConnections)
      .where(or(
        eq(friendConnections.userId, userId),
        eq(friendConnections.friendId, userId)
      ));

    // Get friend user details
    const friendIds = connections.map(c => 
      c.userId === userId ? c.friendId : c.userId
    );

    if (friendIds.length === 0) {
      return [];
    }

    const friends = await db.select()
      .from(users)
      .where(or(...friendIds.map(id => eq(users.id, id))));

    return friends;
  }

  async createPost(userId: string, content: string, visibility: string = 'public') {
    const post = await db.insert(socialFeedPosts).values({
      userId,
      content,
      visibility: visibility as any,
      likes: 0,
      comments: 0
    }).returning();

    return post[0];
  }

  async getFeed(userId: string, limit: number = 20) {
    // Get user's own posts and friends' posts
    const posts = await db.select()
      .from(socialFeedPosts)
      .orderBy(desc(socialFeedPosts.createdAt))
      .limit(limit);

    return posts;
  }
}

export const socialService = new SocialService();
