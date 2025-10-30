export const socialService = {
  getFeed: async (userId: string) => {
    return [];
  },
  createPost: async (userId: string, content: string) => {
    return { id: "post-1", content, userId };
  },
  sendTeamInvite: async (teamId: string, userId: string, inviteeUserId?: string, inviteeEmail?: string) => {
    console.log(`Social: sendTeamInvite to ${inviteeEmail || inviteeUserId} for team ${teamId} by ${userId}`);
    return "invite-code-123";
  },
  joinTeam: async (teamId: string, userId: string) => {
    console.log(`Social: joinTeam ${teamId} by user ${userId}`);
    return { id: "member-1", teamId, userId, role: "member" };
  },
};
