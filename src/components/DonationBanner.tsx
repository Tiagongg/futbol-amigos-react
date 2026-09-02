import { useState } from 'react';
import './DonationBanner.css';

const DONATION_LINK = 'https://mpago.la/2BihwAA';

type Stage = 'initial' | 'insist' | 'mega' | 'closed';

export function DonationBanner() {
  const [stage, setStage] = useState<Stage>('initial');

  if (stage === 'closed') return null;

  if (stage === 'mega') {
    return (
      <div className="donation-overlay donation-overlay-mega" role="dialog" aria-modal="true">
        <button
          type="button"
          className="donation-close donation-close-mega"
          aria-label="Cerrar"
          onClick={() => setStage('closed')}
        >
          ×
        </button>
        <h2 className="donation-mega-title">
          DONA DONA DONA DONA
          <br />
          DALE DALE DALE
        </h2>
        <a
          className="donation-cta donation-cta-mega"
          href={DONATION_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setStage('closed')}
        >
          Donar $1000
        </a>
      </div>
    );
  }

  if (stage === 'insist') {
    return (
      <div className="donation-overlay" role="dialog" aria-modal="true">
        <div className="donation-card donation-card-insist">
          <button
            type="button"
            className="donation-close"
            aria-label="Cerrar"
            onClick={() => setStage('mega')}
          >
            ×
          </button>
          <h2 className="donation-insist-title">POR FAVOR DONA</h2>
          <a
            className="donation-cta donation-cta-big"
            href={DONATION_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setStage('closed')}
          >
            Donar $1000
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-overlay" role="dialog" aria-modal="true">
      <div className="donation-card">
        <button
          type="button"
          className="donation-close"
          aria-label="Cerrar"
          onClick={() => setStage('insist')}
        >
          ×
        </button>
        <h2>¿Nos ayudás con una donación?</h2>
        <p>
          Si te gusta la app y querés bancar el proyecto, cualquier aporte
          suma. ¡Gracias!
        </p>
        <a
          className="donation-cta"
          href={DONATION_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setStage('closed')}
        >
          Donar $1000
        </a>
        <button
          type="button"
          className="donation-dismiss"
          onClick={() => setStage('insist')}
        >
          No, gracias
        </button>
      </div>
    </div>
  );
}
