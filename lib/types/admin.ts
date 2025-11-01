export interface AdminMetrics {
  totalUsers: number
  newUsers: {
    last7Days: number
    last28Days: number
    last90Days: number
    custom?: number
  }
  activeUsers: {
    last7Days: number
    last28Days: number
    last90Days: number
    custom?: number
  }
  totalWorkouts: number
  totalTemplates: number
  weeklyWorkouts: number
}

export interface ActivityItem {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  action: string
  target: string
  timestamp: Date
  type: 'workout' | 'template' | 'signup' | 'achievement' | 'program'
}

export interface UserTableItem {
  id: string
  name: string
  email: string
  signupDate: Date
  lastActive: Date
  isPremium: boolean
  totalWorkouts: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface UserGrowthData {
  date: string
  signups: number
  cumulative: number
}

export interface WorkoutActivityData {
  date: string
  workouts: number
  users: number
}

export interface TemplateUsageData {
  templateName: string
  usage: number
  percentage: number
}

export interface AdminData {
  metrics: AdminMetrics
  activities: ActivityItem[]
  users: UserTableItem[]
  userGrowth: UserGrowthData[]
  workoutActivity: WorkoutActivityData[]
  templateUsage: TemplateUsageData[]
}
