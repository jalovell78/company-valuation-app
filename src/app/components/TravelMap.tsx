'use client';

import { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet default icon issue in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to fit bounds to markers
function MapBounds({ markers }: { markers: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => L.latLng(m[0], m[1])));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, markers]);
    return null;
}

interface TravelMapProps {
    destinationAddress: string;
    companyName: string;
}

interface TravelStats {
    distance: string; // e.g. "15 miles"
    duration: string; // e.g. "25 mins"
}

interface Step {
    instruction: string;
    distance: string;
}

export default function TravelMap({ destinationAddress, companyName }: TravelMapProps) {
    const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
    const [destLoc, setDestLoc] = useState<[number, number] | null>(null);
    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
    const [stats, setStats] = useState<TravelStats | null>(null);
    const [steps, setSteps] = useState<Step[]>([]);
    const [status, setStatus] = useState<'idle' | 'locating_user' | 'geocoding_dest' | 'routing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!destinationAddress) return;

        const initMap = async () => {
            try {
                // 1. Get User Location
                setStatus('locating_user');
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                const userCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                setUserLoc(userCoords);

                // 2. Geocode Destination (Nominatim) with Fallback Logic
                setStatus('geocoding_dest');

                // Helper to fetch coordinates from Nominatim
                const getCoords = async (query: string) => {
                    if (!query) return null;
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                            headers: { 'User-Agent': 'AntigravityValuationApp/1.0' }
                        });
                        const data = await res.json();
                        return (data && data.length > 0) ? data[0] : null;
                    } catch (e) {
                        return null;
                    }
                };

                // A. Try Full Address
                let geoData = await getCoords(destinationAddress);

                // B. Try Extracted Postcode (Regex)
                // Looks for UK-style postcodes: e.g. "GL50 1HR" or "sw1a 1aa"
                if (!geoData) {
                    const postcodeMatch = destinationAddress.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i);
                    if (postcodeMatch) {
                        console.log("📍 Fallback 1: Postcode found:", postcodeMatch[0]);
                        geoData = await getCoords(postcodeMatch[0]);
                    }
                }

                // C. Try City/Locality (Extract from comma parts)
                if (!geoData) {
                    const parts = destinationAddress.split(',').map(p => p.trim()).filter(Boolean);
                    // Usually City is 2nd to last (Address, City, Postcode) or last
                    // We try the one before the postcode (or last part if no postcode)
                    const candidate = parts.length > 1 ? parts[parts.length - 2] : parts[0];
                    if (candidate && !/\d/.test(candidate)) { // Ignore if it has numbers (likely address line)
                        console.log("📍 Fallback 2: City candidate:", candidate);
                        geoData = await getCoords(candidate);
                    }
                }

                if (!geoData) {
                    throw new Error("Could not find address on map.");
                }

                const destCoords: [number, number] = [parseFloat(geoData.lat), parseFloat(geoData.lon)];
                setDestLoc(destCoords);

                // 3. Get Route (OSRM)
                setStatus('routing');
                // OSRM expects: lon,lat;lon,lat
                // Request steps=true
                const routerUrl = `https://router.project-osrm.org/route/v1/driving/${userCoords[1]},${userCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson&steps=true`;
                const routeRes = await fetch(routerUrl);
                const routeData = await routeRes.json();

                if (routeData.code === 'Ok' && routeData.routes.length > 0) {
                    const route = routeData.routes[0];
                    const geometry = route.geometry.coordinates;
                    // Flip GeoJSON [lon, lat] to Leaflet [lat, lon]
                    const polyline = geometry.map((c: any) => [c[1], c[0]] as [number, number]);
                    setRoutePolyline(polyline);

                    // Stats (OSRM returns duration in seconds, distance in meters)
                    const durationMins = Math.round(route.duration / 60);
                    const distanceMiles = (route.distance * 0.000621371).toFixed(1);

                    setStats({
                        duration: durationMins > 60
                            ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
                            : `${durationMins} mins`,
                        distance: `${distanceMiles} miles`
                    });

                    // Parse Steps
                    const rawSteps = route.legs[0].steps;
                    const parsedSteps = rawSteps.map((s: any) => {
                        let text = "";
                        const m = s.maneuver;
                        const name = s.name || "";

                        // Humanize instruction
                        if (m.type === 'depart') text = `Head ${m.modifier || ''} on ${name}`;
                        else if (m.type === 'arrive') text = `Arrive at destination`;
                        else if (m.type === 'roundabout') text = `Take exit ${m.exit} at roundabout onto ${name}`;
                        else if (m.type === 'turn') text = `Turn ${m.modifier} onto ${name}`;
                        else if (m.type === 'new name') text = `Continue onto ${name}`;
                        else text = `${m.type} ${m.modifier || ''} ${name ? 'onto ' + name : ''}`;

                        text = text.replace(/  +/g, ' ').trim();
                        if (text.endsWith(' onto')) text = text.slice(0, -5);
                        if (!name && text.includes(' onto ')) text = text.split(' onto ')[0];

                        return {
                            instruction: text.charAt(0).toUpperCase() + text.slice(1),
                            distance: s.distance > 0 ? (s.distance * 0.000621371).toFixed(1) + ' mi' : ''
                        };
                    });
                    setSteps(parsedSteps);

                    setStatus('success');
                } else {
                    // Fallback: Just show points, no route
                    setStatus('success');
                }

            } catch (err: any) {
                console.error("Map Error:", err);
                setStatus('error');
                if (err.code === 1) setErrorMsg("Location access denied.");
                else setErrorMsg(err.message || "Failed to load map data.");
            }
        };

        initMap();
    }, [destinationAddress]);

    if (errorMsg) return (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-700">
            Could not load map: {errorMsg}
        </div>
    );

    if (status !== 'success' && status !== 'error') {
        return (
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center animate-pulse">
                <span className="text-gray-500 font-medium">Getting Directions & Map Data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Header */}
            {stats && (
                <div className="flex gap-4 items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-blue-900 text-sm font-medium">
                    <div className="flex items-center gap-1">
                        <span>🚗</span>
                        <span>{stats.duration} drive</span>
                    </div>
                    <div className="w-px h-4 bg-blue-200"></div>
                    <div>{stats.distance}</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
                {/* Left Col: Map (2/3 width) */}
                <div className="md:col-span-2 h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
                    <MapContainer
                        center={userLoc || [51.505, -0.09]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* User Marker */}
                        {userLoc && (
                            <Marker position={userLoc} icon={defaultIcon}>
                                <Popup>You are here</Popup>
                            </Marker>
                        )}

                        {/* Destination Marker */}
                        {destLoc && (
                            <Marker position={destLoc} icon={defaultIcon}>
                                <Popup>{companyName}</Popup>
                            </Marker>
                        )}

                        {/* Route Line */}
                        {routePolyline.length > 0 && (
                            <Polyline positions={routePolyline} color="blue" weight={4} opacity={0.7} />
                        )}

                        {/* Auto-Zoom to fit */}
                        {userLoc && destLoc && <MapBounds markers={[userLoc, destLoc]} />}
                    </MapContainer>
                </div>

                {/* Right Col: Directions (1/3 width) */}
                <div className="md:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                    <h4 className="font-semibold text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200">Directions</h4>
                    <div className="overflow-y-auto p-4 text-sm scrollbar-thin scrollbar-thumb-gray-200 flex-1">
                        <ol className="space-y-4 relative border-l border-gray-200 ml-2">
                            {steps.map((step, i) => (
                                <li key={i} className="ml-4">
                                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-blue-400"></span>
                                    <p className="text-gray-800 font-medium leading-normal">{step.instruction}</p>
                                    {step.distance && <p className="text-xs text-gray-500 mt-0.5">{step.distance}</p>}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>

            <p className="text-xs text-gray-400 text-right">Routing via OSRM • Maps via OSM</p>
        </div>
    );
}
