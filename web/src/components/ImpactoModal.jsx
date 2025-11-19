import React from 'react';
import styles from '@styles/ImpactoModal.module.css';

const ImpactoModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const formatarNumero = (num) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num));
  };

  const formatarCientifico = (num) => {
    return num.toExponential(2);
  };

  const vitimas = data.impacto?.vitimas;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.asteroidIcon}></span>
            Impact Results with:      
            {data.asteroidName}
          </h2>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {data.impacto && (
            <div className={styles.content}>
              {/* Dados físicos do impacto */}
              <section className={styles.section}>
                <h3> Physical Impact Data</h3>
                <p>
                  <strong>Kinetic Energy</strong>
                  <span>{formatarCientifico(data.impacto.energiaCinetica)} J</span>
                </p>
                <p>
                  <strong>Crater Diameter</strong>
                  <span>{formatarNumero(data.impacto.cratera.diametro)} m</span>
                </p>
                <p>
                  <strong>Seismic Magnitude</strong>
                  <span>{data.impacto.magnitudeSismica.toFixed(2)}</span>
                </p>
                <p>
                  <strong>Shockwave Radius</strong>
                  <span>{data.impacto.raioOndasChoque.raio.toFixed(2)} km</span>
                </p>
              </section>

              {/* Tsunami (se aplicável) */}
              {data.impacto.tsunami.alturaInicial > 0 && (
                <section className={styles.section}>
                  <h3>🌊 Tsunami</h3>
                  <p>
                    <strong>Initial Height</strong>
                    <span>{data.impacto.tsunami.alturaInicial.toFixed(2)} m</span>
                  </p>
                  <p>
                    <strong>Propagated Height</strong>
                    <span>{data.impacto.tsunami.alturaPropagada.toFixed(2)} m</span>
                  </p>
                </section>
              )}

              {/* Dados de vítimas */}
              {vitimas && (
                <section className={styles.section}>
                  <h3>⚠️ Estimated Casualties</h3>
                  <div className={styles.casualties}>
                    <p className={styles.population}>
                      <strong>Population in Zone</strong>
                      <span>{formatarNumero(vitimas.populacaoTotal)} people</span>
                    </p>
                    
                    <div className={styles.deaths}>
                      <strong>💀 Estimated Deaths</strong>
                      <span className={styles.deathCount}>
                        {formatarNumero(vitimas.mortesEstimadas)}
                      </span>
                    </div>
                    
                    <p className={styles.injured}>
                      <strong> Estimated Injured</strong>
                      <span>{formatarNumero(vitimas.feridasEstimadas)}</span>
                    </p>
                    
                    <p className={styles.density}>
                      <strong>Population Density</strong>
                      <span>{formatarNumero(vitimas.densidadePorKm2)} people/km²</span>
                    </p>
                    
                    <p className={styles.area}>
                      <strong>Impact Area</strong>
                      <span>{formatarNumero(vitimas.areaImpactoKm2)} km²</span>
                    </p>
                    
                    {/* Zonas de letalidade */}
                    {vitimas.zonasLetalidade && (
                      <div className={styles.lethalityZones}>
                        <h4>☢️ Lethality Zones</h4>
                        <ul>
                          <li>
                            <strong>Zone 1 (Core):</strong> {vitimas.zonasLetalidade.zona1.raio} km radius
                            <br />
                            <span style={{fontSize: '13px', opacity: 0.9}}>
                              {vitimas.zonasLetalidade.zona1.letalidade} lethality • {formatarNumero(vitimas.zonasLetalidade.zona1.mortes)} deaths
                            </span>
                          </li>
                          <li>
                            <strong>Zone 2 (Medium):</strong> {vitimas.zonasLetalidade.zona2.raio} km radius
                            <br />
                            <span style={{fontSize: '13px', opacity: 0.9}}>
                              {vitimas.zonasLetalidade.zona2.letalidade} lethality • {formatarNumero(vitimas.zonasLetalidade.zona2.mortes)} deaths
                            </span>
                          </li>
                          <li>
                            <strong>Zone 3 (Outer):</strong> {vitimas.zonasLetalidade.zona3.raio} km radius
                            <br />
                            <span style={{fontSize: '13px', opacity: 0.9}}>
                              {vitimas.zonasLetalidade.zona3.letalidade} lethality • {formatarNumero(vitimas.zonasLetalidade.zona3.mortes)} deaths
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}
                    
                    <p className={styles.dataSource}>
                      <em>📍 Data source: {vitimas.metodo === 'worldpop' ? 'WorldPop API' : 'Regional Estimate'}</em>
                    </p>
                  </div>
                </section>
              )}

              {/* Mitigação */}
              <section className={styles.section}>
                <h3>🛡️ Mitigation Strategy</h3>
                <p>
                  <strong>Strategy</strong>
                  <span>{data.impacto.mitigacao.estrategia}</span>
                </p>
                <p>
                  <strong>Success Probability</strong>
                  <span>{(data.impacto.mitigacao.probabilidadeSucesso * 100).toFixed(1)}%</span>
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer com botão */}
        <button className={styles.closeButton} onClick={onClose}>
          Close Report
        </button>
      </div>
    </div>
  );
};

export default ImpactoModal;