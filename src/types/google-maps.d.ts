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
  }
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
