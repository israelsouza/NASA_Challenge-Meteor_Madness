import React from "react";
import { ASTEROIDS, MITIGATION_TYPES } from "../constants/mapConfig";
import "../assets/styles/ConfigSidebar.css";

const ConfigRow = ({ label, children }) => (
  <div className="config-row">
    <span className="config-label">{label}</span>
    {children}
  </div>
);

const ConfigSidebar = ({
  impactLocation,
  config,
  onConfigChange,
  onLaunch,
  onReset,
  AsteroideComponent,
}) => {
  const handleChange = (field, value) => {
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">See the asteroid impact</h2>

      {AsteroideComponent && <AsteroideComponent />}

      <section className="config-section">
        <h3 className="config-title">Asteroid Settings</h3>

        <ConfigRow label="Asteroid:">
          <select
            value={config.asteroid}
            onChange={(e) => handleChange("asteroid", e.target.value)}
            className="config-input"
          >
            {ASTEROIDS.map((ast) => (
              <option key={ast} value={ast}>
                {ast}
              </option>
            ))}
          </select>
        </ConfigRow>

        <ConfigRow label="Delta Velocity (km/s):">
          <input
            type="number"
            min={0}
            step={0.01}
            value={config.deltaVelocidade}
            onChange={(e) =>
              handleChange("deltaVelocidade", Number(e.target.value) || 0)
            }
            className="config-input"
          />
        </ConfigRow>

        <ConfigRow label="Mitigation Type:">
          <select
            value={config.tipoMitigacao}
            onChange={(e) => handleChange("tipoMitigacao", e.target.value)}
            className="config-input"
          >
            {MITIGATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </ConfigRow>

        <ConfigRow label="Tsunami Distance (km):">
          <input
            type="number"
            min={0}
            value={config.distanciaTsunami}
            onChange={(e) =>
              handleChange("distanciaTsunami", Number(e.target.value) || 0)
            }
            className="config-input"
          />
        </ConfigRow>

        <div className="impact-location">
          <strong>Impact Location:</strong>
          <div className="location-text">
            {impactLocation ? impactLocation.name : "Select on map"}
          </div>
        </div>
      </section>

      <button onClick={onLaunch} className="btn-primary">
        Launch Asteroid
      </button>

      <button onClick={onReset} className="btn-secondary">
        Reset Visualization
      </button>

      <p className="sidebar-hint">Select impact location</p>
    </aside>
  );
};

export default ConfigSidebar;