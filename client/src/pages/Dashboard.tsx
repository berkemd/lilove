import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Trophy, 
  Users,
  Flame,
  Calendar,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['/api/dashboard/activity'],
  });

  const quickStats = [
    {
      title: "Active Goals",
      value: stats?.activeGoals || 0,
      icon: <Target className="h-4 w-4" />,
      color: "text-blue-500"
    },
    {
      title: "Completed Today",
      value: stats?.completedToday || 0,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-green-500"
    },
    {
      title: "Current Streak",
      value: `${stats?.currentStreak || 0} days`,
      icon: <Flame className="h-4 w-4" />,
      color: "text-orange-500"
    },
    {
      title: "Total XP",
      value: stats?.totalXP || 0,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your progress overview.</p>
        </div>
        <Button asChild>
          <Link href="/goals">
            <Target className="mr-2 h-4 w-4" />
            New Goal
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={stat.color}>{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Tasks
            </CardTitle>
            <CardDescription>Your priorities for today</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.todayTasks?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tasks scheduled for today</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/tasks">Add Tasks</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.todayTasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.category}</p>
                    </div>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <CardDescription>Your weekly achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Weekly Goal Completion</span>
                <span className="font-medium">{stats?.weeklyProgress || 0}%</span>
              </div>
              <Progress value={stats?.weeklyProgress || 0} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Habit Adherence</span>
                <span className="font-medium">{stats?.habitAdherence || 0}%</span>
              </div>
              <Progress value={stats?.habitAdherence || 0} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Task Completion Rate</span>
                <span className="font-medium">{stats?.taskCompletion || 0}%</span>
              </div>
              <Progress value={stats?.taskCompletion || 0} />
            </div>
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
            <CardDescription>Your latest unlocks</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentAchievements?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No achievements unlocked yet</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/achievements">View All</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentAchievements.slice(0, 3).map((achievement: any) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="font-medium">{achievement.name}</p>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Activity
            </CardTitle>
            <CardDescription>Recent team updates</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentActivity?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent team activity</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/teams">Join a Team</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 4).map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button asChild variant="outline">
              <Link href="/goals">Manage Goals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tasks">View Tasks</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/coach">AI Coach</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/challenges">Join Challenge</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
