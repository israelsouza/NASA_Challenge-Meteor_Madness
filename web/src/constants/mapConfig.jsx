export const MAP_CONFIG = {
  accessToken: import.meta.env.VITE_MAP_BOXGL,
  
  styles: {
    streets: "mapbox://styles/mapbox/streets-v12"
  },
  
  defaultView: {
    center: [-47.93, -15.78],
    zoom: 2.2,
    pitch: 0,
    bearing: 0
  },
  
  impactView: {
    zoom: 16,
    pitch: 70,
    bearing: 30,
    speed: 0.5,
    curve: 1.4
  },
  
  fog: {
    color: "rgba(186, 210, 235, 0.6)",
    "high-color": "rgba(36, 92, 223, 0.6)",
    "space-color": "#000000",
    "horizon-blend": 0.2,
    "star-intensity": 0.2
  }
};

export const ASTEROIDS = ["Apophis", "Bennu", "Ryugu"];

export const MITIGATION_TYPES = [
  { value: "kinetic", label: "Kinetic Impactor" },
  { value: "gravity", label: "Gravity Tractor" }
];