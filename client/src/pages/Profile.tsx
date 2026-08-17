import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  User, 
  Mail, 
  Target, 
  Trophy, 
  Flame, 
  Calendar,
  TrendingUp,
  Award,
  Star,
  BarChart3,
  Clock,
  Zap,
  Brain,
  Settings,
  Users,
  UserPlus,
  MessageSquare,
  Search,
  Check,
  X,
  Send,
  Shield,
  Edit2,
  Save,
  Upload,
  Camera,
  Phone,
  MapPin,
  Link as LinkIcon,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Globe,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  RefreshCw,
  Unlink,
  ExternalLink,
  Inbox,
  Heart
} from 'lucide-react';
import { SiGoogle, SiApple } from 'react-icons/si';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserStats {
  activeGoals: number;
  completedGoals: number;
  totalGoals: number;
  streakCount: number;
  longestStreak: number;
  currentLevel: number;
  totalXp: number;
  achievementsUnlocked: number;
  performanceScore: number;
  dailyAverage?: number;
  goalsPerMonth?: number;
  growthRate?: number;
}

interface ProfilePicture {
  id: string;
  filePath: string;
  originalName: string;
  isActive?: boolean;
}

interface ExtendedProfileUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  isProfilePublic?: boolean;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    website?: string;
  };
  createdAt?: string;
}

interface ExtendedProfile {
  user: ExtendedProfileUser;
  profile: {
    learningStyle?: string;
    dailyTimeCommitment?: number;
    goalCategories?: string[];
    coachingStyle?: string;
    currentLevel?: number;
    streakCount?: number;
    longestStreak?: number;
  };
  activePicture?: {
    id: string;
    filePath: string;
    originalName: string;
  };
  connectedAccounts?: ConnectedAccount[];
}

interface ConnectedAccount {
  id: string;
  provider: 'google' | 'apple' | 'github' | 'replit';
  email?: string;
  connectedAt?: string;
  isActive?: boolean;
}

interface FriendUser {
  id: string;
  email?: string;
  displayName?: string;
  username?: string;
  profileImageUrl?: string;
  firstName?: string;
  lastName?: string;
}

interface FriendConnection {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  sharedChallenges?: number;
  mutualSupport?: number;
  createdAt?: string;
  acceptedAt?: string;
  friend?: FriendUser;
}

interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt?: string;
  requester?: FriendUser;
}

