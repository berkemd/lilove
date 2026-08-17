import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2,
  Users,
  Award,
  BarChart3,
  Zap,
  ArrowRight,
  Star,
  Clock,
  Rocket,
  Mail
} from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { motion } from "framer-motion";
import appIconUrl from '@/assets/app-icon.png';
import { trackEvent } from '@/lib/analytics';

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  const handleGoogleSignIn = () => {
    trackEvent('sign_in_attempt', { method: 'google', source: 'landing' });
    window.location.href = '/api/auth/google';
  };

  const handleAppleSignIn = () => {
    trackEvent('sign_in_attempt', { method: 'apple', source: 'landing' });
    window.location.href = '/api/auth/apple';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            {/* Logo */}
            <div className="flex justify-center">
              <img src={appIconUrl} alt="LiLove" className="w-32 h-32 object-contain rounded-3xl shadow-xl" />
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                Love Your Growth
                <span className="block text-primary mt-2">Live Your Peak</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Fall in love with your personal growth journey. Experience AI-powered coaching 
                that nurtures your potential with warmth, encouragement, and personalized support.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-6 justify-center items-center">
              {/* Social Login Buttons - Primary CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button 
                  size="lg" 
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="flex-1 py-6 text-lg shadow-lg hover:shadow-xl transition-all bg-background/80 backdrop-blur"
                  data-testid="button-google-signin-landing"
                >
                  <SiGoogle className="mr-2 h-5 w-5" />
                  Continue with Google
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleAppleSignIn}
                  variant="outline"
                  className="flex-1 py-6 text-lg shadow-lg hover:shadow-xl transition-all bg-background/80 backdrop-blur"
                  data-testid="button-apple-signin-landing"
                >
                  <SiApple className="mr-2 h-5 w-5" />
                  Continue with Apple
                </Button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 w-full max-w-md">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email Sign Up Button */}
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all"
                data-testid="button-get-started"
              >
                <Mail className="mr-2 h-5 w-5" />
                Sign up with Email
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span>Join the journey to loving your growth</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 justify-center pt-8">
              <Badge variant="secondary" className="px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Free to Start
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                AI-Powered
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                <Award className="h-4 w-4 mr-2" />
                Gamified Learning
              </Badge>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Love Your Growth
              </h2>
              <p className="text-lg text-muted-foreground">
                Nurturing features designed to support your beautiful journey
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature Cards */}
              <Card className="group hover:shadow-xl transition-all border-0 bg-card/50">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Smart Goal Planning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI-powered goal breakdown with realistic timelines and adaptive milestones
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all border-0 bg-card/50">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">AI Coach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Personal AI mentor that provides guidance, motivation, and actionable insights
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all border-0 bg-card/50">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Progress Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Detailed performance tracking with insights to optimize your learning path
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all border-0 bg-card/50">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Daily Streaks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Build consistency with streak tracking and daily rewards to keep you motivated
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all border-0 bg-card/50">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Unlock badges and rewards as you progress through your goals
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all border-0 bg-card/50">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Skill Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Visual skill progression tracking with proficiency levels and recommendations
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by High Achievers
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands who are accelerating their growth
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Testimonial Cards */}
            <Card className="border-0 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "LiLove helped me fall in love with my growth journey. The AI coach 
                  feels like having a loving mentor who truly cares about my wellbeing."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full" />
                  <div>
                    <p className="font-semibold">Sarah Chen</p>
                    <p className="text-sm text-muted-foreground">Software Engineer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "The streak system keeps me accountable. I've maintained a 90-day streak 
                  and achieved more in 3 months than I did all last year!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full" />
                  <div>
                    <p className="font-semibold">Marcus Johnson</p>
                    <p className="text-sm text-muted-foreground">Entrepreneur</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "The adaptive learning system understands my pace perfectly. It challenges 
                  me just enough to grow without overwhelming me."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full" />
                  <div>
                    <p className="font-semibold">Emily Rodriguez</p>
                    <p className="text-sm text-muted-foreground">Product Manager</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats - Real values to be updated as we grow */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">24/7</p>
              <p className="text-muted-foreground">AI Coaching</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">100+</p>
              <p className="text-muted-foreground">Guided Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">Free</p>
              <p className="text-muted-foreground">To Start</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">iOS + Web</p>
              <p className="text-muted-foreground">Cross-Platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Start Your Journey Today</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Fall in Love with Your Growth?
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands who are using LiLove to fall in love with their personal growth 
            journey and achieve their dreams with joy and fulfillment.
          </p>
          
          <div className="space-y-6">
            {/* Social Login CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                onClick={handleGoogleSignIn}
                variant="outline"
                className="py-5 px-8 text-base shadow-lg hover:shadow-xl transition-all bg-background/80"
                data-testid="button-google-signin-cta"
              >
                <SiGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
              <Button 
                size="lg" 
                onClick={handleAppleSignIn}
                variant="outline"
                className="py-5 px-8 text-base shadow-lg hover:shadow-xl transition-all bg-background/80"
                data-testid="button-apple-signin-cta"
              >
                <SiApple className="mr-2 h-5 w-5" />
                Continue with Apple
              </Button>
            </div>

            <div className="flex items-center gap-4 justify-center">
              <div className="h-px w-16 bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="h-px w-16 bg-border" />
            </div>

            <Button 
              size="lg" 
              onClick={handleLogin}
              className="px-12 py-6 text-lg shadow-xl hover:shadow-2xl transition-all"
              data-testid="button-start-free"
            >
              <Mail className="mr-2 h-5 w-5" />
              Sign up with Email
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-6 justify-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>5-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 LiLove. Love Your Growth, Live Your Peak with intelligent coaching.
          </p>
          <p className="text-xs text-muted-foreground/70">
            LiLove is an AI personal growth platform. Not affiliated with any clothing or dating sites.
          </p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <a href="/legal/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy Policy</a>
            <a href="/legal/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}