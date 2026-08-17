import { db } from "./storage";
import {
  teams,
  teamMembers,
  teamGoals,
  teamChatMessages,
  teamInvites,
  challenges,
  challengeParticipants,
  challengeWinners,
  mentorships,
  mentorshipReviews,
  socialFeedPosts,
  socialFeedComments,
  socialFeedLikes,
  directMessages,
  notifications,
  friendConnections,
  users,
  userProfiles,
  xpTransactions,
  achievements,
  userAchievements,
  goals,
  type Team,
  type TeamMember,
  type TeamGoal,
  type Challenge,
  type ChallengeParticipant,
  type Mentorship,
  type SocialFeedPost,
  type Notification,
  type FriendConnection,
  type InsertTeam,
  type InsertTeamMember,
  type InsertTeamGoal,
  type InsertChallenge,
  type InsertChallengeParticipant,
  type InsertMentorship,
  type InsertSocialFeedPost,
  type InsertNotification,
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, gte, lte, ne, inArray } from "drizzle-orm";
import { Server as SocketIOServer } from "socket.io";

// Socket.IO instance for real-time updates
let io: SocketIOServer | null = null;

export function initializeSocialSocket(socketServer: SocketIOServer) {
  io = socketServer;
  // Note: Event handlers (join_team, join_challenge) are now centralized in server/socket.ts
  // This function just stores the io instance for use by social service functions
  console.log('[Social Service] Socket.IO instance initialized');
}

// ===== TEAM MANAGEMENT =====

export async function createTeam(data: InsertTeam): Promise<Team> {
  const [team] = await db.insert(teams).values(data).returning();
  
  // Add creator as team owner
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: team.createdById,
    role: "owner",
  });
  
  // Create activity post
  await createSocialPost({
    userId: team.createdById,
    postType: "team_created",
    content: `Created a new team: ${team.name}`,
    metadata: { customData: { teamId: team.id, teamName: team.name } },
  });
  
  return team;
}

export async function joinTeam(teamId: string, userId: string): Promise<TeamMember> {
  // Check if team has space
  const team = await getTeam(teamId);
  if (!team) throw new Error("Team not found");
  
  const memberCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  
  if (memberCount[0].count >= (team.maxMembers || 20)) {
    throw new Error("Team is full");
  }
  
  // Add member
  const [member] = await db
    .insert(teamMembers)
    .values({ teamId, userId, role: "member" })
    .returning();
  
  // Send notification to team
  await notifyTeam(teamId, {
    type: "team_member_joined",
    title: "New Team Member",
    message: `A new member has joined the team!`,
    category: "social",
    relatedUserId: userId,
    relatedTeamId: teamId,
  });
  
  // Create activity post
  await createSocialPost({
    userId,
    postType: "team_joined",
    content: `Joined team: ${team.name}`,
    metadata: { customData: { teamId, teamName: team.name } },
  });
  
  return member;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  return team || null;
}

export async function getTeamMembers(teamId: string) {
  return await db
    .select({
      member: teamMembers,
      user: users,
      profile: userProfiles,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(desc(teamMembers.contributionXp));
}

export async function getUserTeams(userId: string) {
  return await db
    .select({
      team: teams,
      membership: teamMembers,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));
}

export async function createTeamGoal(data: InsertTeamGoal): Promise<TeamGoal> {
  const [goal] = await db.insert(teamGoals).values(data).returning();
  
  // Notify team members
  await notifyTeam(data.teamId, {
    type: "team_goal_created",
    title: "New Team Goal",
    message: `New team goal: ${data.title}`,
    category: "social",
    relatedTeamId: data.teamId,
  });
  
  return goal;
}

export async function updateTeamGoalProgress(
  goalId: string,
  progress: number
): Promise<void> {
  const [goal] = await db
    .select()
    .from(teamGoals)
    .where(eq(teamGoals.id, goalId));
  
  if (!goal) return;
  
  const newValue = (goal.currentValue || 0) + progress;
  const completed = newValue >= goal.targetValue;
  
  await db
    .update(teamGoals)
    .set({
      currentValue: newValue,
      status: completed ? "completed" : goal.status,
      completedAt: completed ? new Date() : null,
    })
    .where(eq(teamGoals.id, goalId));
  
  if (completed) {
    // Award XP and coins to team members
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, goal.teamId));
    
    for (const member of members) {
      await awardXP(member.userId, goal.xpReward || 0, "team_goal_complete", goalId);
    }
    
    // Create celebration post
    await createSocialPost({
      userId: members[0].userId, // Use first member as poster
      postType: "team_goal_complete",
      content: `Team completed goal: ${goal.title}!`,
      metadata: { customData: { goalTitle: goal.title, xpReward: goal.xpReward } },
    });
  }
}

