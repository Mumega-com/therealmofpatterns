'use client';

import { useState, useEffect } from 'react';
import type { CosmicEvent } from '../../lib/cosmic-events';
import type { BirthData } from '../../types';
import { getDailyReading, getDailyAction } from '../../lib/daily-reading-content';
import { DIMENSION_METADATA } from '../../types';
import { RadarChart } from '../charts/RadarChart';
import { computeFromBirthData, getDominant } from '../../lib/16d-engine';
import { assignArchetype } from '../../lib/archetype-engine';
import type { ArchetypeResult } from '../../lib/archetype-engine';

interface DailyReadingProps {
  date: string;         // YYYY-MM-DD
  events: string;       // JSON-serialized CosmicEvent[]
  vector: string;       // JSON-serialized number[]
  dominantIndex: number;
  sunSign: string;
  moonSign: string;
}

interface CMSContent {
  title: string;
  hero_content: string;
  content_blocks: Array<{ type: string; order: number; content: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

export function DailyReading({ date, events: eventsJson, vector: vectorJson, dominantIndex, sunSign, moonSign }: DailyReadingProps) {
  const events: CosmicEvent[] = JSON.parse(eventsJson);
  const vector: number[] = JSON.parse(vectorJson);
  const dominant = DIMENSION_METADATA[dominantIndex];

  const [cmsContent, setCmsContent] = useState<CMSContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [personalData, setPersonalData] = useState<{
    natalVector: number[];
    natalDominant: { index: number; name: string; domain: string };
    archetype: ArchetypeResult;
  } | null>(null);

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Fetch CMS content
  useEffect(() => {
    const slug = `en/cosmic-weather/${date}`;
    fetch(`/api/cms/page?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        const d = data as Record<string, unknown> | null;
        if (d?.content_blocks) {
          try {
            const blocks = typeof d.content_blocks === 'string' ? JSON.parse(d.content_blocks) : d.content_blocks;
            const faqs = d.faqs ? (typeof d.faqs === 'string' ? JSON.parse(d.faqs) : d.faqs) : [];
            setCmsContent({ title: d.title as string, hero_content: d.hero_content as string, content_blocks: blocks, faqs });
          } catch { /* fallback to computed */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  // Check for birth data and compute personal profile
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rop_birth_data_full');
      if (!stored) return;
      const birthData: BirthData = JSON.parse(stored);
      const natalVector = Array.from(computeFromBirthData(birthData));
      const natalDom = getDominant(natalVector);
      const archetype = assignArchetype(natalVector);
      setPersonalData({
        natalVector,
        natalDominant: { index: natalDom.index, name: natalDom.name, domain: natalDom.domain },
        archetype,
      });
    } catch { /* no birth data or parse error — stay generic */ }
  }, []);

  // Determine which dimension is most activated for the user today
  // (largest difference where transit > natal)
  const mostActivatedToday = personalData
    ? (() => {
        let bestIdx = 0;
        let bestDiff = -Infinity;
        for (let i = 0; i < 8; i++) {
          const diff = vector[i] - personalData.natalVector[i];
          if (diff > bestDiff) { bestDiff = diff; bestIdx = i; }
        }
        return DIMENSION_METADATA[bestIdx];
      })()
    : null;

  return (
    <article className="daily-reading">
      {/* Date Header */}
      <header className="reading-header">
        <time dateTime={date} className="reading-date">{formattedDate}</time>
        <h1 className="reading-title">
          {personalData ? 'Your Personal Cosmic Reading' : (cmsContent?.title || 'Daily Cosmic Reading')}
        </h1>
        <p className="reading-signs">
          Sun in {sunSign} &middot; Moon in {moonSign}
        </p>
      </header>

      {/* Cosmic Events Banner */}
      {events.length > 0 && (
        <div className="events-banner">
          {events.map((e, i) => (
            <div key={i} className="event-card" style={{ borderLeftColor: e.color }}>
              <span className="event-icon">{e.icon}</span>
              <div>
                <strong className="event-name">{e.name}</strong>
                <p className="event-desc">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CMS Content or Fallback */}
      <div className="reading-body">
        {loading ? (
          <div className="reading-loading">
            <div className="pulse" />
            <p>Channeling today's cosmic energy...</p>
          </div>
        ) : cmsContent?.content_blocks?.length ? (
          <div className="cms-content">
            {cmsContent.hero_content && (
              <blockquote className="reading-hero">{cmsContent.hero_content}</blockquote>
            )}
            {cmsContent.content_blocks
              .sort((a, b) => a.order - b.order)
              .map((block, i) => (
                <section key={i} className="content-block">
                  <div dangerouslySetInnerHTML={{ __html: block.content }} />
                </section>
              ))}
          </div>
        ) : (
          (() => {
            const reading = getDailyReading(dominantIndex, new Date(date));
            const action = getDailyAction(dominantIndex, new Date(date));
            return (
              <div className="fallback-reading">
                <p className="reading-intro">
                  {personalData ? (
                    <>As <strong>{personalData.archetype.primary.title}</strong> with strong <strong>{personalData.natalDominant.name}</strong> energy, today's {dominant.name} transit {dominant.index === personalData.natalDominant.index ? 'amplifies your natural strengths' : `activates your ${dominant.name.toLowerCase()} side — a different gear from your usual ${personalData.natalDominant.name.toLowerCase()} focus`}.</>
                  ) : (
                    <>Today's cosmic field is shaped by the Sun in {sunSign} and Moon in {moonSign}, activating the <strong>{dominant.name}</strong> dimension — the realm of {dominant.domain.toLowerCase()}.</>
                  )}
                </p>
                <p>{reading.opening}</p>
                <p>{reading.body}</p>
                <p className="reading-closing">{reading.closing}</p>
                <div className="daily-action">
                  <h3 className="action-label">Today's Action</h3>
                  <p className="action-title">{action.title}</p>
                  <p className="action-desc">{action.description}</p>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Dimension Spotlight */}
      <section className="dimension-spotlight">
        <h2>{personalData ? 'Your Pattern vs. Today\'s Sky' : 'Today\'s Energy Field'}</h2>
        <div className="reading-radar">
          <RadarChart
            values={personalData ? personalData.natalVector : vector}
            overlay={personalData ? vector : undefined}
            dominantIndex={personalData ? personalData.natalDominant.index : dominantIndex}
            size={260}
          />
          {personalData && (
            <div className="radar-legend">
              <span className="legend-item legend-natal">Your Pattern</span>
              <span className="legend-item legend-transit">Today's Sky</span>
            </div>
          )}
        </div>
        <div className="dim-bars">
          {vector.slice(0, 8).map((val, i) => {
            const meta = DIMENSION_METADATA[i];
            const pct = Math.round(val * 100);
            const isDominant = i === dominantIndex;
            const natalPct = personalData ? Math.round(personalData.natalVector[i] * 100) : null;
            return (
              <div key={i} className={`dim-row ${isDominant ? 'dim-dominant' : ''}`}>
                <span className="dim-symbol">{meta.symbol}</span>
                <span className="dim-name">{meta.name}</span>
                <div className="dim-bar-track">
                  <div
                    className="dim-bar-fill"
                    style={{ width: `${pct}%`, opacity: isDominant ? 1 : 0.6 }}
                  />
                  {natalPct !== null && (
                    <div
                      className="dim-natal-marker"
                      style={{ left: `${natalPct}%` }}
                      title={`Your natal: ${natalPct}%`}
                    />
                  )}
                </div>
                <span className="dim-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ section for SEO */}
      {cmsContent?.faqs?.length ? (
        <section className="reading-faqs">
          <h2>Questions About Today's Reading</h2>
          {cmsContent.faqs.map((faq, i) => (
            <details key={i} className="faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>
      ) : null}

      {/* CTA */}
      {personalData ? (
        <section className="reading-cta reading-cta-personal">
          <h2>Your Personalized Insights</h2>
          <p className="personal-summary">
            As <strong>{personalData.archetype.primary.title}</strong>,
            {mostActivatedToday && <> your <strong>{mostActivatedToday.name}</strong> dimension is most activated by today's sky.</>}
          </p>
          <a href="/dashboard" className="cta-button">
            See Your Full Dashboard &rarr;
          </a>
        </section>
      ) : (
        <section className="reading-cta">
          <h2>How Does This Affect You Personally?</h2>
          <p>Today's cosmic reading is general. Your unique birth pattern interacts with these transits differently. Enter your birthday to see your personalized energy forecast.</p>
          <a href="/discover" className="cta-button">
            Discover Your Pattern
          </a>
          <span className="cta-sub">Free &middot; 30 seconds &middot; No signup required</span>
        </section>
      )}

      <style>{`
        .daily-reading {
          max-width: 680px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }
        .reading-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .reading-date {
          display: block;
          font-size: 0.8rem;
          color: rgba(212, 168, 84, 0.6);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .reading-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #f0e8d8;
          margin: 0 0 0.5rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          line-height: 1.2;
        }
        .reading-signs {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.5);
        }

        /* Events */
        .events-banner {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .event-card {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 1rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-left: 3px solid;
          border-radius: 8px;
        }
        .event-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 0.1rem; }
        .event-name { color: #f0e8d8; font-size: 0.9rem; display: block; }
        .event-desc { color: rgba(240, 232, 216, 0.5); font-size: 0.8rem; margin: 0.25rem 0 0; line-height: 1.5; }

        /* Body */
        .reading-body { margin-bottom: 2.5rem; }
        .reading-loading {
          text-align: center;
          padding: 2rem;
          color: rgba(240, 232, 216, 0.4);
        }
        .pulse {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(212, 168, 84, 0.2);
          margin: 0 auto 1rem;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .reading-hero {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.2rem;
          font-style: italic;
          color: rgba(212, 168, 84, 0.8);
          border-left: 2px solid rgba(212, 168, 84, 0.3);
          padding-left: 1.25rem;
          margin: 0 0 1.5rem;
          line-height: 1.6;
        }
        .cms-content { color: rgba(240, 232, 216, 0.75); line-height: 1.7; font-size: 0.95rem; }
        .cms-content h2, .cms-content h3 { color: #f0e8d8; margin-top: 1.5rem; }
        .content-block { margin-bottom: 1rem; }
        .fallback-reading { color: rgba(240, 232, 216, 0.75); line-height: 1.7; font-size: 0.95rem; }
        .fallback-reading p { margin-bottom: 1rem; }
        .reading-intro { font-size: 1.05rem; }
        .reading-intro strong { color: #d4a854; }
        .reading-closing {
          font-style: italic;
          color: rgba(212, 168, 84, 0.7);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem;
        }
        .daily-action {
          margin-top: 1.5rem;
          padding: 1.25rem;
          background: rgba(212, 168, 84, 0.06);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 10px;
        }
        .action-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(212, 168, 84, 0.5);
          margin: 0 0 0.5rem;
        }
        .action-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f0e8d8;
          margin: 0 0 0.25rem !important;
        }
        .action-desc {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.6);
          margin: 0 !important;
          line-height: 1.5;
        }

        /* Dimensions */
        .dimension-spotlight {
          margin-bottom: 2.5rem;
          padding: 1.5rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 12px;
        }
        .dimension-spotlight h2 {
          font-size: 1rem;
          color: #f0e8d8;
          margin: 0 0 1rem;
          font-weight: 600;
        }
        .reading-radar {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .dim-bars { display: flex; flex-direction: column; gap: 0.5rem; }
        .dim-row {
          display: grid;
          grid-template-columns: 1.5rem 5.5rem 1fr 2.5rem;
          align-items: center;
          gap: 0.5rem;
        }
        .dim-symbol { font-size: 0.85rem; color: rgba(212, 168, 84, 0.5); text-align: center; }
        .dim-name { font-size: 0.8rem; color: rgba(240, 232, 216, 0.5); }
        .dim-bar-track {
          position: relative;
          height: 6px;
          background: rgba(240, 232, 216, 0.06);
          border-radius: 3px;
          overflow: visible;
        }
        .dim-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(212, 168, 84, 0.4), rgba(212, 168, 84, 0.8));
          border-radius: 3px;
          transition: width 0.8s ease;
        }
        .dim-natal-marker {
          position: absolute;
          top: -2px;
          width: 3px;
          height: 10px;
          background: rgba(167, 139, 250, 0.8);
          border-radius: 1px;
          transform: translateX(-1px);
        }
        .dim-pct { font-size: 0.75rem; color: rgba(240, 232, 216, 0.4); text-align: right; }
        .dim-dominant .dim-symbol { color: #d4a854; }
        .dim-dominant .dim-name { color: #d4a854; font-weight: 600; }
        .dim-dominant .dim-pct { color: #d4a854; }
        .dim-dominant .dim-bar-fill { opacity: 1 !important; }

        /* FAQs */
        .reading-faqs { margin-bottom: 2.5rem; }
        .reading-faqs h2 { font-size: 1rem; color: #f0e8d8; margin: 0 0 1rem; font-weight: 600; }
        .faq-item {
          border-bottom: 1px solid rgba(212, 168, 84, 0.08);
          padding: 0.75rem 0;
        }
        .faq-item summary {
          cursor: pointer;
          color: rgba(240, 232, 216, 0.7);
          font-size: 0.9rem;
          font-weight: 500;
        }
        .faq-item summary:hover { color: #d4a854; }
        .faq-item p {
          color: rgba(240, 232, 216, 0.5);
          font-size: 0.85rem;
          line-height: 1.6;
          margin: 0.5rem 0 0;
          padding-left: 1rem;
        }

        /* CTA */
        .reading-cta {
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.08), rgba(167, 139, 250, 0.05));
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 16px;
          margin-bottom: 2rem;
        }
        .reading-cta h2 {
          font-size: 1.3rem;
          color: #f0e8d8;
          margin: 0 0 0.75rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .reading-cta p {
          color: rgba(240, 232, 216, 0.5);
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0 0 1.5rem;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }
        .cta-button {
          display: inline-block;
          padding: 0.8rem 2rem;
          background: linear-gradient(135deg, #d4a854, #c49a4a);
          color: #0a0908;
          font-weight: 700;
          font-size: 0.95rem;
          border-radius: 8px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(212, 168, 84, 0.3);
        }
        .cta-sub {
          display: block;
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.3);
        }

        /* Radar legend */
        .radar-legend {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 0.75rem;
        }
        .legend-item {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .legend-item::before {
          content: '';
          display: inline-block;
          width: 12px;
          height: 3px;
          border-radius: 1px;
        }
        .legend-natal { color: rgba(212, 168, 84, 0.7); }
        .legend-natal::before { background: rgba(212, 168, 84, 0.7); }
        .legend-transit { color: rgba(167, 139, 250, 0.7); }
        .legend-transit::before { background: rgba(167, 139, 250, 0.7); border-style: dashed; }

        /* Personalized CTA */
        .reading-cta-personal {
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.08), rgba(212, 168, 84, 0.06));
          border-color: rgba(167, 139, 250, 0.15);
        }
        .personal-summary {
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .personal-summary strong { color: #d4a854; }

        @media (max-width: 640px) {
          .reading-title { font-size: 1.4rem; }
          .dim-row { grid-template-columns: 1.2rem 4rem 1fr 2rem; }
          .dim-name { font-size: 0.7rem; }
        }
      `}</style>
    </article>
  );
}
