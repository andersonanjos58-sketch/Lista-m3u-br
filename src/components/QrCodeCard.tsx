import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';

interface QrCodeCardProps {
  url: string;
  repoName: string;
}

export function QrCodeCard({ url, repoName }: QrCodeCardProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 176,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((generated) => {
        if (active) {
          setDataUrl(generated);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [url]);

  const handleDownloadQr = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${repoName || 'lista-m3u'}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-4 lg:pt-0 lg:pl-6 lg:border-l border-t lg:border-t-0 border-slate-200 shrink-0">
      <div className="w-[152px] h-[152px] bg-white border border-slate-200 rounded-md p-2 flex items-center justify-center">
        {dataUrl && !error ? (
          <img
            src={dataUrl}
            alt={`QR Code para ${url}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-xs text-slate-500 text-center">
            {error ? 'QR indisponível' : 'Gerando QR...'}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-700">Escaneie no player IPTV</p>
        <button
          type="button"
          onClick={handleDownloadQr}
          disabled={!dataUrl}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar PNG
        </button>
      </div>
    </div>
  );
}
