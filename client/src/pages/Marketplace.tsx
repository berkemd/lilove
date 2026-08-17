import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Store, Gift, ShoppingCart, Package, Search, 
  Coins, X, Check, AlertCircle, User, Send, Sparkles
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

interface AvatarZone {
  id: string;
  key: string;
  name: string;
}

interface AvatarTrait {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  rarity: string;
  thumbnailUrl?: string;
  coinCost: number;
}

interface MarketplaceListing {
  id: string;
  sellerId: string;
  traitId: string;
  price: number;
  status: string;
  createdAt: string;
  trait?: AvatarTrait;
  zone?: AvatarZone;
  seller?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

interface GiftTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  traitId: string;
  message?: string;
  claimed: boolean;
  claimedAt?: string;
  createdAt: string;
  trait?: AvatarTrait;
  zone?: AvatarZone;
  sender?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

interface UserSearchResult {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface UserAvatarTrait {
  id: string;
  userId: string;
  traitId: string;
  trait?: AvatarTrait;
  zone?: AvatarZone;
}

type RarityFilter = 'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

const RARITY_OPTIONS: { value: RarityFilter; label: string }[] = [
  { value: 'all', label: 'All Rarities' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'mythic', label: 'Mythic' },
];

function getRarityClasses(rarity: string): { text: string; bg: string } {
  const classes: Record<string, { text: string; bg: string }> = {
    common: { text: 'text-muted-foreground', bg: 'bg-muted' },
    uncommon: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    rare: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    epic: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    legendary: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    mythic: { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  };
  return classes[rarity] || classes.common;
}

export default function Marketplace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('browse');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [createListingOpen, setCreateListingOpen] = useState(false);
  const [selectedTraitForListing, setSelectedTraitForListing] = useState<UserAvatarTrait | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedTraitForGift, setSelectedTraitForGift] = useState<UserAvatarTrait | null>(null);
  const [giftRecipient, setGiftRecipient] = useState<UserSearchResult | null>(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const { data: user } = useQuery<{ id: string; coinBalance: number }>({
    queryKey: ['/api/user'],
  });

  const { data: listings, isLoading: listingsLoading } = useQuery<MarketplaceListing[]>({
    queryKey: ['/api/marketplace/listings', rarityFilter, priceRange.min, priceRange.max],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rarityFilter !== 'all') params.append('rarity', rarityFilter);
      if (priceRange.min) params.append('minPrice', priceRange.min);
      if (priceRange.max) params.append('maxPrice', priceRange.max);
      const response = await fetch(`/api/marketplace/listings?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch listings');
      return response.json();
    },
  });

  const { data: myListings, isLoading: myListingsLoading } = useQuery<MarketplaceListing[]>({
    queryKey: ['/api/marketplace/my-listings'],
  });

  const { data: myGifts, isLoading: giftsLoading } = useQuery<GiftTransaction[]>({
    queryKey: ['/api/marketplace/my-gifts'],
  });

  const { data: ownedTraits } = useQuery<UserAvatarTrait[]>({
    queryKey: ['/api/avatar-system/owned-traits'],
  });

  const { data: equippedTraits } = useQuery<{ traitId: string }[]>({
    queryKey: ['/api/avatar-system/equipped'],
  });

  const { data: searchedUsers } = useQuery<UserSearchResult[]>({
    queryKey: ['/api/marketplace/users/search', userSearchQuery],
    enabled: userSearchQuery.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/marketplace/users/search?q=${encodeURIComponent(userSearchQuery)}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
  });

  const buyMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return apiRequest(`/api/marketplace/buy/${listingId}`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({ title: "Purchase successful!", description: "The trait has been added to your collection." });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-system/owned-traits'] });
      setBuyDialogOpen(false);
      setSelectedListing(null);
    },
    onError: (error: any) => {
      toast({ title: "Purchase failed", description: error.message || "Could not complete purchase", variant: "destructive" });
    },
  });

  const cancelListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return apiRequest(`/api/marketplace/listings/${listingId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: "Listing cancelled", description: "Your listing has been removed from the marketplace." });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/listings'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to cancel", description: error.message || "Could not cancel listing", variant: "destructive" });
    },
  });

