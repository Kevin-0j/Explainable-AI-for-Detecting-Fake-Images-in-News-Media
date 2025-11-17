import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { useVerifications } from '@/hooks/useVerification';
import { VerificationCard } from '@/components/cards/VerificationCard';
import { Upload, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserDisplayName } from '@/lib/user';

const Dashboard = () => {
  const { user } = useAuth();
  const { verifications, isLoading, error, refetch } = useVerifications();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {getUserDisplayName(user) || 'there'}!
          </h1>
          <p className="text-muted-foreground">Ready to verify some images?</p>
        </div>

        {/* CTA Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-6">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-semibold mb-2">Verify an Image Now</h2>
              <p className="text-muted-foreground">
                Upload an image to check if it's real or manipulated
              </p>
            </div>
            <Link to="/verify">
              <Button size="lg" className="shadow-glow">
                <Upload className="mr-2 h-5 w-5" />
                Start Verification
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Verifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">Recent Verifications</h2>
            </div>
            <Link to="/history">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>

          {error ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-4">
                <p className="text-muted-foreground text-center">
                  Failed to load your verification history. Please try again.
                </p>
                <Button onClick={() => refetch()}>Retry</Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : verifications && verifications.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {verifications.slice(0, 6).map((verification) => (
                <VerificationCard key={verification.id} verification={verification} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No verifications yet</CardTitle>
                <CardDescription className="mb-4">
                  Upload your first image to get started
                </CardDescription>
                <Link to="/verify">
                  <Button>Verify an Image</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
