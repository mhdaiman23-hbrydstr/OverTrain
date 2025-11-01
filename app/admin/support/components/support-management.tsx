"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  HeadphonesIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Filter,
  Search,
  Eye,
  Edit,
  Archive,
  User,
  Calendar,
  Star
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface SupportRequest {
  id: string
  user_id: string | null
  type: string
  subject: string | null
  details: string
  contact_email: string | null
  rating: number | null
  severity: string | null
  status: string
  priority: string
  admin_notes: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  user_profile?: {
    name: string | null
    email: string | null
  }
  assigned_profile?: {
    name: string | null
    email: string | null
  }
}

const TYPE_ICONS = {
  'General Feedback': MessageSquare,
  'Bug Report': Bug,
  'Feature Request': Lightbulb,
  'Support': HeadphonesIcon,
}

const STATUS_COLORS = {
  'new': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const PRIORITY_COLORS = {
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  'medium': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'high': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'urgent': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export function SupportManagement() {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadSupportRequests()
  }, [])

  const loadSupportRequests = async () => {
    try {
      setLoading(true)
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      const { data, error } = await supabase
        .from('support_requests')
        .select(`
          *,
          user_profile:profiles!support_requests_user_id_fkey (
            name,
            email
          ),
          assigned_profile:profiles!support_requests_assigned_to_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error loading support requests:', error)
      toast({
        title: "Error",
        description: "Failed to load support requests",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      setIsUpdating(true)
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      const { error } = await supabase
        .from('support_requests')
        .update({ status })
        .eq('id', requestId)

      if (error) throw error

      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status } : req
      ))

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, status } : null)
      }

      toast({
        title: "Success",
        description: `Request status updated to ${status}`,
      })
    } catch (error) {
      console.error('Error updating request status:', error)
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateRequestPriority = async (requestId: string, priority: string) => {
    try {
      setIsUpdating(true)
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      const { error } = await supabase
        .from('support_requests')
        .update({ priority })
        .eq('id', requestId)

      if (error) throw error

      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, priority } : req
      ))

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, priority } : null)
      }

      toast({
        title: "Success",
        description: `Request priority updated to ${priority}`,
      })
    } catch (error) {
      console.error('Error updating request priority:', error)
      toast({
        title: "Error",
        description: "Failed to update request priority",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateAdminNotes = async () => {
    if (!selectedRequest) return

    try {
      setIsUpdating(true)
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      const { error } = await supabase
        .from('support_requests')
        .update({ admin_notes: adminNotes })
        .eq('id', selectedRequest.id)

      if (error) throw error

      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id ? { ...req, admin_notes: adminNotes } : req
      ))

      setSelectedRequest(prev => prev ? { ...prev, admin_notes: adminNotes } : null)

      toast({
        title: "Success",
        description: "Admin notes updated",
      })
    } catch (error) {
      console.error('Error updating admin notes:', error)
      toast({
        title: "Error",
        description: "Failed to update admin notes",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesType = typeFilter === "all" || request.type === typeFilter
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesType && matchesPriority
  })

  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    resolved: requests.filter(r => r.status === 'resolved').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading support requests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Management</h1>
          <p className="text-muted-foreground">Manage user feedback, bug reports, and support requests</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="General Feedback">General Feedback</SelectItem>
                  <SelectItem value="Bug Report">Bug Report</SelectItem>
                  <SelectItem value="Feature Request">Feature Request</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setTypeFilter("all")
                  setPriorityFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Support Requests ({filteredRequests.length})</CardTitle>
          <CardDescription>Click on a request to view details and manage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No support requests found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const IconComponent = TYPE_ICONS[request.type as keyof typeof TYPE_ICONS] || MessageSquare
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedRequest(request)
                      setAdminNotes(request.admin_notes || "")
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{request.subject || 'No subject'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.user_profile?.name || 'Anonymous'} • {request.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]}>
                        {request.priority}
                      </Badge>
                      <Badge className={STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = TYPE_ICONS[selectedRequest.type as keyof typeof TYPE_ICONS] || MessageSquare
                    return <IconComponent className="h-5 w-5" />
                  })()}
                  {selectedRequest.subject || 'No subject'}
                </DialogTitle>
                <DialogDescription>
                  Request from {selectedRequest.user_profile?.name || 'Anonymous'} • {selectedRequest.type}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Request Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">User</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedRequest.user_profile?.name || 'Anonymous'}</span>
                      {selectedRequest.user_profile?.email && (
                        <span className="text-sm text-muted-foreground">({selectedRequest.user_profile.email})</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Contact Email</Label>
                    <div className="mt-1">
                      {selectedRequest.contact_email || 'Not provided'}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(selectedRequest.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedRequest.resolved_at && (
                    <div>
                      <Label className="text-sm font-medium">Resolved</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{new Date(selectedRequest.resolved_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating for General Feedback */}
                {selectedRequest.type === 'General Feedback' && selectedRequest.rating && (
                  <div>
                    <Label className="text-sm font-medium">Rating</Label>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= (selectedRequest.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">({selectedRequest.rating}/5)</span>
                    </div>
                  </div>
                )}

                {/* Severity for Bug Reports */}
                {selectedRequest.type === 'Bug Report' && selectedRequest.severity && (
                  <div>
                    <Label className="text-sm font-medium">Severity</Label>
                    <div className="mt-1">
                      <Badge variant="outline">{selectedRequest.severity}</Badge>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div>
                  <Label className="text-sm font-medium">Details</Label>
                  <div className="mt-1 p-3 bg-muted/30 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedRequest.details}</p>
                  </div>
                </div>

                {/* Status and Priority Management */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={selectedRequest.status}
                      onValueChange={(value) => updateRequestStatus(selectedRequest.id, value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Select
                      value={selectedRequest.priority}
                      onValueChange={(value) => updateRequestPriority(selectedRequest.id, value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <Label className="text-sm font-medium">Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this request..."
                    className="mt-1"
                    rows={3}
                  />
                  <Button
                    onClick={updateAdminNotes}
                    disabled={isUpdating || adminNotes === selectedRequest.admin_notes}
                    className="mt-2"
                    size="sm"
                  >
                    {isUpdating ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
