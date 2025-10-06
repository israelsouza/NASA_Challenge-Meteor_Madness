import React from 'react';
import styles from '@styles/ImpactoModal.module.css';

const ImpactoModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;  // Does not render if closed or without data

  return (
    <div className={styles.overlay} onClick={onClose}>  {/* Overlay to close when clicking outside */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>  {/* Modal, prevents closing when clicking inside */}
        <h2>Impact Results with: <br /> {data.asteroidName}</h2>
        {data.impacto && (
          <div className={styles.content}>
            <p><strong>Kinetic Energy:</strong> {data.impacto.energiaCinetica.toExponential(2)} J</p>
            <p><strong>Crater Diameter:</strong> {data.impacto.cratera.diametro} meters</p>
            <p><strong>Initial Tsunami Height:</strong> {data.impacto.tsunami.alturaInicial.toFixed(2)} meters</p>
            <p><strong>Propagated Tsunami Height:</strong> {data.impacto.tsunami.alturaPropagada.toFixed(2)} meters</p>
            <p><strong>Seismic Magnitude:</strong> {data.impacto.magnitudeSismica.toFixed(2)}</p>
            <p><strong>Shockwave Radius:</strong> {data.impacto.raioOndasChoque.raio.toFixed(2)} km</p>
            <p><strong>Mitigation Strategy:</strong> {data.impacto.mitigacao.estrategia} - Success Probability: {(data.impacto.mitigacao.probabilidadeSucesso * 100).toFixed(1)}%</p>
          </div>
        )}
        <button className={styles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ImpactoModal;