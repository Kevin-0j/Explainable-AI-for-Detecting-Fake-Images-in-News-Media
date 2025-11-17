import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useVerifications } from '@/hooks/useVerification';
import { VerificationCard } from '@/components/cards/VerificationCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileX } from 'lucide-react';

const History = () => {
  const [filter, setFilter] = useState<'all' | 'real' | 'fake' | 'unknown'>('all');
  const { verifications, isLoading, error, refetch } = useVerifications(
    filter === 'all' ? undefined : filter
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Verification History</h1>
          <p className="text-muted-foreground">
            View and manage all your past image verifications
          </p>
        </div>

        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as typeof filter)}
          className="mb-8"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="real">Real</TabsTrigger>
            <TabsTrigger value="fake">Fake</TabsTrigger>
            <TabsTrigger value="unknown">Unknown</TabsTrigger>
          </TabsList>
        </Tabs>

        {error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-muted-foreground text-center">
                Failed to load verification history. Please try again.
              </p>
              <Button onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
            {verifications.map((verification) => (
              <VerificationCard key={verification.id} verification={verification} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileX className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No verifications found</p>
              <p className="text-muted-foreground">
                {filter === 'all'
                  ? 'You haven\'t verified any images yet'
                  : `No ${filter} verifications found`}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default History;
