import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Verification } from '@/api/verifications';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface VerificationCardProps {
  verification: Verification;
}

export const VerificationCard = ({ verification }: VerificationCardProps) => {
  const getPredictionBadge = () => {
    switch (verification.prediction) {
      case 'real':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Real
          </Badge>
        );
      case 'fake':
        return (
          <Badge className="bg-destructive text-destructive-foreground">
            <XCircle className="mr-1 h-3 w-3" />
            Fake
          </Badge>
        );
      default:
        return (
          <Badge className="bg-warning text-warning-foreground">
            <HelpCircle className="mr-1 h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Link to={`/verify/result/${verification.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50">
        <div className="aspect-video overflow-hidden bg-muted">
          <img
            src={verification.image_url}
            alt="Verification"
            className="h-full w-full object-cover"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            {getPredictionBadge()}
            <span className="text-sm text-muted-foreground">
              {Math.round(verification.confidence * 100)}% confident
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(verification.created_at), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};