  const createListingMutation = useMutation({
    mutationFn: async ({ traitId, price }: { traitId: string; price: number }) => {
      return apiRequest('/api/marketplace/listings', { method: 'POST', body: JSON.stringify({ traitId, price }) });
    },
    onSuccess: () => {
      toast({ title: "Listing created!", description: "Your item is now on the marketplace." });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/listings'] });
      setCreateListingOpen(false);
      setSelectedTraitForListing(null);
      setListingPrice('');
    },
    onError: (error: any) => {
      toast({ title: "Failed to create listing", description: error.message || "Could not create listing", variant: "destructive" });
    },
  });

  const giftMutation = useMutation({
    mutationFn: async ({ receiverId, traitId, message }: { receiverId: string; traitId: string; message?: string }) => {
      return apiRequest('/api/marketplace/gift', { method: 'POST', body: JSON.stringify({ receiverId, traitId, message }) });
    },
    onSuccess: () => {
      toast({ title: "Gift sent!", description: "Your gift is on its way." });
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-system/owned-traits'] });
      setGiftDialogOpen(false);
      setSelectedTraitForGift(null);
      setGiftRecipient(null);
      setGiftMessage('');
    },
    onError: (error: any) => {
      toast({ title: "Failed to send gift", description: error.message || "Could not send gift", variant: "destructive" });
    },
  });

  const claimGiftMutation = useMutation({
    mutationFn: async (giftId: string) => {
      return apiRequest(`/api/marketplace/claim-gift/${giftId}`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({ title: "Gift claimed!", description: "The trait has been added to your collection." });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/my-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/avatar-system/owned-traits'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to claim gift", description: error.message || "Could not claim gift", variant: "destructive" });
    },
  });

  const equippedTraitIds = useMemo(() => new Set(equippedTraits?.map(t => t.traitId) || []), [equippedTraits]);

  const availableTraitsForListing = useMemo(() => {
    if (!ownedTraits || !myListings) return [];
    const listedTraitIds = new Set(myListings.filter(l => l.status === 'active').map(l => l.traitId));
    return ownedTraits.filter(t => !equippedTraitIds.has(t.traitId) && !listedTraitIds.has(t.traitId));
  }, [ownedTraits, myListings, equippedTraitIds]);

  const availableTraitsForGift = useMemo(() => {
    if (!ownedTraits) return [];
    return ownedTraits.filter(t => !equippedTraitIds.has(t.traitId));
  }, [ownedTraits, equippedTraitIds]);

  const handleBuy = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setBuyDialogOpen(true);
  };

  const confirmBuy = () => {
    if (selectedListing) {
      buyMutation.mutate(selectedListing.id);
    }
  };

  const handleCreateListing = () => {
    if (!selectedTraitForListing || !listingPrice) return;
    const price = parseInt(listingPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Please enter a valid price", variant: "destructive" });
      return;
    }
    createListingMutation.mutate({ traitId: selectedTraitForListing.traitId, price });
  };

  const handleSendGift = () => {
    if (!selectedTraitForGift || !giftRecipient) return;
    giftMutation.mutate({
      receiverId: giftRecipient.id,
      traitId: selectedTraitForGift.traitId,
      message: giftMessage || undefined,
    });
  };