export async function sendTeamInvite(
  teamId: string,
  invitedById: string,
  invitedUserId?: string,
  inviteEmail?: string
): Promise<string> {
  // Generate unique invite code
  const inviteCode = generateInviteCode();
  
  await db.insert(teamInvites).values({
    teamId,
    invitedById,
    invitedUserId,
    inviteEmail,
    inviteCode,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
  
  if (invitedUserId) {
    await createNotification({
      userId: invitedUserId,
      type: "team_invite",
      title: "Team Invitation",
      message: `You've been invited to join a team!`,
      category: "social",
      relatedTeamId: teamId,
      relatedUserId: invitedById,
      actionUrl: `/teams/invite/${inviteCode}`,
    });
  }
  
  return inviteCode;
}

// ===== CHALLENGES & COMPETITIONS =====

export async function createChallenge(data: InsertChallenge): Promise<Challenge> {
  const [challenge] = await db.insert(challenges).values([data]).returning();
  
  // Create activity post
  if (data.creatorId) {
    await createSocialPost({
      userId: data.creatorId,
      postType: "challenge_created",
      content: `Created a new challenge: ${data.title}`,
      challengeId: challenge.id,
      metadata: { customData: { challengeTitle: data.title, endDate: data.endDate } },
    });
  }
  
  // Notify friends if it's a public challenge
  if (data.visibility === "public" && data.creatorId) {
    const friends = await getFriends(data.creatorId);
    for (const friend of friends) {
      await createNotification({
        userId: friend.friendId,
        type: "challenge_invite",
        title: "New Challenge Available",
        message: `Your friend created a challenge: ${data.title}`,
        category: "social",
        relatedChallengeId: challenge.id,
        relatedUserId: data.creatorId,
        actionUrl: `/challenges/${challenge.id}`,
      });
    }
  }
  
  return challenge;
}

export async function joinChallenge(
  challengeId: string,
  userId?: string,
  teamId?: string
): Promise<ChallengeParticipant> {
  if (!userId && !teamId) {
    throw new Error("Either userId or teamId must be provided");
  }
  
  const [participant] = await db
    .insert(challengeParticipants)
    .values({ challengeId, userId, teamId })
    .returning();
  
  // Update challenge status if needed
  const challenge = await getChallenge(challengeId);
  if (challenge && challenge.status === "upcoming" && new Date() >= challenge.startDate) {
    await db
      .update(challenges)
      .set({ status: "active" })
      .where(eq(challenges.id, challengeId));
  }
  
  // Create activity post
  if (userId) {
    await createSocialPost({
      userId,
      postType: "challenge_joined",
      content: `Joined challenge: ${challenge?.title}`,
      challengeId,
      metadata: { customData: { challengeTitle: challenge?.title } },
    });
  }
  
  // Broadcast to challenge room
  if (io) {
    io.to(`challenge:${challengeId}`).emit("participant-joined", {
      challengeId,
      participant,
    });
  }
  
  return participant;
}

export async function updateChallengeProgress(
  challengeId: string,
  participantId: string,
  score: number
): Promise<void> {
  const participant = await db
    .select()
    .from(challengeParticipants)
    .where(
      and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.id, participantId)
      )
    );
  
  if (!participant[0]) return;
  
  const newScore = (participant[0].currentScore || 0) + score;
  const bestScore = Math.max(newScore, participant[0].bestScore || 0);
  
  // Update participant score
  await db
    .update(challengeParticipants)
    .set({
      currentScore: newScore,
      bestScore,
      previousRank: participant[0].currentRank,
      lastUpdatedAt: new Date(),
    })
    .where(eq(challengeParticipants.id, participantId));
  
  // Update rankings
  await updateChallengeRankings(challengeId);
  
  // Broadcast live update
  if (io) {
    const leaderboard = await getChallengeLeaderboard(challengeId);
    io.to(`challenge:${challengeId}`).emit("leaderboard-update", {
      challengeId,
      leaderboard,
    });
  }
}

