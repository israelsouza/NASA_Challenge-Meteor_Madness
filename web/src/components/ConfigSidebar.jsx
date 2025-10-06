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
      <h2 className="sidebar-title">Veja o impacto do asteroide</h2>

      {AsteroideComponent && <AsteroideComponent />}

      <section className="config-section">
        <h3 className="config-title">Configurações do asteroide</h3>

        <ConfigRow label="Asteroide:">
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

        <ConfigRow label="Delta Velocidade (km/s):">
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

        <ConfigRow label="Tipo de Mitigação:">
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

        <ConfigRow label="Distância Tsunami (km):">
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
          <strong>Local do Impacto:</strong>
          <div className="location-text">
            {impactLocation ? impactLocation.name : "Selecione no mapa"}
          </div>
        </div>
      </section>

      <button onClick={onLaunch} className="btn-primary">
        Jogar asteroide
      </button>

      <button onClick={onReset} className="btn-secondary">
        Resetar Visualização
      </button>

      <p className="sidebar-hint">Selecione local de impacto</p>
    </aside>
  );
};

export default ConfigSidebar;
