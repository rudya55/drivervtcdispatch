declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: any);
      setCenter(center: any): void;
    }
    class Marker {
      constructor(options: any);
      setMap(map: Map | null): void;
    }
    interface MapsEventListener {
      remove(): void;
    }
    namespace places {
      class Autocomplete {
        constructor(input: HTMLInputElement, options?: any);
        addListener(eventName: 'place_changed', handler: () => void): google.maps.MapsEventListener;
        getPlace(): PlaceResult;
      }
      interface PlaceResult {
        formatted_address?: string;
        geometry?: {
          location?: {
            lat: () => number;
            lng: () => number;
          };
        };
        address_components?: any[];
      }
    }
  }
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