export async function updateChallengeRankings(challengeId: string): Promise<void> {
  const participants = await db
    .select()
    .from(challengeParticipants)
    .where(eq(challengeParticipants.challengeId, challengeId))
    .orderBy(desc(challengeParticipants.currentScore));
  
  // Update ranks
  for (let i = 0; i < participants.length; i++) {
    await db
      .update(challengeParticipants)
      .set({ currentRank: i + 1 })
      .where(eq(challengeParticipants.id, participants[i].id));
  }
}

export async function completeChallenge(challengeId: string): Promise<void> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return;
  
  // Get final rankings
  const participants = await db
    .select()
    .from(challengeParticipants)
    .where(
      and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.status, "active")
      )
    )
    .orderBy(desc(challengeParticipants.currentScore));
  
  // Award prizes
  const prizePool = challenge.prizePool as any;
  const distribution = challenge.prizeDistribution as any;
  
  if (prizePool && distribution) {
    // First place
    if (participants[0]) {
      await awardChallengePrize(
        challengeId,
        participants[0],
        1,
        prizePool,
        distribution.first
      );
    }
    
    // Second place
    if (participants[1] && distribution.second) {
      await awardChallengePrize(
        challengeId,
        participants[1],
        2,
        prizePool,
        distribution.second
      );
    }
    
    // Third place
    if (participants[2] && distribution.third) {
      await awardChallengePrize(
        challengeId,
        participants[2],
        3,
        prizePool,
        distribution.third
      );
    }
  }
  
  // Update challenge status
  await db
    .update(challenges)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(challenges.id, challengeId));
  
  // Create celebration posts for winners
  if (participants[0]?.userId) {
    await createSocialPost({
      userId: participants[0].userId,
      postType: "challenge_win",
      content: `Won 1st place in challenge: ${challenge.title}!`,
      challengeId,
      metadata: {
        placement: 1,
        customData: {
          challengeTitle: challenge.title,
          finalScore: participants[0].currentScore,
        },
      },
    });
  }
}

async function awardChallengePrize(
  challengeId: string,
  participant: ChallengeParticipant,
  placement: number,
  prizePool: any,
  distributionPercent: number
): Promise<void> {
  const xpReward = prizePool.xp ? Math.floor((prizePool.xp * distributionPercent) / 100) : 0;
  const coinReward = prizePool.coins
    ? Math.floor((prizePool.coins * distributionPercent) / 100)
    : 0;
  
  // Record winner
  await db.insert(challengeWinners).values({
    challengeId,
    participantId: participant.id,
    placement,
    finalScore: participant.currentScore || 0,
    xpAwarded: xpReward,
    coinsAwarded: coinReward,
    badgesAwarded: placement === 1 ? prizePool.badges : [],
  });
  
  // Award XP and coins
  if (participant.userId) {
    if (xpReward > 0) {
      await awardXP(participant.userId, xpReward, "challenge_win", challengeId);
    }
    if (coinReward > 0) {
      await awardCoins(participant.userId, coinReward, "challenge_win", challengeId);
    }
    
    // Send notification
    await createNotification({
      userId: participant.userId,
      type: "challenge_win",
      title: `Challenge Complete - ${placement === 1 ? "🥇" : placement === 2 ? "🥈" : "🥉"}`,
      message: `You placed #${placement} in the challenge!`,
      category: "achievements",
      relatedChallengeId: challengeId,
      actionUrl: `/challenges/${challengeId}/results`,
    });
  }
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId));
  return challenge || null;
}

