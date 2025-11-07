import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Zap, 
  Star, 
  Trophy, 
  Heart, 
  Sparkles, 
  Brain,
  Gamepad2,
  ShoppingBag,
  Crown
} from 'lucide-react';
import logoUrl from '@/assets/logo.svg';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Coaching',
    description: 'Get personalized guidance from your AI mentor that adapts to your learning style',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Target,
    title: 'Smart Goal Setting',
    description: 'Break down ambitious goals into achievable milestones with intelligent tracking',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Gamepad2,
    title: 'Gamification',
    description: 'Level up your avatar, earn coins, and unlock achievements as you progress',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Visualize your growth with detailed insights and performance metrics',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Join forces with others, compete in challenges, and achieve together',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    icon: ShoppingBag,
    title: 'Avatar Shop',
    description: 'Customize your character with exclusive items and build your unique world',
    gradient: 'from-pink-500 to-rose-500'
  }
];

const stats = [
  { value: '10k+', label: 'Active Users', icon: Users },
  { value: '95%', label: 'Success Rate', icon: Trophy },
  { value: '50k+', label: 'Goals Achieved', icon: Target },
  { value: '4.9/5', label: 'User Rating', icon: Star }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-pink-300 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="container mx-auto px-4 py-16 sm:py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-block"
            >
              <div className="relative">
                <img src={logoUrl} alt="LiLove" className="h-24 w-24 sm:h-32 sm:w-32 mx-auto drop-shadow-2xl" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent"
            >
              Love Your Growth
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed"
            >
              Transform your journey with AI-powered coaching, gamified progress tracking, 
              and a supportive community that grows with you.
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLocation('/auth')}
              >
                <Heart className="mr-2 h-5 w-5" />
                Start Your Journey
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-2 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={() => setLocation('/pricing')}
              >
                <Crown className="mr-2 h-5 w-5" />
                View Pricing
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="container mx-auto px-4 py-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="p-6 text-center hover:shadow-lg transition-shadow duration-300 border-2">
                <stat.icon className="h-8 w-8 mx-auto mb-3 text-purple-600 dark:text-purple-400" />
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="container mx-auto px-4 py-16"
      >
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Powerful Features for Your Success
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to achieve your goals and become the best version of yourself
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="container mx-auto px-4 py-16 mb-16"
      >
        <Card className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white p-12 text-center border-0">
          <Trophy className="h-16 w-16 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Transform Your Life?
          </h2>
          <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
            Join thousands of users who are already crushing their goals with LiLove
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-purple-50 px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => setLocation('/auth')}
          >
            <Zap className="mr-2 h-5 w-5" />
            Get Started Free
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
