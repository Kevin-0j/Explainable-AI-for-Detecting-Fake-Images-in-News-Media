import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Verification } from '@/api/verifications';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { buildMediaUrl } from '@/lib/media';

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

  const hasOverlays = Boolean(verification.gradcam_image_url || verification.lime_image_url);

  return (
    <Link to={`/verify/result/${verification.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50">
        {hasOverlays ? (
          <div className="w-full bg-muted rounded-lg p-1">
            <img
              src={buildMediaUrl(verification.image_url)}
              alt="Verification overlay preview"
              className="w-full max-h-[220px] object-contain rounded-lg"
            />
          </div>
        ) : (
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={buildMediaUrl(verification.image_url)}
              alt="Verification"
              className="h-full w-full object-cover"
            />
          </div>
        )}
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
          {(verification.gradcam_image_url || verification.lime_image_url) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Grad-CAM', url: verification.gradcam_image_url },
                { label: 'LIME', url: verification.lime_image_url },
              ]
                .filter((item) => item.url)
                .map((item) => (
                  <div key={item.label} className="text-center text-[10px] text-muted-foreground">
                    <span>{item.label}</span>
                    <img
                      src={buildMediaUrl(item.url!)}
                      alt={`${item.label} overlay`}
                      className="w-full max-h-[120px] object-contain rounded-lg border border-dashed border-[#e5e7eb] mt-1"
                    />
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