export async function getChallengeLeaderboard(challengeId: string) {
  return await db
    .select({
      participant: challengeParticipants,
      user: users,
      team: teams,
    })
    .from(challengeParticipants)
    .leftJoin(users, eq(challengeParticipants.userId, users.id))
    .leftJoin(teams, eq(challengeParticipants.teamId, teams.id))
    .where(eq(challengeParticipants.challengeId, challengeId))
    .orderBy(asc(challengeParticipants.currentRank));
}

export async function getActiveChallenges() {
  return await db
    .select()
    .from(challenges)
    .where(eq(challenges.status, "active"))
    .orderBy(desc(challenges.startDate));
}

export async function getUpcomingChallenges() {
  return await db
    .select()
    .from(challenges)
    .where(eq(challenges.status, "upcoming"))
    .orderBy(asc(challenges.startDate));
}

// ===== MENTORSHIP SYSTEM =====

export async function createMentorship(
  mentorId: string,
  menteeId: string,
  goalCategory?: string
): Promise<Mentorship> {
  // Check if mentor is qualified (level 20+)
  const mentorProfile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, mentorId));
  
  if (!mentorProfile[0] || (mentorProfile[0].currentLevel || 0) < 20) {
    throw new Error("Mentor must be level 20 or higher");
  }
  
  // Calculate matching score based on shared interests and goals
  const matchingScore = await calculateMentorMatchScore(mentorId, menteeId, goalCategory);
  
  const [mentorship] = await db
    .insert(mentorships)
    .values({
      mentorId,
      menteeId,
      goalCategory,
      matchingScore: matchingScore.toString(),
      status: "active",
    })
    .returning();
  
  // Notify both parties
  await createNotification({
    userId: menteeId,
    type: "mentorship_started",
    title: "Mentorship Started",
    message: "You have been matched with a mentor!",
    category: "social",
    relatedUserId: mentorId,
    actionUrl: `/mentorship/${mentorship.id}`,
  });
  
  await createNotification({
    userId: mentorId,
    type: "mentorship_started",
    title: "New Mentee",
    message: "You have a new mentee!",
    category: "social",
    relatedUserId: menteeId,
    actionUrl: `/mentorship/${mentorship.id}`,
  });
  
  // Create activity posts
  await createSocialPost({
    userId: mentorId,
    postType: "mentor_matched",
    content: "Started mentoring a new user!",
    metadata: { customData: { mentorshipId: mentorship.id } },
  });
  
  return mentorship;
}

export async function updateMentorshipProgress(
  mentorshipId: string,
  progressDelta: number
): Promise<void> {
  const [mentorship] = await db
    .select()
    .from(mentorships)
    .where(eq(mentorships.id, mentorshipId));
  
  if (!mentorship) return;
  
  const newProgress = Math.min(100, Number(mentorship.menteeProgress) + progressDelta);
  
  await db
    .update(mentorships)
    .set({
      menteeProgress: newProgress.toString(),
      sessionsCompleted: (mentorship.sessionsCompleted || 0) + 1,
    })
    .where(eq(mentorships.id, mentorshipId));
  
  // Award XP to mentor based on mentee progress
  const xpReward = Math.floor(progressDelta * 10);
  await db
    .update(mentorships)
    .set({
      xpEarnedByMentor: (mentorship.xpEarnedByMentor || 0) + xpReward,
    })
    .where(eq(mentorships.id, mentorshipId));
  
  await awardXP(mentorship.mentorId, xpReward, "mentorship_progress", mentorshipId);
  
  // Complete mentorship if progress reaches 100%
  if (newProgress >= 100) {
    await completeMentorship(mentorshipId);
  }
}

