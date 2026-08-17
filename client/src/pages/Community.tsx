import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageCircle, Heart, Target, Trophy, Sparkles, 
  Send, ChevronDown, ChevronUp, Trash2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { CommunityChannel, CommunityPost, CommunityReply } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Heart,
  Target,
  Trophy,
  Sparkles,
};

type PostWithAuthor = CommunityPost & {
  author?: { displayName: string | null; profileImageUrl: string | null };
  isLiked?: boolean;
};

type ReplyWithAuthor = CommunityReply & {
  author?: { displayName: string | null; profileImageUrl: string | null };
};

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [isAnonymousPost, setIsAnonymousPost] = useState(false);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [isAnonymousReply, setIsAnonymousReply] = useState<Record<string, boolean>>({});

  const { data: channels, isLoading: channelsLoading } = useQuery<CommunityChannel[]>({
    queryKey: ["/api/community/channels"],
  });

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);
  
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: [`/api/community/channels/${selectedChannelId}/posts`],
    enabled: !!selectedChannelId,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; isAnonymous: boolean }) => {
      return apiRequest(`/api/community/channels/${selectedChannelId}/posts`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/channels/${selectedChannelId}/posts`] });
      setNewPostContent("");
      setIsAnonymousPost(false);
      toast({ title: "Post created", description: "Your post has been shared with the community." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest(`/api/community/posts/${postId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/channels/${selectedChannelId}/posts`] });
      toast({ title: "Post deleted" });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest(`/api/community/posts/${postId}/like`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/channels/${selectedChannelId}/posts`] });
    },
  });

  const handleSubmitPost = () => {
    if (!newPostContent.trim() || !selectedChannelId) return;
    createPostMutation.mutate({ content: newPostContent, isAnonymous: isAnonymousPost });
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || MessageCircle;
  };

  if (channelsLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-10rem)]" data-testid="community-loading">
        <div className="w-64 space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-32 w-full mb-4" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 md:gap-6 h-[calc(100vh-10rem)]" data-testid="community-page">
      <aside className="w-48 md:w-64 flex-shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-1">
                {channels?.map(channel => {
                  const IconComponent = getIconComponent(channel.icon || "MessageCircle");
                  return (
                    <motion.button
                      key={channel.id}
                      data-testid={`channel-${channel.id}`}
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                        selectedChannelId === channel.id
                          ? "bg-primary text-primary-foreground"
                          : "hover-elevate"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <IconComponent className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{channel.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>

      <main className="flex-1 min-w-0">
        {!selectedChannelId ? (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground" data-testid="select-channel-prompt">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a channel to view posts</p>
            </div>
          </Card>
        ) : (
          <div className="h-full flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  {selectedChannel && (
                    <>
                      {(() => {
                        const IconComponent = getIconComponent(selectedChannel.icon || "MessageCircle");
                        return <IconComponent className="w-5 h-5" />;
                      })()}
                      {selectedChannel.name}
                    </>
                  )}
                </CardTitle>
                {selectedChannel?.description && (
                  <p className="text-sm text-muted-foreground">{selectedChannel.description}</p>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-3">
                  <Textarea
                    data-testid="input-new-post"
                    placeholder="Share something with the community..."
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    className="resize-none text-sm"
                    rows={3}
                  />
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="anonymous-post"
                        data-testid="toggle-anonymous-post"
                        checked={isAnonymousPost}
                        onCheckedChange={setIsAnonymousPost}
                      />
                      <Label htmlFor="anonymous-post" className="text-sm">Post anonymously</Label>
                    </div>
                    <Button
                      data-testid="button-submit-post"
                      onClick={handleSubmitPost}
                      disabled={!newPostContent.trim() || createPostMutation.isPending}
                      size="sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {postsLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)
                ) : posts?.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground" data-testid="no-posts">
                    <p>No posts yet. Be the first to share!</p>
                  </Card>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {posts?.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={user?.id}
                        isExpanded={expandedPostId === post.id}
                        onToggleExpand={() => setExpandedPostId(
                          expandedPostId === post.id ? null : post.id
                        )}
                        onLike={() => likePostMutation.mutate(post.id)}
                        onDelete={() => deletePostMutation.mutate(post.id)}
                        replyContent={replyContent[post.id] || ""}
                        onReplyContentChange={(value) => setReplyContent(prev => ({ ...prev, [post.id]: value }))}
                        isAnonymousReply={isAnonymousReply[post.id] || false}
                        onAnonymousReplyChange={(value) => setIsAnonymousReply(prev => ({ ...prev, [post.id]: value }))}
                        channelId={selectedChannelId}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  isExpanded,
  onToggleExpand,
  onLike,
  onDelete,
  replyContent,
  onReplyContentChange,
  isAnonymousReply,
  onAnonymousReplyChange,
  channelId,
}: {
  post: PostWithAuthor;
  currentUserId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  onDelete: () => void;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  isAnonymousReply: boolean;
  onAnonymousReplyChange: (value: boolean) => void;
  channelId: string;
}) {
  const { toast } = useToast();

  const { data: replies } = useQuery<ReplyWithAuthor[]>({
    queryKey: [`/api/community/posts/${post.id}/replies`],
    enabled: isExpanded,
  });

  const createReplyMutation = useMutation({
    mutationFn: async (data: { content: string; isAnonymous: boolean }) => {
      return apiRequest(`/api/community/posts/${post.id}/replies`, {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/posts/${post.id}/replies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/community/channels/${channelId}/posts`] });
      onReplyContentChange("");
      onAnonymousReplyChange(false);
      toast({ title: "Reply added" });
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      return apiRequest(`/api/community/replies/${replyId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/community/posts/${post.id}/replies`] });
      queryClient.invalidateQueries({ queryKey: [`/api/community/channels/${channelId}/posts`] });
    },
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    createReplyMutation.mutate({ content: replyContent, isAnonymous: isAnonymousReply });
  };

  const isOwner = post.authorId === currentUserId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card data-testid={`post-${post.id}`}>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              {post.isAnonymous ? (
                <AvatarFallback>?</AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={post.author?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {post.author?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </>
              )}
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm" data-testid={`post-author-${post.id}`}>
                  {post.isAnonymous ? "Anonymous" : post.author?.displayName || "User"}
                </span>
                {post.isAnonymous && (
                  <Badge variant="secondary" className="text-xs">Anonymous</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt!), { addSuffix: true })}
                </span>
              </div>

              <p className="mt-1 text-sm whitespace-pre-wrap" data-testid={`post-content-${post.id}`}>
                {post.content}
              </p>

              <div className="flex items-center gap-3 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`button-like-${post.id}`}
                  onClick={onLike}
                  className="gap-1"
                >
                  <Heart className={`w-4 h-4 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`} />
                  <span className="text-xs">{post.likesCount || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`button-toggle-replies-${post.id}`}
                  onClick={onToggleExpand}
                  className="gap-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">{post.repliesCount || 0}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>

                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-delete-post-${post.id}`}
                    onClick={onDelete}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pl-4 border-l-2 border-muted space-y-3">
                      {replies?.map(reply => (
                        <ReplyItem
                          key={reply.id}
                          reply={reply}
                          isOwner={reply.authorId === currentUserId}
                          onDelete={() => deleteReplyMutation.mutate(reply.id)}
                        />
                      ))}

                      <div className="pt-2 space-y-2">
                        <Textarea
                          data-testid={`input-reply-${post.id}`}
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={e => onReplyContentChange(e.target.value)}
                          className="resize-none text-sm"
                          rows={2}
                        />
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`anonymous-reply-${post.id}`}
                              data-testid={`toggle-anonymous-reply-${post.id}`}
                              checked={isAnonymousReply}
                              onCheckedChange={onAnonymousReplyChange}
                            />
                            <Label htmlFor={`anonymous-reply-${post.id}`} className="text-xs">Anonymous</Label>
                          </div>
                          <Button
                            size="sm"
                            data-testid={`button-submit-reply-${post.id}`}
                            onClick={handleSubmitReply}
                            disabled={!replyContent.trim() || createReplyMutation.isPending}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReplyItem({
  reply,
  isOwner,
  onDelete,
}: {
  reply: ReplyWithAuthor;
  isOwner: boolean;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-2"
      data-testid={`reply-${reply.id}`}
    >
      <Avatar className="w-6 h-6 flex-shrink-0">
        {reply.isAnonymous ? (
          <AvatarFallback className="text-xs">?</AvatarFallback>
        ) : (
          <>
            <AvatarImage src={reply.author?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">
              {reply.author?.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" data-testid={`reply-author-${reply.id}`}>
            {reply.isAnonymous ? "Anonymous" : reply.author?.displayName || "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(reply.createdAt!), { addSuffix: true })}
          </span>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 ml-auto"
              data-testid={`button-delete-reply-${reply.id}`}
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <p className="text-sm mt-0.5" data-testid={`reply-content-${reply.id}`}>
          {reply.content}
        </p>
      </div>
    </motion.div>
  );
}