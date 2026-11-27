export interface GoogleMapsEventListener {
  remove(): void;
}

export interface GoogleGeocoderAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

export interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

export interface GoogleLatLngBounds {
  extend(point: GoogleLatLngLiteral | GoogleLatLng): void;
}

export interface GoogleMapInstance {
  fitBounds(bounds: GoogleLatLngBounds, padding?: number): void;
}

export interface GooglePlaceResult {
  formatted_address?: string;
  name?: string;
  place_id?: string;
  geometry?: {
    location?: GoogleLatLng;
  };
  address_components?: GoogleGeocoderAddressComponent[];
}

export interface GoogleAutocompleteInstance {
  addListener(eventName: string, handler: () => void): GoogleMapsEventListener;
  getPlace(): GooglePlaceResult;
}

export interface GoogleMapsNamespace {
  LatLngBounds: new () => GoogleLatLngBounds;
  Map: new (
    mapDiv: HTMLElement,
    opts?: {
      center?: GoogleLatLngLiteral;
      zoom?: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
    },
  ) => GoogleMapInstance;
  Marker: new (opts: {
    position: GoogleLatLngLiteral;
    map: GoogleMapInstance;
    title?: string;
    label?: string;
  }) => unknown;
  Polyline: new (opts: {
    path: GoogleLatLngLiteral[];
    geodesic?: boolean;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    map: GoogleMapInstance;
  }) => unknown;
  places?: {
    Autocomplete: new (
      inputField: HTMLInputElement,
      opts?: {
        fields?: string[];
        types?: string[];
      },
    ) => GoogleAutocompleteInstance;
  };
}