export async function completeMentorship(mentorshipId: string): Promise<void> {
  await db
    .update(mentorships)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(mentorships.id, mentorshipId));
  
  const [mentorship] = await db
    .select()
    .from(mentorships)
    .where(eq(mentorships.id, mentorshipId));
  
  if (!mentorship) return;
  
  // Award completion bonus to mentor
  await awardXP(mentorship.mentorId, 500, "mentorship_complete", mentorshipId);
  await awardCoins(mentorship.mentorId, 100, "mentorship_complete", mentorshipId);
  
  // Create celebration post
  await createSocialPost({
    userId: mentorship.mentorId,
    postType: "mentorship_complete",
    content: "Successfully completed a mentorship!",
    metadata: {
      customData: {
        mentorshipId,
        totalXpEarned: (mentorship.xpEarnedByMentor || 0) + 500,
      },
    },
  });
}

export async function rateMentor(
  mentorshipId: string,
  reviewerId: string,
  rating: number,
  review?: string,
  detailedRatings?: {
    knowledge?: number;
    communication?: number;
    supportiveness?: number;
  }
): Promise<void> {
  await db.insert(mentorshipReviews).values({
    mentorshipId,
    reviewerId,
    rating,
    review,
    knowledgeRating: detailedRatings?.knowledge,
    communicationRating: detailedRatings?.communication,
    supportivenessRating: detailedRatings?.supportiveness,
  });
  
  // Update mentor's average rating (store in user profile)
  const [mentorship] = await db
    .select()
    .from(mentorships)
    .where(eq(mentorships.id, mentorshipId));
  
  if (mentorship) {
    // Award bonus XP for high ratings
    if (rating >= 4) {
      await awardXP(mentorship.mentorId, 100, "mentor_review", mentorshipId);
    }
  }
}

async function calculateMentorMatchScore(
  mentorId: string,
  menteeId: string,
  goalCategory?: string
): Promise<number> {
  // Simple scoring algorithm - can be enhanced
  let score = 50; // Base score
  
  // Check if mentor has experience in the goal category
  if (goalCategory) {
    const mentorGoals = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.userId, mentorId),
          eq(goals.category, goalCategory),
          eq(goals.status, "completed")
        )
      );
    
    score += mentorGoals.length * 10; // +10 for each completed goal in category
  }
  
  // Cap at 100
  return Math.min(100, score);
}

// ===== SOCIAL FEED =====

export async function createSocialPost(data: InsertSocialFeedPost): Promise<SocialFeedPost> {
  const [post] = await db.insert(socialFeedPosts).values([data]).returning();
  
  // Notify friends for certain post types
  if (["achievement", "goal_complete", "level_up", "challenge_win"].includes(data.postType)) {
    const friends = await getFriends(data.userId);
    
    // Broadcast to friends' feeds
    if (io) {
      for (const friend of friends) {
        io.to(`user:${friend.friendId}`).emit("friend-activity", {
          post,
          userId: data.userId,
        });
      }
    }
  }
  
  return post;
}

export async function likePost(postId: string, userId: string): Promise<void> {
  try {
    await db.insert(socialFeedLikes).values({ postId, userId });
    
    // Update like count
    await db
      .update(socialFeedPosts)
      .set({ likesCount: sql`${socialFeedPosts.likesCount} + 1` })
      .where(eq(socialFeedPosts.id, postId));
    
    // Notify post owner
    const [post] = await db
      .select()
      .from(socialFeedPosts)
      .where(eq(socialFeedPosts.id, postId));
    
    if (post && post.userId !== userId) {
      await createNotification({
        userId: post.userId,
        type: "like",
        title: "Post Liked",
        message: "Someone liked your post",
        category: "social",
        relatedUserId: userId,
        relatedPostId: postId,
      });
    }
  } catch (error) {
    // Like already exists
    console.error("Like already exists", error);
  }
}

export async function commentOnPost(
  postId: string,
  userId: string,
  comment: string
): Promise<void> {
  await db.insert(socialFeedComments).values({ postId, userId, comment });
  
  // Update comment count
  await db
    .update(socialFeedPosts)
    .set({ commentsCount: sql`${socialFeedPosts.commentsCount} + 1` })
    .where(eq(socialFeedPosts.id, postId));
  
  // Notify post owner
  const [post] = await db
    .select()
    .from(socialFeedPosts)
    .where(eq(socialFeedPosts.id, postId));
  
  if (post && post.userId !== userId) {
    await createNotification({
      userId: post.userId,
      type: "comment",
      title: "New Comment",
      message: "Someone commented on your post",
      category: "social",
      relatedUserId: userId,
      relatedPostId: postId,
    });
  }
}

