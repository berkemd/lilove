export type RootStackParamList = {
  AuthStack: undefined;
  MainStack: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Tasks: undefined;
  TaskGoal: { createForTask: true };
  Premium: undefined;
  Coins: undefined;
  Settings: undefined;
  Achievements: undefined;
  GrowthSanctuary: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Goals: undefined;
  Habits: undefined;
  Coach: undefined;
  Profile: undefined;
};

export type NavigationProps = {
  navigation: any;
  route?: any;
};