interface FriendsResponse {
  accepted: FriendConnection[];
  pending: FriendRequest[];
  sent: FriendConnection[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

function ErrorState({ 
  title, 
  description, 
  onRetry, 
  isRetrying 
}: { 
  title: string; 
  description: string; 
  onRetry: () => void; 
  isRetrying?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center" data-testid="error-state">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">{description}</p>
      <Button 
        variant="outline" 
        onClick={onRetry} 
        disabled={isRetrying}
        data-testid="button-retry"
      >
        {isRetrying ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Try Again
      </Button>
    </div>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" data-testid="section-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  actionHref, 
  onAction,
  testId 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  actionLabel?: string; 
  actionHref?: string;
  onAction?: () => void;
  testId: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid={testId}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button data-testid={`${testId}-action`}>
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} data-testid={`${testId}-action`}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    phone: '',
    website: '',
    isProfilePublic: true,
    socialLinks: {
      twitter: '',
      linkedin: '',
      github: '',
      instagram: '',
      website: ''
    }
  });

  const { 
    data: extendedProfile, 
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile 
  } = useQuery<ExtendedProfile>({
    queryKey: ['/api/profile/extended'],
    enabled: !!user,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { 
    data: stats, 
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats 
  } = useQuery<UserStats>({
    queryKey: ['/api/user/stats'],
    enabled: !!user,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { 
    data: profilePictures,
    isLoading: picturesLoading 
  } = useQuery<ProfilePicture[]>({
    queryKey: ['/api/profile/pictures'],
    enabled: !!user,
  });

  const { 
    data: achievements,
    isLoading: achievementsLoading,
    isError: achievementsError,
    refetch: refetchAchievements
  } = useQuery<Achievement[]>({
    queryKey: ['/api/achievements/unlocked'],
    enabled: !!user,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { 
    data: friendsData, 
    isLoading: friendsLoading,
    isError: friendsError,
    refetch: refetchFriends 
  } = useQuery<FriendsResponse>({
    queryKey: ['/api/friends'],
    enabled: !!user,
    retry: (failureCount, error) => {
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      return failureCount < 1;
    },
  });
  
  const friends = friendsData?.accepted;
  const friendRequests = friendsData?.pending;
  const requestsLoading = friendsLoading;

  const profilePictureUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('picture', file);
      return fetch('/api/profile/picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Failed to upload profile picture');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/extended'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/pictures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile picture updated!",
        description: "Your new profile picture has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  const profileUpdateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/profile/extended', {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/extended'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated!",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditing(false);
      setEditingSection(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePictureMutation = useMutation({
    mutationFn: (pictureId: string) => 
      apiRequest(`/api/profile/picture/${pictureId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/extended'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/pictures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Picture deleted",
        description: "Profile picture has been removed.",
      });
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: (friendId: string) => 
      apiRequest('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Welcome to your circle of love!",
        description: "You're now connected and growing together.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to accept request",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const declineFriendMutation = useMutation({
    mutationFn: (friendId: string) => 
      apiRequest('/api/friends/decline', {
        method: 'POST',
        body: JSON.stringify({ friendId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Request declined",
        description: "The friend request has been declined.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to decline request",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const sendFriendRequestMutation = useMutation({
    mutationFn: (friendId: string) => 
      apiRequest('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friendId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Connection request sent with love!",
        description: "Your invitation to grow together is on its way.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send request",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (extendedProfile?.user) {
      const userData = extendedProfile.user;
      setProfileForm({
        displayName: userData.displayName || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        bio: userData.bio || '',
        location: userData.location || '',
        phone: userData.phone || '',
        website: userData.website || '',
        isProfilePublic: userData.isProfilePublic ?? true,
        socialLinks: {
          twitter: userData.socialLinks?.twitter || '',
          linkedin: userData.socialLinks?.linkedin || '',
          github: userData.socialLinks?.github || '',
          instagram: userData.socialLinks?.instagram || '',
          website: userData.socialLinks?.website || ''
        }
      });
    }
  }, [extendedProfile]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or WebP image.",
          variant: "destructive",
        });
        return;
      }
      
      profilePictureUploadMutation.mutate(file);
    }
  };

  const handleProfileUpdate = () => {
    profileUpdateMutation.mutate({
      user: {
        displayName: profileForm.displayName,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        bio: profileForm.bio,
        location: profileForm.location,
        phone: profileForm.phone,
        website: profileForm.website,
        isProfilePublic: profileForm.isProfilePublic,
        socialLinks: profileForm.socialLinks
      }
    });
  };

  if (authLoading || profileLoading || statsLoading) {
    return <ProfileSkeleton />;
  }

  if (profileError && statsError) {
    return (
      <div className="p-6" data-testid="page-profile-error">
        <ErrorState
          title="Unable to load profile"
          description="We couldn't load your profile information. Please check your connection and try again."
          onRetry={() => {
            refetchProfile();
            refetchStats();
          }}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userData: ExtendedProfileUser = extendedProfile?.user || {
    id: user?.id || '',
    email: user?.email || '',
    firstName: undefined,
    lastName: undefined,
    displayName: user?.displayName || undefined,
    username: user?.username || undefined,
    profileImageUrl: user?.photoURL || undefined,
    createdAt: undefined,
    isProfilePublic: true,
  };
  const profileData = extendedProfile?.profile;
  const connectedAccounts = extendedProfile?.connectedAccounts || [];

  const initials = userData.firstName && userData.lastName 
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : userData.email ? userData.email[0].toUpperCase() 
    : 'U';

  const displayName = userData.displayName || userData.firstName || userData.username || 'User';
  const memberSince = userData.createdAt ? format(new Date(userData.createdAt), 'MMMM yyyy') : 'Recently';

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return SiGoogle;
      case 'apple': return SiApple;
      case 'github': return Github;
      default: return LinkIcon;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google': return 'Google';
      case 'apple': return 'Apple';
      case 'github': return 'GitHub';
      case 'replit': return 'Replit';
      default: return provider;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8" data-testid="page-profile">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-start'}`}>
        <div className={`flex ${isMobile ? 'flex-col items-center text-center' : 'items-center'} gap-4 md:gap-6`}>
          <div className="relative group">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-lg">
              <AvatarImage 
                src={extendedProfile?.activePicture?.filePath || userData.profileImageUrl || undefined} 
                alt={displayName}
                data-testid="img-profile-avatar"
              />
              <AvatarFallback className="text-xl md:text-2xl" data-testid="text-avatar-fallback">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={profilePictureUploadMutation.isPending}
                data-testid="button-upload-picture"
              >
                {profilePictureUploadMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-profile-picture"
            />
          </div>
          
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                    data-testid="input-display-name"
                  />
                </div>
              </div>
            ) : (
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-display-name">{displayName}</h1>
            )}
            
            <p className="text-muted-foreground flex items-center gap-2" data-testid="text-email">
              <Mail className="h-4 w-4" />
              {userData.email || 'No email provided'}
            </p>
            
            <div className={`flex ${isMobile ? 'flex-wrap justify-center' : ''} items-center gap-2 md:gap-4 text-sm text-muted-foreground`}>
              <span className="flex items-center gap-1" data-testid="text-member-since">
                <Calendar className="h-4 w-4" />
                Member since {memberSince}
              </span>
              <Badge variant="secondary" data-testid="badge-level">
                Level {stats?.currentLevel || profileData?.currentLevel || 1}
              </Badge>
              {userData.isProfilePublic !== undefined && (
                <Badge variant={userData.isProfilePublic ? "default" : "secondary"} data-testid="badge-visibility">
                  {userData.isProfilePublic ? (
                    <><Eye className="h-3 w-3 mr-1" /> Public</>
                  ) : (
                    <><EyeOff className="h-3 w-3 mr-1" /> Private</>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
          {isEditing ? (
            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
              <Button 
                variant="outline" 
                className={isMobile ? 'flex-1' : ''}
                onClick={() => {
                  setIsEditing(false);
                  setEditingSection(null);
                  if (extendedProfile?.user) {
                    const userData = extendedProfile.user;
                    setProfileForm({
                      displayName: userData.displayName || '',
                      firstName: userData.firstName || '',
                      lastName: userData.lastName || '',
                      bio: userData.bio || '',
                      location: userData.location || '',
                      phone: userData.phone || '',
                      website: userData.website || '',
                      isProfilePublic: userData.isProfilePublic ?? true,
                      socialLinks: {
                        twitter: userData.socialLinks?.twitter || '',
                        linkedin: userData.socialLinks?.linkedin || '',
                        github: userData.socialLinks?.github || '',
                        instagram: userData.socialLinks?.instagram || '',
                        website: userData.socialLinks?.website || ''
                      }
                    });
                  }
                }}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                className={isMobile ? 'flex-1' : ''}
                onClick={handleProfileUpdate}
                disabled={profileUpdateMutation.isPending}
                data-testid="button-save-profile"
              >
                {profileUpdateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          ) : (
            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
              <Button 
                variant="outline" 
                className={isMobile ? 'flex-1' : ''}
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-profile"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Link href="/settings">
                <Button variant="ghost" data-testid="button-settings">
                  <Settings className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Settings</span>}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {(isEditing || userData.bio || userData.location || userData.phone || userData.website || Object.values(userData.socialLinks || {}).some(link => link)) && (
        <Card data-testid="section-profile-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                    rows={3}
                    data-testid="textarea-bio"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="City, Country"
                        value={profileForm.location}
                        onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                        className="pl-10"
                        data-testid="input-location"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        className="pl-10"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="https://yourwebsite.com"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({...profileForm, website: e.target.value})}
                      className="pl-10"
                      data-testid="input-website"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Social Links</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Twitter username"
                        value={profileForm.socialLinks.twitter}
                        onChange={(e) => setProfileForm({
                          ...profileForm, 
                          socialLinks: {...profileForm.socialLinks, twitter: e.target.value}
                        })}
                        className="pl-10"
                        data-testid="input-twitter"
                      />
                    </div>
                    
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="LinkedIn username"
                        value={profileForm.socialLinks.linkedin}
                        onChange={(e) => setProfileForm({
                          ...profileForm, 
                          socialLinks: {...profileForm.socialLinks, linkedin: e.target.value}
                        })}
                        className="pl-10"
                        data-testid="input-linkedin"
                      />
                    </div>
                    
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="GitHub username"
                        value={profileForm.socialLinks.github}
                        onChange={(e) => setProfileForm({
                          ...profileForm, 
                          socialLinks: {...profileForm.socialLinks, github: e.target.value}
                        })}
                        className="pl-10"
                        data-testid="input-github"
                      />
                    </div>
                    
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Instagram username"
                        value={profileForm.socialLinks.instagram}
                        onChange={(e) => setProfileForm({
                          ...profileForm, 
                          socialLinks: {...profileForm.socialLinks, instagram: e.target.value}
                        })}
                        className="pl-10"
                        data-testid="input-instagram"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label htmlFor="profile-visibility">Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                  </div>
                  <Switch
                    id="profile-visibility"
                    checked={profileForm.isProfilePublic}
                    onCheckedChange={(checked) => setProfileForm({...profileForm, isProfilePublic: checked})}
                    data-testid="switch-profile-visibility"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userData.bio && (
                  <div data-testid="text-bio">
                    <p className="text-sm text-muted-foreground">{userData.bio}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {userData.location && (
                    <div className="flex items-center gap-2 text-sm" data-testid="text-location">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{userData.location}</span>
                    </div>
                  )}
                  
                  {userData.phone && (
                    <div className="flex items-center gap-2 text-sm" data-testid="text-phone">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{userData.phone}</span>
                    </div>
                  )}
                  
                  {userData.website && (
                    <div className="flex items-center gap-2 text-sm" data-testid="text-website">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={userData.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        data-testid="link-website"
                      >
                        {userData.website}
                      </a>
                    </div>
                  )}
                </div>
                
                {userData.socialLinks && Object.values(userData.socialLinks).some(link => link) && (
                  <div>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-4">
                      {userData.socialLinks.twitter && (
                        <a 
                          href={`https://twitter.com/${userData.socialLinks.twitter}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid="link-twitter"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      
                      {userData.socialLinks.linkedin && (
                        <a 
                          href={`https://linkedin.com/in/${userData.socialLinks.linkedin}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid="link-linkedin"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      
                      {userData.socialLinks.github && (
                        <a 
                          href={`https://github.com/${userData.socialLinks.github}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid="link-github"
                        >
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                      
                      {userData.socialLinks.instagram && (
                        <a 
                          href={`https://instagram.com/${userData.socialLinks.instagram}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid="link-instagram"
                        >
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profilePictures && profilePictures.length > 0 && (
        <Card data-testid="section-profile-pictures">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profile Pictures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {profilePictures.map((picture) => (
                <div key={picture.id} className="relative group">
                  <div className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    picture.isActive ? 'border-primary' : 'border-border'
                  }`}>
                    <img 
                      src={picture.filePath} 
                      alt={picture.originalName}
                      className="w-full h-full object-cover"
                      data-testid={`img-picture-${picture.id}`}
                    />
                  </div>
                  
                  {picture.isActive && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default" className="text-xs" data-testid={`badge-active-${picture.id}`}>Active</Badge>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          data-testid={`button-delete-picture-${picture.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Picture</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this profile picture? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePictureMutation.mutate(picture.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-current-streak">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-streak">{stats?.streakCount || profileData?.streakCount || 0} days</div>
            <p className="text-xs text-muted-foreground">
              Best: {stats?.longestStreak || profileData?.longestStreak || 0} days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-xp">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-xp">{stats?.totalXp || 0}</div>
            <Progress 
              value={((stats?.totalXp || 0) % 1000) / 10} 
              className="h-1.5 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {1000 - ((stats?.totalXp || 0) % 1000)} XP to next level
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-achievements">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Trophy className="h-4 w-4 text-purple-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-achievements">{stats?.achievementsUnlocked || 0}</div>
            <p className="text-xs text-muted-foreground">
              Badges unlocked
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-performance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-performance">
              {Math.round(Number(stats?.performanceScore || 0))}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall score
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="section-goals-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsError ? (
            <ErrorState
              title="Couldn't load goals"
              description="We had trouble loading your goals data."
              onRetry={() => refetchStats()}
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <div className="text-center p-3 md:p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl md:text-3xl font-bold text-primary" data-testid="value-active-goals">{stats?.activeGoals || 0}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-3 md:p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400" data-testid="value-completed-goals">
                    {stats?.completedGoals || 0}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-3 md:p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl md:text-3xl font-bold" data-testid="value-total-goals">{stats?.totalGoals || 0}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                </div>
              </div>
              
              {stats && stats.totalGoals > 0 ? (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-medium" data-testid="value-completion-rate">
                      {Math.round((stats.completedGoals / stats.totalGoals) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(stats.completedGoals / stats.totalGoals) * 100}
                    className="h-2"
                  />
                </div>
              ) : (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Start setting goals to track your progress</p>
                  <Link href="/goals">
                    <Button variant="outline" size="sm" data-testid="button-set-first-goal">
                      <Target className="h-4 w-4 mr-2" />
                      Set Your First Goal
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="section-achievements">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievement Showcase
          </CardTitle>
          <Link href="/achievements">
            <Button variant="ghost" size="sm" data-testid="button-view-all-achievements">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {achievementsLoading ? (
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-full" />
              ))}
            </div>
          ) : achievementsError ? (
            <ErrorState
              title="Couldn't load achievements"
              description="We had trouble loading your achievements."
              onRetry={() => refetchAchievements()}
            />
          ) : achievements && achievements.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {achievements.slice(0, 5).map((achievement) => (
                  <Badge 
                    key={achievement.id} 
                    variant="secondary" 
                    className="py-2 px-3 text-sm"
                    data-testid={`badge-achievement-${achievement.id}`}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {achievement.name}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Recent achievements</span>
                <span data-testid="text-total-achievements">{achievements.length} total earned</span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No achievements yet"
              description="Complete your first goal to unlock achievements and start building your showcase!"
              actionLabel="Set Your First Goal"
              actionHref="/goals"
              testId="empty-achievements"
            />
          )}
        </CardContent>
      </Card>

      <Card data-testid="section-connected-accounts">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage your linked accounts for easy sign-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedAccounts.length > 0 ? (
            <div className="space-y-3">
              {connectedAccounts.map((account) => {
                const ProviderIcon = getProviderIcon(account.provider);
                return (
                  <div 
                    key={account.id} 
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`account-${account.provider}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <ProviderIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{getProviderName(account.provider)}</p>
                        {account.email && (
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isActive && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-unlink-${account.provider}`}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={LinkIcon}
              title="No accounts connected"
              description="Connect your Google, Apple, or GitHub account for easier sign-in and enhanced security."
              actionLabel="Connect Account"
              actionHref="/settings"
              testId="empty-connected-accounts"
            />
          )}
        </CardContent>
      </Card>

      <Card className="col-span-full" data-testid="section-friends">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Friends & Social
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends" className="space-y-4">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              <TabsTrigger value="friends" data-testid="tab-friends">
                Friends
                {friends && friends.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{friends.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" data-testid="tab-requests">
                Requests
                {friendRequests && friendRequests.length > 0 && (
                  <Badge className="ml-2 text-xs">{friendRequests.length}</Badge>
                )}
              </TabsTrigger>
              {!isMobile && (
                <>
                  <TabsTrigger value="find" data-testid="tab-find">Find Friends</TabsTrigger>
                  <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
                </>
              )}
            </TabsList>
            
            {isMobile && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="find" data-testid="tab-find-mobile">Find Friends</TabsTrigger>
                <TabsTrigger value="messages" data-testid="tab-messages-mobile">Messages</TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="friends" className="space-y-4">
              {friendsLoading ? (
                <SectionSkeleton rows={3} />
              ) : friendsError ? (
                <ErrorState
                  title="Couldn't load friends"
                  description="We had trouble loading your friends list."
                  onRetry={() => refetchFriends()}
                />
              ) : friends && friends.length > 0 ? (
                <div className="space-y-3">
                  {friends.map((connection) => {
                    const friend = connection.friend;
                    const friendDisplayName = friend?.displayName || friend?.firstName || friend?.username || friend?.email || 'Friend';
                    const friendInitials = friendDisplayName.slice(0, 2).toUpperCase();
                    return (
                      <div 
                        key={connection.id}
                        className="flex items-center justify-between p-3 rounded-lg hover-elevate transition-colors"
                        data-testid={`friend-${connection.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend?.profileImageUrl} alt={friendDisplayName} />
                            <AvatarFallback>{friendInitials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium" data-testid={`friend-name-${connection.id}`}>{friendDisplayName}</p>
                            <p className="text-sm text-muted-foreground">
                              {connection.sharedChallenges || 0} shared challenges
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" data-testid={`button-message-${connection.id}`}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" data-testid={`button-view-profile-${connection.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="No friends yet"
                  description="Connect with others to share your journey, support each other, and grow together!"
                  testId="empty-friends"
                />
              )}
              
              <Button variant="outline" className="w-full" data-testid="button-find-friends">
                <UserPlus className="mr-2 h-4 w-4" />
                Find More Friends
              </Button>
            </TabsContent>
            
            <TabsContent value="requests" className="space-y-4">
              {requestsLoading ? (
                <SectionSkeleton rows={2} />
              ) : friendRequests && friendRequests.length > 0 ? (
                <div className="space-y-3">
                  {friendRequests.map((request) => {
                    const requester = request.requester;
                    const requesterDisplayName = requester?.displayName || requester?.firstName || requester?.username || requester?.email || 'Someone';
                    const requesterInitials = requesterDisplayName.slice(0, 2).toUpperCase();
                    return (
                      <div key={request.id} className="p-4 border rounded-lg bg-primary/5" data-testid={`request-${request.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={requester?.profileImageUrl} alt={requesterDisplayName} />
                              <AvatarFallback>{requesterInitials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium" data-testid={`request-name-${request.id}`}>{requesterDisplayName}</p>
                              <p className="text-sm text-muted-foreground">Wants to connect with you</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => acceptFriendMutation.mutate(request.userId)}
                            disabled={acceptFriendMutation.isPending}
                            data-testid={`button-accept-${request.id}`}
                          >
                            {acceptFriendMutation.isPending ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => declineFriendMutation.mutate(request.userId)}
                            disabled={declineFriendMutation.isPending}
                            data-testid={`button-decline-${request.id}`}
                          >
                            {declineFriendMutation.isPending ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <X className="mr-2 h-4 w-4" />
                            )}
                            Decline
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={UserPlus}
                  title="No pending requests"
                  description="When someone wants to connect with you, their request will appear here."
                  testId="empty-requests"
                />
              )}
            </TabsContent>
            
            <TabsContent value="find" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or username..."
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-friends"
                  />
                </div>
                <Button data-testid="button-search-friends">
                  <Search className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Search</span>}
                </Button>
              </div>
              
              <EmptyState
                icon={Search}
                title="Find your circle"
                description="Search for friends by their email or username to start growing together."
                testId="empty-search"
              />
            </TabsContent>
            
            <TabsContent value="messages" className="space-y-4">
              <EmptyState
                icon={Inbox}
                title="No messages yet"
                description="Start a conversation with a friend to share encouragement and support each other on your journey."
                testId="empty-messages"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card data-testid="section-activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsError ? (
            <ErrorState
              title="Couldn't load activity"
              description="We had trouble loading your activity data."
              onRetry={() => refetchStats()}
            />
          ) : stats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Daily Average</span>
                </div>
                <span className="font-medium" data-testid="value-daily-average">
                  {stats.dailyAverage ? `${stats.dailyAverage} min` : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Goals per Month</span>
                </div>
                <span className="font-medium" data-testid="value-goals-per-month">
                  {stats.goalsPerMonth ? stats.goalsPerMonth.toFixed(1) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Growth Rate</span>
                </div>
                <span 
                  className={`font-medium ${stats.growthRate && stats.growthRate > 0 ? 'text-green-600 dark:text-green-400' : ''}`}
                  data-testid="value-growth-rate"
                >
                  {stats.growthRate ? `${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}%` : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Profile Visibility</span>
                </div>
                <Badge variant={userData.isProfilePublic ? "default" : "secondary"} data-testid="badge-profile-visibility">
                  {userData.isProfilePublic ? "Public" : "Private"}
                </Badge>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No activity data"
              description="Start tracking your habits and goals to see your activity overview."
              actionLabel="Get Started"
              actionHref="/dashboard"
              testId="empty-activity"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8" data-testid="profile-skeleton">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
          <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full" />
          <div className="space-y-2 text-center md:text-left">
            <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
            <div className="flex gap-2 justify-center md:justify-start">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-3 md:p-4 rounded-lg bg-muted/50">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