export async function getFriendsFeed(userId: string, limit = 20) {
  // Get friend IDs
  const friends = await getFriends(userId);
  const friendIds = friends.map((f) => f.friendId);
  friendIds.push(userId); // Include user's own posts
  
  if (friendIds.length === 0) {
    return [];
  }
  
  // Get posts from friends
  const posts = await db
    .select({
      post: socialFeedPosts,
      user: users,
      likesCount: socialFeedPosts.likesCount,
      commentsCount: socialFeedPosts.commentsCount,
    })
    .from(socialFeedPosts)
    .innerJoin(users, eq(socialFeedPosts.userId, users.id))
    .where(inArray(socialFeedPosts.userId, friendIds))
    .orderBy(desc(socialFeedPosts.createdAt))
    .limit(limit);
  
  // Check if current user liked each post
  const postsWithLikeStatus = await Promise.all(
    posts.map(async (p) => {
      const [like] = await db
        .select()
        .from(socialFeedLikes)
        .where(
          and(
            eq(socialFeedLikes.postId, p.post.id),
            eq(socialFeedLikes.userId, userId)
          )
        );
      return { ...p, userLiked: !!like };
    })
  );
  
  return postsWithLikeStatus;
}

// ===== FRIEND SYSTEM =====

export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  // Check if already friends or request exists
  const existing = await db
    .select()
    .from(friendConnections)
    .where(
      or(
        and(
          eq(friendConnections.userId, userId),
          eq(friendConnections.friendId, friendId)
        ),
        and(
          eq(friendConnections.userId, friendId),
          eq(friendConnections.friendId, userId)
        )
      )
    );
  
  if (existing.length > 0) {
    throw new Error("Friend request already exists or you are already friends");
  }
  
  // Create friend request
  await db.insert(friendConnections).values({
    userId,
    friendId,
    status: "pending",
  });
  
  // Send notification
  await createNotification({
    userId: friendId,
    type: "friend_request",
    title: "Friend Request",
    message: "You have a new friend request!",
    category: "social",
    relatedUserId: userId,
    actionUrl: `/profile/friends`,
  });
}

export async function acceptFriendRequest(userId: string, friendId: string): Promise<void> {
  // Update the request status
  await db
    .update(friendConnections)
    .set({ 
      status: "accepted",
      acceptedAt: new Date()
    })
    .where(
      and(
        eq(friendConnections.userId, friendId),
        eq(friendConnections.friendId, userId),
        eq(friendConnections.status, "pending")
      )
    );
  
  // Create reverse connection for bidirectional friendship
  await db.insert(friendConnections).values({
    userId,
    friendId,
    status: "accepted",
    acceptedAt: new Date(),
  });
  
  // Send notification to requester
  await createNotification({
    userId: friendId,
    type: "friend_request_accepted",
    title: "Friend Request Accepted",
    message: "Your friend request was accepted!",
    category: "social",
    relatedUserId: userId,
  });
  
  // Create activity posts
  await createSocialPost({
    userId,
    postType: "friend_added",
    content: "Made a new friend!",
    metadata: { customData: { friendId } },
  });
}

export async function getFriends(userId: string): Promise<FriendConnection[]> {
  return await db
    .select()
    .from(friendConnections)
    .where(
      and(
        eq(friendConnections.userId, userId),
        eq(friendConnections.status, "accepted")
      )
    );
}

export async function getFriendRequests(userId: string) {
  return await db
    .select({
      request: friendConnections,
      user: users,
    })
    .from(friendConnections)
    .innerJoin(users, eq(friendConnections.userId, users.id))
    .where(
      and(
        eq(friendConnections.friendId, userId),
        eq(friendConnections.status, "pending")
      )
    );
}

// ===== NOTIFICATIONS =====

