// src/components/admin-dashboard.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { 
  getAllUsers, 
  getAllVerifications, 
  getAdminStats, 
  updateUserRole, 
  User, 
  Verification 
} from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Loader2, Shield, Users, Image as ImageIcon, TrendingUp } from "lucide-react";
import { useVerificationStore } from "../contexts/VerificationContext";

const PENDING_STATUSES = new Set(["processing", "pending", "queued"]);

const toPercent = (value?: number | null): number | null => {
  if (value === null || value === undefined) return null;
  const percent = value > 1 ? value : value * 100;
  if (!Number.isFinite(percent)) return null;
  return Math.round(percent * 10) / 10;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFilename = (verification: Verification): string => {
  return (
    verification.source_filename ||
    verification.filename ||
    verification.image_filename ||
    verification.image_path ||
    `verification-${verification.job_id ?? verification.id ?? ""}`
  );
};

export function AdminDashboard() {
  const { accessToken, user } = useAuth();
  const { setTemperature } = useVerificationStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [stats, setStats] = useState<{ total_users: number; total_verifications: number; fake_rate: number } | null>(null);

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [u, v, s] = await Promise.all([
        getAllUsers(accessToken),
        getAllVerifications(accessToken),
        getAdminStats(accessToken),
      ]);
      if (u.success && u.users) setUsers(u.users);
      if (v.success && v.verifications) setVerifications(v.verifications);
      if (s.success && s.stats) {
        setStats({
          total_users: s.stats.total_users,
          total_verifications: s.stats.total_verifications,
          fake_rate: s.stats.fake_rate,
        });
        setTemperature(s.stats.temperature ?? null);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [accessToken, setTemperature]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onChangeRole = async (targetUser: User, role: "user" | "admin") => {
    if (!accessToken) return;
    try {
      const res = await updateUserRole(Number((targetUser as any).id), role, accessToken);
      if (res.success) {
        toast.success("Role updated");
        fetchAll();
      } else {
        toast.error(res.error || "Failed to update role");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4" /> Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.total_users ?? (loading ? "—" : 0)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ImageIcon className="h-4 w-4" /> Total Verifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.total_verifications ?? (loading ? "—" : 0)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4" /> Fake Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats ? `${(stats.fake_rate * 100).toFixed(1)}%` : (loading ? "—" : "0.0%")}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Users</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={`user-${String((u as any).id)}`}>
                        <TableCell className="font-medium text-foreground">{u.email}</TableCell>
                        <TableCell className="text-foreground">{(u as any).first_name ?? (u as any).firstName ?? ''} {(u as any).last_name ?? (u as any).lastName ?? ''}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{(u as any).created_at ?? (u as any).createdAt ?? ''}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant={u.role === 'user' ? 'default' : 'outline'} onClick={() => onChangeRole(u, 'user')}>User</Button>
                            <Button size="sm" variant={u.role === 'admin' ? 'default' : 'outline'} onClick={() => onChangeRole(u, 'admin')}>Admin</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((verification, index) => {
                      const jobId = verification.job_id ?? String(verification.id ?? index);
                      const prediction = (verification.prediction ?? verification.result ?? '').toString().toLowerCase();
                      const confidence = toPercent(verification.confidence ?? (verification as any)?.score ?? null);
                      const status = (verification.status ?? '').toLowerCase();
                      const completedAt = verification.updated_at ?? (verification as any)?.completed_at ?? verification.created_at;

                      return (
                        <TableRow key={`ver-${jobId}`}>
                          <TableCell className="text-foreground font-medium">#{jobId}</TableCell>
                          <TableCell className="text-foreground">{verification.user_id ?? '—'}</TableCell>
                          <TableCell className="text-foreground font-mono text-xs">{getFilename(verification)}</TableCell>
                          <TableCell>
                            {prediction ? (
                              <Badge className={prediction === 'real' ? 'bg-green-500' : prediction === 'fake' ? 'bg-red-500' : 'bg-muted text-foreground'}>
                                {prediction.toUpperCase()}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {PENDING_STATUSES.has(status) ? 'Processing' : verification.status ?? '—'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {confidence !== null ? `${confidence.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDateTime(completedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="text-muted-foreground space-y-2">
                  <div>Total users: <span className="text-foreground font-medium">{stats.total_users}</span></div>
                  <div>Total verifications: <span className="text-foreground font-medium">{stats.total_verifications}</span></div>
                  <div>Fake rate: <span className="text-foreground font-medium">{(stats.fake_rate * 100).toFixed(1)}%</span></div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
