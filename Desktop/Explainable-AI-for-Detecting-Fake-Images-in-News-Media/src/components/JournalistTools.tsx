import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StructuredAnalysis } from '@/types/analysis';
import { buildClipboardSummary } from '@/utils/formatters';

interface JournalistToolsProps {
  imageUrl: string;
  analysis: StructuredAnalysis;
  metadata?: Record<string, unknown>;
}

const reverseSearchProviders = [
  {
    label: 'Google Reverse Image',
    url: (imageUrl: string) =>
      `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}`,
  },
  {
    label: 'Bing Visual Search',
    url: (imageUrl: string) =>
      `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIDP&sbisrc=UrlPaste&id=&q=imgurl:${encodeURIComponent(
        imageUrl
      )}`,
  },
  {
    label: 'Yandex Reverse Image',
    url: (imageUrl: string) =>
      `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
  },
  {
    label: 'TinEye Search',
    url: (imageUrl: string) =>
      `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`,
  },
];

const checklist = [
  'Resolution appears crisp (not overly compressed)',
  'Metadata is present and matches expected source',
  'Shadows and lighting feel consistent',
  'Reverse search shows no close duplicates',
  'AI cues highlight potential manipulation',
];

export function JournalistTools({ imageUrl, analysis, metadata }: JournalistToolsProps) {
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const metadataJson = useMemo(() => {
    if (!metadata || Object.keys(metadata).length === 0) return null;
    return JSON.stringify(metadata, null, 2);
  }, [metadata]);

  const handleSearch = (providerUrl: (img: string) => string) => {
    const url = providerUrl(imageUrl);
    window.open(url, '_blank');
  };

  const handleMetadataOpen = () => {
    setIsMetadataOpen(true);
  };

  const handleMetadataClose = () => {
    setIsMetadataOpen(false);
  };

  const handleCopy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(buildClipboardSummary(analysis));
    } catch {
      // swallow
    }
  };

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-4 space-y-4 shadow-sm">
      <h3 className="text-lg font-semibold">Journalist Tools</h3>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Verification checklist</h4>
        <ul className="list-disc pl-5 text-sm text-[#374151] space-y-1">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Reverse image search</h4>
        <div className="flex flex-wrap gap-2">
          {reverseSearchProviders.map((provider) => (
            <Button
              key={provider.label}
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1.5"
              onClick={() => handleSearch(provider.url)}
            >
              {provider.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Dialog open={isMetadataOpen} onOpenChange={setIsMetadataOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs px-3 py-1.5">
              View EXIF Metadata
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>EXIF Metadata</DialogTitle>
              <DialogDescription>
                {metadataJson ? 'Captured metadata from the uploaded file.' : 'No metadata saved.'}
              </DialogDescription>
            </DialogHeader>
            <pre className="whitespace-pre-wrap text-xs font-mono bg-[#f9fafb] p-3 rounded-lg border border-dashed border-[#e5e7eb] min-h-[120px] text-[#111827]">
              {metadataJson || 'Metadata not available or removed from original file.'}
            </pre>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" className="text-xs px-3 py-1.5" onClick={handleCopy}>
          Copy verification report
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs px-3 py-1.5"
          onClick={() => window.open('https://www.invid-project.eu/tools-and-services/invid-verification-plugin/', '_blank')}
        >
          Open InVID toolbox
        </Button>
      </section>
    </div>
  );
}
