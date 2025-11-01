"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Mail, 
  Key, 
  UserX,
  Eye,
  Shield,
  ShieldOff,
  Ban,
  Download,
  Smartphone,
  Monitor,
  Tablet,
  Activity,
  Calendar,
  TrendingUp
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  created_at: string
  last_sign_in_at?: string
  updated_at: string
  isAdmin: boolean
  total_workouts?: number
  completion_rate?: number
  device_type?: string
  last_login_ip?: string
  login_count?: number
  is_banned?: boolean
  banned_at?: string
  ban_reason?: string
  active_program_id?: string
}

interface UsersManagementProps {
  // No props needed for now
}

export function UsersManagement({}: UsersManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLevel, setFilterLevel] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterDevice, setFilterDevice] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const { toast } = useToast()

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          workout_sessions(count),
          active_program:program_instances(id, name, start_date)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive"
        })
        return
      }

      // Transform data to include computed fields
      const transformedUsers = (data || []).map(user => ({
        ...user,
        total_workouts: user.workout_sessions?.length || 0,
        completion_rate: user.workout_sessions?.length > 0 
          ? Math.round((user.workout_sessions?.filter((w: any) => w.completed).length / user.workout_sessions.length) * 100)
          : 0
      }))

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply experience level filter
    if (filterLevel !== "all") {
      filtered = filtered.filter(user => user.experience_level === filterLevel)
    }

    // Apply status filter
    if (filterStatus !== "all") {
      if (filterStatus === "admin") {
        filtered = filtered.filter(user => user.isAdmin)
      } else if (filterStatus === "user") {
        filtered = filtered.filter(user => !user.isAdmin)
      } else if (filterStatus === "banned") {
        filtered = filtered.filter(user => user.is_banned)
      } else if (filterStatus === "active") {
        filtered = filtered.filter(user => !user.is_banned)
      }
    }

    // Apply device filter
    if (filterDevice !== "all") {
      filtered = filtered.filter(user => user.device_type === filterDevice)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof UserProfile]
      let bValue: any = b[sortBy as keyof UserProfile]

      if (sortBy === 'created_at' || sortBy === 'last_sign_in_at') {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [users, searchTerm, filterLevel, filterStatus, filterDevice, sortBy, sortOrder])

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredAndSortedUsers.slice(startIndex, endIndex)
  }, [filteredAndSortedUsers, currentPage])

  const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE)

  const handleResetPassword = async (user: UserProfile) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to send password reset email",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: `Password reset email sent to ${user.email}`,
        })
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      })
    }
  }

  const handleBanUser = async (user: UserProfile, reason: string) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: true, 
          banned_at: new Date().toISOString(),
          ban_reason: reason
        })
        .eq('id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to ban user",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: `${user.full_name || user.email} has been banned`,
        })
        loadUsers() // Reload users
      }
    } catch (error) {
      console.error('Error banning user:', error)
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      })
    }
  }

  const handleUnbanUser = async (user: UserProfile) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: false, 
          banned_at: null,
          ban_reason: null
        })
        .eq('id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to unban user",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: `${user.full_name || user.email} has been unbanned`,
        })
        loadUsers() // Reload users
      }
    } catch (error) {
      console.error('Error unbanning user:', error)
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive"
      })
    }
  }

  const handleToggleAdmin = async (user: UserProfile) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ isAdmin: !user.isAdmin })
        .eq('id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update admin status",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: `${user.full_name || user.email} is now ${!user.isAdmin ? 'an admin' : 'a regular user'}`,
        })
        loadUsers() // Reload users
      }
    } catch (error) {
      console.error('Error toggling admin:', error)
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive"
      })
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'ID', 'Email', 'Name', 'Experience Level', 'Created', 'Last Login', 
      'Device Type', 'Login Count', 'Total Workouts', 'Completion Rate', 
      'Admin Status', 'Banned Status', 'Ban Reason'
    ]
    
    const csvData = filteredAndSortedUsers.map(user => [
      user.id,
      user.email,
      user.full_name || '',
      user.experience_level,
      new Date(user.created_at).toLocaleDateString(),
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never',
      user.device_type || 'Unknown',
      user.login_count || 0,
      user.total_workouts || 0,
      `${user.completion_rate || 0}%`,
      user.isAdmin ? 'Admin' : 'User',
      user.is_banned ? 'Banned' : 'Active',
      user.ban_reason || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: `Exported ${filteredAndSortedUsers.length} users to CSV`,
    })
  }

  const handleViewUserDetails = (user: UserProfile) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return Smartphone
      case 'tablet': return Tablet
      case 'desktop': return Monitor
      default: return Monitor
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Users Management</h2>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">Users Management</h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins Only</option>
              <option value="user">Users Only</option>
              <option value="active">Active Only</option>
              <option value="banned">Banned Only</option>
            </select>

            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>

          {/* Export Button */}
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                Sort by Created Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('last_sign_in_at')}>
                Sort by Last Login
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('full_name')}>
                Sort by Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('experience_level')}>
                Sort by Experience
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('login_count')}>
                Sort by Login Count
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({filteredAndSortedUsers.length})</span>
            <Badge variant="secondary">
              Page {currentPage} of {totalPages}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Logins</TableHead>
                <TableHead>Workouts</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => {
                const DeviceIcon = getDeviceIcon(user.device_type)
                return (
                  <TableRow 
                    key={user.id} 
                    className={`cursor-pointer hover:bg-gray-50 ${user.is_banned ? 'bg-red-50' : ''}`}
                    onClick={() => handleViewUserDetails(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.full_name || 'N/A'}
                            {user.is_banned && <Badge variant="destructive" className="text-xs">BANNED</Badge>}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getExperienceBadgeColor(user.experience_level)}>
                        {user.experience_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DeviceIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{user.device_type || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{user.login_count || 0}</span>
                        {user.login_count && user.login_count > 10 && (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.total_workouts || 0}</TableCell>
                    <TableCell>{user.completion_rate || 0}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>
                          {user.isAdmin ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 mr-1" />
                              User
                            </>
                          )}
                        </Badge>
                        {user.is_banned && (
                          <Badge variant="destructive" className="ml-1">
                            <Ban className="w-3 h-3 mr-1" />
                            Banned
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewUserDetails(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.is_banned ? (
                            <DropdownMenuItem onClick={() => handleUnbanUser(user)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Unban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => {
                              const reason = prompt('Enter ban reason:')
                              if (reason) {
                                handleBanUser(user, reason)
                              }
                            }}>
                              <Ban className="h-4 w-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                            {user.isAdmin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">User Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUserDetails(false)}>
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-gray-900">{selectedUser.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Experience Level</label>
                  <Badge className={getExperienceBadgeColor(selectedUser.experience_level)}>
                    {selectedUser.experience_level}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Status</label>
                  <Badge variant={selectedUser.isAdmin ? "default" : "secondary"}>
                    {selectedUser.isAdmin ? 'Administrator' : 'Regular User'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Account Created</label>
                  <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Login</label>
                  <p className="text-gray-900">
                    {selectedUser.last_sign_in_at ? formatDate(selectedUser.last_sign_in_at) : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-gray-900">{formatDate(selectedUser.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Device Type</label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const DeviceIcon = getDeviceIcon(selectedUser.device_type)
                      return <DeviceIcon className="h-4 w-4 text-gray-500" />
                    })()}
                    <span>{selectedUser.device_type || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Login Count</label>
                  <p className="text-gray-900">{selectedUser.login_count || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Login IP</label>
                  <p className="text-gray-900">{selectedUser.last_login_ip || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Workouts</label>
                  <p className="text-gray-900">{selectedUser.total_workouts || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Completion Rate</label>
                  <p className="text-gray-900">{selectedUser.completion_rate || 0}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Ban Status</label>
                  <Badge variant={selectedUser.is_banned ? "destructive" : "secondary"}>
                    {selectedUser.is_banned ? 'Banned' : 'Active'}
                  </Badge>
                </div>
                {selectedUser.is_banned && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Banned At</label>
                      <p className="text-gray-900">
                        {selectedUser.banned_at ? formatDate(selectedUser.banned_at) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Ban Reason</label>
                      <p className="text-gray-900">{selectedUser.ban_reason || 'No reason provided'}</p>
                    </div>
                  </>
                )}
                {selectedUser.active_program_id && (
                  <div>
                    <label className="text-sm font-medium">Active Program</label>
                    <p className="text-gray-900">{selectedUser.active_program_id}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowUserDetails(false)}>
                Close
              </Button>
              <Button onClick={() => handleResetPassword(selectedUser)}>
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
              {selectedUser.is_banned ? (
                <Button onClick={() => handleUnbanUser(selectedUser)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Unban User
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    const reason = prompt('Enter ban reason:')
                    if (reason) {
                      handleBanUser(selectedUser, reason)
                      setShowUserDetails(false)
                    }
                  }}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
