export const socialService = {
  getFeed: async (userId: string) => {
    return [];
  },
  createPost: async (userId: string, content: string) => {
    return { id: "post-1", content, userId };
  }
};
