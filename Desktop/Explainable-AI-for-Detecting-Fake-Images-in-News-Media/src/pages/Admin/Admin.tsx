import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi, type AdminLog } from '@/api/admin';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const Admin = () => {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.getUsers,
  });
  const logsQuery = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: adminApi.getLogs,
  });

  const deleteUser = useMutation({
    mutationKey: ['admin', 'deleteUser'],
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const toggleUserStatus = useMutation({
    mutationKey: ['admin', 'toggleUser'],
    mutationFn: (userId: string) => adminApi.toggleUserStatus(userId),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('Failed to update user status'),
  });

  const statEntries = useMemo(() => {
    const baseStats = {
      total_users: 0,
      active_users: 0,
      total_predictions: 0,
      failed_predictions: 0,
    };
    return Object.entries({ ...baseStats, ...(statsQuery.data ?? {}) });
  }, [statsQuery.data]);

  const logs = useMemo(() => logsQuery.data?.slice(0, 8) ?? [], [logsQuery.data]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Monitor system health, manage users, and review activity logs
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsQuery.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            : statEntries.map(([label, value]) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase text-xs">
                      {formatStatLabel(label)}
                    </CardDescription>
                    <CardTitle className="text-3xl">
                      {typeof value === 'number' ? value.toLocaleString() : value ?? 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View users and manage account access</CardDescription>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : usersQuery.data && usersQuery.data.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email Verified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersQuery.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.email}</p>
                              {user.name && (
                                <p className="text-sm text-muted-foreground">{user.name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.is_verified ? 'bg-success text-success-foreground' : ''
                              }
                              variant={user.is_verified ? 'default' : 'secondary'}
                            >
                              {user.is_verified ? 'Active' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.is_verified ? 'Verified' : 'Unverified'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus.mutate(user.id)}
                              disabled={toggleUserStatus.isPending}
                            >
                              Toggle Status
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteUser.mutate(user.id)}
                              disabled={deleteUser.isPending}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No users found.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Latest events from the FastAPI backend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : logs.length > 0 ? (
                logs.map((log) => <LogItem key={log.id} log={log} />)
              ) : (
                <p className="text-sm text-muted-foreground">No log entries available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const LogItem = ({ log }: { log: AdminLog }) => {
  const timestamp = log.created_at
    ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
    : 'just now';

  return (
    <div className="rounded-lg border p-3 flex justify-between items-start">
      <div className="space-y-1">
        <p className="font-medium text-sm">{log.event || 'Activity'}</p>
        <p className="text-sm text-muted-foreground">
          {log.message || 'Event recorded by the system.'}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{timestamp}</span>
    </div>
  );
};

const formatStatLabel = (label: string) =>
  label
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export default Admin;
