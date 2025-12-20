import { Building2 } from 'lucide-react';
import { useState } from 'react';

interface ClientWithCompanyProps {
  clientName: string;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  onClick?: () => void;
  className?: string;
}

export const ClientWithCompany = ({
  clientName,
  companyName,
  companyLogoUrl,
  onClick,
  className = ''
}: ClientWithCompanyProps) => {
  const [logoError, setLogoError] = useState(false);
  
  const hasLogo = companyLogoUrl && !logoError;
  const hasCompany = companyName || hasLogo;
  
  return (
    <div 
      className={`flex items-center gap-2 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Logo de la société */}
      {hasLogo && (
        <img
          src={companyLogoUrl}
          alt={companyName || 'Logo société'}
          className="w-6 h-6 rounded object-cover border border-border/50"
          onError={() => setLogoError(true)}
        />
      )}
      
      {/* Badge société (si pas de logo mais nom de société) */}
      {!hasLogo && companyName && (
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
          <Building2 className="w-3 h-3" />
          <span className="max-w-[80px] truncate">{companyName}</span>
        </div>
      )}
      
      {/* Nom du client */}
      <span className="text-sm font-medium">{clientName}</span>
    </div>
  );
};
