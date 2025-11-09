import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleMapsScript } from '@/hooks/useGoogleMapsScript';

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onPlaceSelected?: (place: any) => void;
}

const AddressAutocomplete = ({
  id,
  value,
  onChange,
  placeholder,
  className,
  onPlaceSelected,
}: AddressAutocompleteProps) => {
  const ready = useGoogleMapsScript();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !inputRef.current || (window as any).google == null) return;

    const google = (window as any).google as typeof window.google;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current!, {
        types: ['geocode'],
        componentRestrictions: { country: ['fr'] },
        fields: ['formatted_address', 'geometry', 'address_components'],
      });

      const listener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place) return;
        const formatted = place.formatted_address || inputRef.current?.value || '';
        onChange(formatted);
        onPlaceSelected?.(place);
      });

      return () => {
        if (listener) listener.remove();
      };
    } catch (e) {
      console.error('Autocomplete init error:', e);
    }
  }, [ready]);

  return (
    <Input
      id={id}
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default AddressAutocomplete;