export async function createNotification(data: InsertNotification): Promise<void> {
  const [notification] = await db.insert(notifications).values(data).returning();
  
  // Send real-time notification
  if (io) {
    io.to(`user:${data.userId}`).emit("notification", notification);
  }
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }
  
  return await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
}

// ===== DIRECT MESSAGES =====

export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  message: string
): Promise<void> {
  // Check if they are friends
  const [friendship] = await db
    .select()
    .from(friendConnections)
    .where(
      and(
        eq(friendConnections.userId, senderId),
        eq(friendConnections.friendId, receiverId),
        eq(friendConnections.status, "accepted")
      )
    );
  
  if (!friendship) {
    throw new Error("You can only message friends");
  }
  
  const [dm] = await db
    .insert(directMessages)
    .values({ senderId, receiverId, message })
    .returning();
  
  // Send real-time message
  if (io) {
    io.to(`user:${receiverId}`).emit("direct-message", {
      message: dm,
      senderId,
    });
  }
  
  // Create notification
  await createNotification({
    userId: receiverId,
    type: "direct_message",
    title: "New Message",
    message: "You have a new message",
    category: "social",
    relatedUserId: senderId,
    actionUrl: `/messages/${senderId}`,
  });
}

export async function getConversation(userId: string, friendId: string) {
  return await db
    .select()
    .from(directMessages)
    .where(
      or(
        and(
          eq(directMessages.senderId, userId),
          eq(directMessages.receiverId, friendId)
        ),
        and(
          eq(directMessages.senderId, friendId),
          eq(directMessages.receiverId, userId)
        )
      )
    )
    .orderBy(asc(directMessages.createdAt));
}

// ===== HELPER FUNCTIONS =====

async function awardXP(
  userId: string,
  amount: number,
  source: string,
  sourceId?: string
): Promise<void> {
  await db.insert(xpTransactions).values({
    userId,
    delta: amount,
    source,
    sourceId,
    reason: `Earned ${amount} XP from ${source}`,
  });
  
  // Update user profile
  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  
  if (profile[0]) {
    const newTotalXp = (profile[0].totalXp || 0) + amount;
    const newLevel = Math.floor(newTotalXp / 1000) + 1;
    
    await db
      .update(userProfiles)
      .set({
        totalXp: newTotalXp,
        currentLevel: newLevel,
      })
      .where(eq(userProfiles.userId, userId));
    
    // Check for level up
    if (newLevel > (profile[0].currentLevel || 1)) {
      await createSocialPost({
        userId,
        postType: "level_up",
        content: `Reached level ${newLevel}!`,
        metadata: { customData: { level: newLevel, totalXp: newTotalXp } },
      });
    }
  }
}

async function awardCoins(
  userId: string,
  amount: number,
  source: string,
  sourceId?: string
): Promise<void> {
  await db
    .update(users)
    .set({ coinBalance: sql`${users.coinBalance} + ${amount}` })
    .where(eq(users.id, userId));
}

async function notifyTeam(teamId: string, notification: Omit<InsertNotification, 'userId'>): Promise<void> {
  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  
  for (const member of members) {
    await createNotification({
      ...notification,
      userId: member.userId,
    });
  }
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Export the social service
export const socialService = {
  // Teams
  createTeam,
  joinTeam,
  getTeam,
  getTeamMembers,
  getUserTeams,
  createTeamGoal,
  updateTeamGoalProgress,
  sendTeamInvite,
  
  // Challenges
  createChallenge,
  joinChallenge,
  updateChallengeProgress,
  completeChallenge,
  getChallenge,
  getChallengeLeaderboard,
  getActiveChallenges,
  getUpcomingChallenges,
  
  // Mentorship
  createMentorship,
  updateMentorshipProgress,
  completeMentorship,
  rateMentor,
  
  // Social Feed
  createSocialPost,
  likePost,
  commentOnPost,
  getFriendsFeed,
  
  // Friends
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getFriendRequests,
  
  // Notifications
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Direct Messages
  sendDirectMessage,
  getConversation,
  
  // Socket initialization
  initializeSocialSocket,
};