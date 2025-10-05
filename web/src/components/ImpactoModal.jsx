import React from 'react';
import styles from '@styles/ImpactoModal.module.css';

const ImpactoModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;  // Não renderiza se fechado ou sem dados

  return (
    <div className={styles.overlay} onClick={onClose}>  {/* Overlay para fechar ao clicar fora */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>  {/* Modal, impede fechar ao clicar dentro */}
        <h2>Resultados do Impacto com: <br /> {data.asteroidName}</h2>
        {data.impacto && (
          <div className={styles.content}>
            <p><strong>Energia Cinética:</strong> {data.impacto.energiaCinetica.toExponential(2)} J</p>
            <p><strong>Cratera:</strong> {data.impacto.cratera.diametro} metros</p>
            <p><strong>Tsunami Inicial:</strong> {data.impacto.tsunami.alturaInicial.toFixed(2)} metros</p>
            <p><strong>Tsunami Propagado:</strong> {data.impacto.tsunami.alturaPropagada.toFixed(2)} metros</p>
            <p><strong>Magnitude Sísmica:</strong> {data.impacto.magnitudeSismica.toFixed(2)}</p>
            <p><strong>Raio Ondas de Choque:</strong> {data.impacto.raioOndasChoque.raio.toFixed(2)} km</p>
            <p><strong>Mitigação:</strong> {data.impacto.mitigacao.estrategia} - Probabilidade: {(data.impacto.mitigacao.probabilidadeSucesso * 100).toFixed(1)}%</p>
          </div>
        )}
        <button className={styles.closeButton} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
};

export default ImpactoModal;