  const getMinPrice = (trait?: AvatarTrait) => {
    return Math.floor((trait?.coinCost || 0) * 0.5);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-marketplace-title">
            <Store className="w-8 h-8" />
            Avatar Marketplace
          </h1>
          <p className="text-muted-foreground">Trade and gift avatar items with other users</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 text-lg" data-testid="text-coin-balance">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="font-semibold">{user.coinBalance}</span>
            <span className="text-muted-foreground">coins</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="browse" data-testid="tab-browse" className="flex items-center gap-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Browse</span>
          </TabsTrigger>
          <TabsTrigger value="my-listings" data-testid="tab-my-listings" className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">My Listings</span>
          </TabsTrigger>
          <TabsTrigger value="gift" data-testid="tab-gift" className="flex items-center gap-1">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Gift</span>
          </TabsTrigger>
          <TabsTrigger value="gifts" data-testid="tab-received-gifts" className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Received</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Select value={rarityFilter} onValueChange={(v) => setRarityFilter(v as RarityFilter)}>
                    <SelectTrigger data-testid="select-rarity-filter">
                      <SelectValue placeholder="Filter by rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      {RARITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-1">
                  <Input
                    type="number"
                    placeholder="Min price"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    data-testid="input-min-price"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max price"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    data-testid="input-max-price"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              ) : listings && listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onBuy={() => handleBuy(listing)}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No listings found. Check back later!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-listings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>My Listings</CardTitle>
                <CardDescription>Manage your marketplace listings</CardDescription>
              </div>
              <Dialog open={createListingOpen} onOpenChange={setCreateListingOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-listing">
                    <Package className="w-4 h-4 mr-2" />
                    New Listing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Listing</DialogTitle>
                    <DialogDescription>Select an item to sell on the marketplace</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Item</Label>
                      <ScrollArea className="h-48 border rounded-md p-2">
                        {availableTraitsForListing.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {availableTraitsForListing.map((trait) => (
                              <div
                                key={trait.id}
                                onClick={() => setSelectedTraitForListing(trait)}
                                className={`p-2 border rounded cursor-pointer hover-elevate ${
                                  selectedTraitForListing?.id === trait.id ? 'border-primary bg-primary/10' : ''
                                }`}
                                data-testid={`select-trait-listing-${trait.traitId}`}
                              >
                                <p className="text-sm font-medium truncate">{trait.trait?.name}</p>
                                <Badge className={`text-xs ${getRarityClasses(trait.trait?.rarity || 'common').bg}`}>
                                  {trait.trait?.rarity}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">No available items to list</p>
                        )}
                      </ScrollArea>
                    </div>
                    {selectedTraitForListing && (
                      <div className="space-y-2">
                        <Label>Price (coins)</Label>
                        <Input
                          type="number"
                          value={listingPrice}
                          onChange={(e) => setListingPrice(e.target.value)}
                          placeholder={`Min: ${getMinPrice(selectedTraitForListing.trait)}`}
                          data-testid="input-listing-price"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum price: {getMinPrice(selectedTraitForListing.trait)} coins (50% of original cost).
                          A 10% fee applies on sales.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateListingOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleCreateListing}
                      disabled={!selectedTraitForListing || !listingPrice || createListingMutation.isPending}
                      data-testid="button-confirm-listing"
                    >
                      {createListingMutation.isPending ? 'Creating...' : 'Create Listing'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {myListingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : myListings && myListings.length > 0 ? (
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <Card key={listing.id} className="flex items-center justify-between p-4" data-testid={`listing-item-${listing.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{listing.trait?.name}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge className={`text-xs ${getRarityClasses(listing.trait?.rarity || 'common').bg}`}>
                              {listing.trait?.rarity}
                            </Badge>
                            <span className="text-muted-foreground">{listing.zone?.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold">{listing.price}</span>
                          </div>
                          <Badge className="text-xs" variant={listing.status === 'active' ? 'default' : 'secondary'}>
                            {listing.status}
                          </Badge>
                        </div>
                        {listing.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelListingMutation.mutate(listing.id)}
                            disabled={cancelListingMutation.isPending}
                            data-testid={`button-cancel-listing-${listing.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>You don't have any listings yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gift" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Gift an Item
              </CardTitle>
              <CardDescription>Send an avatar item to another user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Item to Gift</Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {availableTraitsForGift.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableTraitsForGift.map((trait) => (
                        <div
                          key={trait.id}
                          onClick={() => setSelectedTraitForGift(trait)}
                          className={`p-2 border rounded cursor-pointer hover-elevate ${
                            selectedTraitForGift?.id === trait.id ? 'border-primary bg-primary/10' : ''
                          }`}
                          data-testid={`select-trait-gift-${trait.traitId}`}
                        >
                          <p className="text-sm font-medium truncate">{trait.trait?.name}</p>
                          <Badge className={`text-xs ${getRarityClasses(trait.trait?.rarity || 'common').bg}`}>
                            {trait.trait?.rarity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No items available to gift</p>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label>Search Recipient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by username..."
                    className="pl-9"
                    data-testid="input-search-recipient"
                  />
                </div>
                {searchedUsers && searchedUsers.length > 0 && (
                  <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                    {searchedUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setGiftRecipient(u);
                          setUserSearchQuery('');
                        }}
                        className={`p-2 cursor-pointer hover-elevate flex items-center gap-2 ${
                          giftRecipient?.id === u.id ? 'bg-primary/10' : ''
                        }`}
                        data-testid={`select-recipient-${u.id}`}
                      >
                        <User className="w-4 h-4" />
                        <span>{u.username || `${u.firstName} ${u.lastName}`}</span>
                      </div>
                    ))}
                  </div>
                )}
                {giftRecipient && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{giftRecipient.username || `${giftRecipient.firstName} ${giftRecipient.lastName}`}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6"
                      onClick={() => setGiftRecipient(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  rows={3}
                  data-testid="input-gift-message"
                />
              </div>

              <Button
                onClick={handleSendGift}
                disabled={!selectedTraitForGift || !giftRecipient || giftMutation.isPending}
                className="w-full"
                data-testid="button-send-gift"
              >
                {giftMutation.isPending ? 'Sending...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Gift
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Received Gifts
              </CardTitle>
              <CardDescription>Gifts from other users</CardDescription>
            </CardHeader>
            <CardContent>
              {giftsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : myGifts && myGifts.length > 0 ? (
                <div className="space-y-4">
                  {myGifts.map((gift) => (
                    <Card key={gift.id} className="p-4" data-testid={`gift-item-${gift.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <Gift className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{gift.trait?.name}</p>
                            <div className="flex items-center gap-2 text-sm mb-1">
                              <Badge className={`text-xs ${getRarityClasses(gift.trait?.rarity || 'common').bg}`}>
                                {gift.trait?.rarity}
                              </Badge>
                              <span className="text-muted-foreground">{gift.zone?.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              From: <span className="font-medium">{gift.sender?.username || `${gift.sender?.firstName} ${gift.sender?.lastName}`}</span>
                            </p>
                            {gift.message && (
                              <p className="text-sm italic mt-1">"{gift.message}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {gift.claimed ? (
                            <Badge variant="secondary">
                              <Check className="w-3 h-3 mr-1" />
                              Claimed
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => claimGiftMutation.mutate(gift.id)}
                              disabled={claimGiftMutation.isPending}
                              data-testid={`button-claim-gift-${gift.id}`}
                            >
                              Claim Gift
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No gifts received yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to buy this item?
            </DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-16 h-16 bg-background rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{selectedListing.trait?.name}</p>
                  <Badge className={getRarityClasses(selectedListing.trait?.rarity || 'common').bg}>
                    {selectedListing.trait?.rarity}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span>Price</span>
                <div className="flex items-center gap-1">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-lg">{selectedListing.price}</span>
                </div>
              </div>
              {user && user.coinBalance < selectedListing.price && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>Insufficient coins</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={confirmBuy}
              disabled={buyMutation.isPending || !!(user && selectedListing && user.coinBalance < selectedListing.price)}
              data-testid="button-confirm-buy"
            >
              {buyMutation.isPending ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListingCard({ 
  listing, 
  onBuy, 
  currentUserId 
}: { 
  listing: MarketplaceListing; 
  onBuy: () => void;
  currentUserId?: string;
}) {
  const rarityClasses = getRarityClasses(listing.trait?.rarity || 'common');
  const isSeller = currentUserId === listing.sellerId;

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`listing-card-${listing.id}`}>
      <div className="aspect-square bg-muted flex items-center justify-center">
        {listing.trait?.thumbnailUrl ? (
          <img 
            src={listing.trait.thumbnailUrl} 
            alt={listing.trait.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground" />
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold truncate" data-testid={`text-listing-name-${listing.id}`}>
            {listing.trait?.name}
          </h3>
          <p className="text-sm text-muted-foreground">{listing.zone?.name}</p>
        </div>
        <div className="flex items-center justify-between">
          <Badge className={`text-xs ${rarityClasses.bg}`}>
            {listing.trait?.rarity}
          </Badge>
          <div className="flex items-center gap-1" data-testid={`text-listing-price-${listing.id}`}>
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="font-bold">{listing.price}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {listing.seller?.username || 'Unknown'}
          </span>
        </div>
        {!isSeller && (
          <Button className="w-full" onClick={onBuy} data-testid={`button-buy-${listing.id}`}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy Now
          </Button>
        )}
        {isSeller && (
          <Badge variant="secondary" className="w-full justify-center">Your Listing</Badge>
        )}
      </CardContent>
    </Card>
  );
}
