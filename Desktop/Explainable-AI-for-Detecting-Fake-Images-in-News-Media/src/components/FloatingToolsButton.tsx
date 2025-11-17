import { useLocation, useNavigate } from 'react-router-dom';
import { useToolsContext } from '@/state/useToolsContext';

interface FloatingToolsButtonProps {
  imageUrl: string;
  analysis: any;
  metadata: Record<string, unknown>;
}

export function FloatingToolsButton({ imageUrl, analysis, metadata }: FloatingToolsButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const setContext = useToolsContext((s) => s.setContext);

  const isResultPage =
    location.pathname.includes('/verify') || location.pathname.includes('/result');

  if (!isResultPage) return null;

  return (
    <button
      onClick={() => {
        setContext({ imageUrl, analysis, metadata });
        navigate('/journalist-tools');
      }}
      className="
        fixed bottom-6 right-6
        z-[200]
        px-5 py-3 rounded-full
        font-semibold text-white
        shadow-xl
        bg-[#4BA3A4] hover:bg-[#3b8284] transition
      "
    >
      🧰 Use in Tools
    </button>
  );
}
