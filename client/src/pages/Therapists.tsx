import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Star, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  ArrowLeft, 
  DollarSign,
  Heart,
  MessageCircle,
  Shield
} from 'lucide-react';
import type { Therapist, TherapistReview, TherapistBooking } from '@shared/schema';

const specializations = [
  { value: 'all', label: 'All Specializations' },
  { value: 'anxiety', label: 'Anxiety' },
  { value: 'depression', label: 'Depression' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'stress', label: 'Stress' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'couples therapy', label: 'Couples Therapy' },
  { value: 'family dynamics', label: 'Family Dynamics' },
  { value: 'burnout', label: 'Burnout' },
  { value: 'work-life balance', label: 'Work-Life Balance' },
  { value: 'phobias', label: 'Phobias' },
  { value: 'OCD', label: 'OCD' },
];

const sortOptions = [
  { value: 'rating-desc', label: 'Highest Rated' },
  { value: 'rating-asc', label: 'Lowest Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

function TherapistCard({ 
  therapist, 
  onSelect 
}: { 
  therapist: Therapist; 
  onSelect: (therapist: Therapist) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="hover-elevate cursor-pointer transition-all duration-300 h-full"
        onClick={() => onSelect(therapist)}
        data-testid={`card-therapist-${therapist.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={therapist.imageUrl || undefined} alt={therapist.name} />
              <AvatarFallback className="text-lg font-semibold">
                {therapist.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg" data-testid={`text-therapist-name-${therapist.id}`}>
                  {therapist.name}
                </CardTitle>
                {therapist.isVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1" data-testid={`text-therapist-title-${therapist.id}`}>
                {therapist.title}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {therapist.specializations?.slice(0, 3).map((spec, i) => (
              <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-specialization-${therapist.id}-${i}`}>
                {spec}
              </Badge>
            ))}
            {(therapist.specializations?.length || 0) > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(therapist.specializations?.length || 0) - 3}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium" data-testid={`text-therapist-rating-${therapist.id}`}>
                {parseFloat(therapist.rating || '0').toFixed(1)}
              </span>
              <span className="text-muted-foreground text-sm">
                ({therapist.reviewCount} reviews)
              </span>
            </div>
            <div className="flex items-center gap-1 text-primary font-semibold" data-testid={`text-therapist-price-${therapist.id}`}>
              <DollarSign className="w-4 h-4" />
              {therapist.hourlyRate}/{therapist.currency || 'USD'}
            </div>
          </div>
          
          <Button 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(therapist);
            }}
            data-testid={`button-book-${therapist.id}`}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Book Session
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TherapistDetail({ 
  therapist, 
  onBack, 
  onBook 
}: { 
  therapist: Therapist; 
  onBack: () => void;
  onBook: () => void;
}) {
  const { data: reviews, isLoading: reviewsLoading } = useQuery<TherapistReview[]>({
    queryKey: ['/api/therapists', therapist.id, 'reviews'],
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Button variant="ghost" onClick={onBack} data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to therapists
      </Button>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="w-24 h-24 border-2 border-primary/20">
                  <AvatarImage src={therapist.imageUrl || undefined} alt={therapist.name} />
                  <AvatarFallback className="text-2xl font-semibold">
                    {therapist.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-2xl" data-testid="text-detail-name">
                      {therapist.name}
                    </CardTitle>
                    {therapist.isVerified && (
                      <Badge className="gap-1">
                        <Shield className="w-3 h-3" />
                        Verified Professional
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-base mt-1" data-testid="text-detail-title">
                    {therapist.title}
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{parseFloat(therapist.rating || '0').toFixed(1)}</span>
                      <span className="text-muted-foreground">({therapist.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Specializations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {therapist.specializations?.map((spec, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-detail-spec-${i}`}>
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  About
                </h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-detail-bio">
                  {therapist.bio}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Availability
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  {therapist.availability ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {therapist.availability.days?.map((day, i) => (
                          <Badge key={i} variant="outline">{day}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {therapist.availability.startTime} - {therapist.availability.endTime}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Contact for availability</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </div>
              ) : reviews && reviews.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} 
                            />
                          ))}
                          <span className="text-sm text-muted-foreground">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-8">No reviews yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Book a Session</CardTitle>
              <CardDescription>Start your wellness journey today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-primary" data-testid="text-detail-price">
                  ${therapist.hourlyRate}
                </div>
                <p className="text-sm text-muted-foreground">per hour session</p>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Video or phone sessions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Secure & confidential
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Flexible scheduling
                </li>
              </ul>
              
              <Button className="w-full" size="lg" onClick={onBook} data-testid="button-book-session">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Book Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function BookingModal({ 
  therapist, 
  open, 
  onClose 
}: { 
  therapist: Therapist | null; 
  open: boolean;
  onClose: () => void;
}) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>('10:00');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const bookMutation = useMutation({
    mutationFn: async (data: { therapistId: string; scheduledAt: Date; notes: string }) => {
      return await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Booking Confirmed!",
        description: "Your session has been scheduled. You'll receive a confirmation email shortly.",
      });
      onClose();
      setDate(undefined);
      setTime('10:00');
      setNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to complete booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBook = () => {
    if (!therapist || !date) {
      toast({
        title: "Please select a date",
        description: "Choose a date for your session",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    bookMutation.mutate({
      therapistId: therapist.id,
      scheduledAt,
      notes,
    });
  };

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book a Session</DialogTitle>
          <DialogDescription>
            {therapist && (
              <span>Schedule a session with {therapist.name}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date() || date.getDay() === 0}
              className="rounded-md border mx-auto"
              data-testid="calendar-date-picker"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger data-testid="select-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Share any topics you'd like to discuss or questions you have..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-booking">
            Cancel
          </Button>
          <Button 
            onClick={handleBook} 
            disabled={!date || bookMutation.isPending}
            data-testid="button-confirm-booking"
          >
            {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Therapists() {
  const [specialization, setSpecialization] = useState('all');
  const [sortBy, setSortBy] = useState('rating-desc');
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [bookingTherapist, setBookingTherapist] = useState<Therapist | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (specialization !== 'all') params.set('specialization', specialization);
    const [sort, order] = sortBy.split('-');
    if (sort) params.set('sortBy', sort);
    if (order) params.set('sortOrder', order);
    return params.toString();
  };

  const { data: therapistsList, isLoading } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists', specialization, sortBy],
    queryFn: async () => {
      const query = buildQueryString();
      const response = await fetch(`/api/therapists${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch therapists');
      return response.json();
    },
  });

  const handleSelectTherapist = (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    setShowDetail(true);
  };

  const handleBack = () => {
    setShowDetail(false);
    setSelectedTherapist(null);
  };

  const handleOpenBooking = (therapist?: Therapist) => {
    setBookingTherapist(therapist || selectedTherapist);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <AnimatePresence mode="wait">
        {showDetail && selectedTherapist ? (
          <TherapistDetail 
            key="detail"
            therapist={selectedTherapist} 
            onBack={handleBack}
            onBook={() => handleOpenBooking()}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                Find Your Therapist
              </h1>
              <p className="text-muted-foreground">
                Connect with licensed mental health professionals who can help you on your wellness journey
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Specialization</Label>
                    <Select value={specialization} onValueChange={setSpecialization}>
                      <SelectTrigger data-testid="select-specialization">
                        <SelectValue placeholder="All Specializations" />
                      </SelectTrigger>
                      <SelectContent>
                        {specializations.map((spec) => (
                          <SelectItem key={spec.value} value={spec.value}>
                            {spec.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Sort by</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger data-testid="select-sort">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-14" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : therapistsList && therapistsList.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {therapistsList.map((therapist) => (
                  <TherapistCard 
                    key={therapist.id} 
                    therapist={therapist} 
                    onSelect={handleSelectTherapist}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No therapists found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters to see more results
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BookingModal
        therapist={bookingTherapist}
        open={!!bookingTherapist}
        onClose={() => setBookingTherapist(null)}
      />
    </div>
  );
}
