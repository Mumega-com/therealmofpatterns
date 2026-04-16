/**
 * GET /report/:id
 *
 * PHASE 4 — Public permalink for the free archetype report.
 *
 * Server-rendered HTML (not an Astro static page) so OG meta tags reflect
 * the specific report's archetype, oracle sentence, and share card URL.
 * This is what makes Instagram/Twitter screenshot-and-share work at scale.
 *
 * Increments view_count on each hit. Pulls the full report JSON from D1
 * and renders it into a screenshot-worthy layout.
 */

import type { Env } from '../../src/types';

interface StoredReport {
  id: string;
  report_data: string;
  primary_archetype: string;
  shadow_archetype: string;
  oracle_sentence: string;
  referral_code: string;
  referral_count: number;
  bonus_unlocked: number;
}

interface ArchetypeReport {
  report_id: string;
  generated_at: string;
  language: string;
  birth: { date: string; time: string | null; location: string | null };
  identity: {
    primary_archetype: { id: string; title: string; planet: string; gift: string; quote: string; quote_author: string };
    shadow_archetype: { id: string; title: string; shadow_name: string; shadow_description: string };
    dominant_dimension: { name: string; domain: string; ruler: string; value: number };
    weakest_dimension: { name: string; domain: string; ruler: string; value: number };
    journey_stage: string;
    profile_shape: 'spike' | 'balanced' | 'split';
  };
  dimensions_16d: Array<{
    octave: 'inner' | 'shadow'; index: number; name: string; symbol: string;
    domain: string; ruler: string; value: number; rank: number;
  }>;
  jungian_threads: Array<{ concept: string; description: string; relevance: string }>;
  historical_resonance: Array<{ id: number; name: string; era: string; culture: string; domains: string[]; quote: string; bio: string; similarity: number }>;
  oracle_sentence: string;
  practice_prompts: string[];
  sol_voice: { intro: string; strength: string; shadow: string };
  referral: { code: string; share_url: string; count: number; bonus_unlocked: boolean; unlock_threshold: number };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function notFoundPage(appUrl: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Report not found — The Realm of Patterns</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a10; color: #ededf0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 2rem; }
    h1 { color: #d4a017; font-weight: 300; }
    a { color: #d4a017; }
  </style>
</head>
<body>
  <div>
    <h1>Report not found</h1>
    <p>This report ID doesn't match anything in our field.</p>
    <p><a href="${appUrl}/free-report">← Generate a new report</a></p>
  </div>
</body>
</html>`;
  return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function renderDimensionBar(name: string, symbol: string, value: number): string {
  const pct = Math.round(value * 100);
  return `
    <div class="dim-row">
      <div class="dim-label"><span class="dim-sym">${escapeHtml(symbol)}</span> ${escapeHtml(name)}</div>
      <div class="dim-bar"><div class="dim-fill" style="width:${pct}%"></div></div>
      <div class="dim-val">${pct}%</div>
    </div>`;
}

function renderFigureCard(f: ArchetypeReport['historical_resonance'][number], rank: number): string {
  const sim = Math.round(f.similarity * 100);
  return `
    <article class="figure-card">
      <div class="figure-rank">#${rank}</div>
      <h3>${escapeHtml(f.name)}</h3>
      <p class="figure-meta">${escapeHtml([f.era, f.culture].filter(Boolean).join(' · '))}</p>
      <div class="figure-sim">${sim}% pattern resonance</div>
      ${f.quote ? `<blockquote>"${escapeHtml(f.quote)}"</blockquote>` : ''}
      ${f.bio ? `<p class="figure-bio">${escapeHtml(f.bio.slice(0, 240))}${f.bio.length > 240 ? '…' : ''}</p>` : ''}
    </article>`;
}

function renderReportPage(report: ArchetypeReport, appUrl: string): string {
  const { identity, dimensions_16d, jungian_threads, historical_resonance,
          oracle_sentence, practice_prompts, sol_voice, referral } = report;

  const innerDims = dimensions_16d.filter(d => d.octave === 'inner');
  const topFigures = historical_resonance.slice(0, 3);
  const moreFigures = historical_resonance.slice(3);

  const title = `${identity.primary_archetype.title} — your archetype report | The Realm of Patterns`;
  const description = oracle_sentence.length > 0
    ? oracle_sentence
    : `Your ${identity.primary_archetype.title} archetype report. Dominant dimension: ${identity.dominant_dimension.name}. Shadow: ${identity.weakest_dimension.name}.`;
  const permalink = `${appUrl}/report/${report.report_id}`;
  const shareUrl = referral.share_url;

  const shareText = encodeURIComponent(
    `I got ${identity.primary_archetype.title} on The Realm of Patterns — a 20-section Jungian archetype report from my birth chart. Get yours:`
  );
  const twitterShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;

  return `<!DOCTYPE html>
<html lang="${report.language || 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${permalink}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${permalink}">
  <meta property="og:site_name" content="The Realm of Patterns">
  <meta property="og:image" content="${appUrl}/og-image.png">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${appUrl}/og-image.png">

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #0a0a10; color: #ededf0; line-height: 1.55; }
    a { color: #d4a017; }
    .page { max-width: 760px; margin: 0 auto; padding: 3rem 1.25rem 6rem; position: relative; }

    .bg-glow { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
    .bg-glow .glow { position: absolute; border-radius: 50%; filter: blur(140px); }
    .bg-glow .glow-1 { width: 600px; height: 600px; background: radial-gradient(circle, #7c5ce6 0%, transparent 70%); top: -220px; left: -200px; opacity: 0.3; }
    .bg-glow .glow-2 { width: 440px; height: 440px; background: radial-gradient(circle, #d4a017 0%, transparent 70%); bottom: -160px; right: -140px; opacity: 0.2; }

    header.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
    .logo { color: #d4a017; text-decoration: none; font-weight: 400; letter-spacing: 0.02em; }
    .cta-nav { background: rgba(212, 160, 23, 0.1); border: 1px solid rgba(212, 160, 23, 0.3); color: #d4a017; padding: 0.4rem 0.9rem; border-radius: 100px; text-decoration: none; font-size: 0.875rem; }

    .hero-card { padding: 3rem 2rem; text-align: center; border-radius: 20px; background: linear-gradient(135deg, rgba(124, 92, 230, 0.14), rgba(212, 160, 23, 0.06)); border: 1px solid rgba(237, 237, 240, 0.1); margin-bottom: 3rem; }
    .archetype-eyebrow { font-size: 0.875rem; letter-spacing: 0.15em; text-transform: uppercase; color: #d4a017; margin: 0 0 1rem; }
    .archetype-title { font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 300; margin: 0 0 1rem; color: #ededf0; letter-spacing: -0.01em; }
    .archetype-gift { font-size: 1.125rem; color: rgba(237, 237, 240, 0.85); max-width: 520px; margin: 0 auto 1.25rem; }
    .archetype-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; color: rgba(237, 237, 240, 0.65); font-size: 0.875rem; margin-top: 1rem; }
    .archetype-meta span { padding: 0.3rem 0.8rem; background: rgba(237, 237, 240, 0.06); border-radius: 100px; }

    .oracle { padding: 3rem 2rem; text-align: center; border-radius: 16px; background: rgba(20, 20, 30, 0.4); border: 1px solid rgba(212, 160, 23, 0.2); margin-bottom: 3rem; }
    .oracle-eyebrow { font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #d4a017; margin: 0 0 1rem; }
    .oracle-line { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-size: clamp(1.25rem, 3vw, 1.625rem); color: #ededf0; line-height: 1.4; max-width: 560px; margin: 0 auto; }

    section { margin-bottom: 3rem; }
    h2 { font-size: 1.375rem; font-weight: 400; color: #d4a017; margin: 0 0 1rem; letter-spacing: 0.01em; }
    h2 .sub { display: block; font-size: 0.8125rem; color: rgba(237, 237, 240, 0.55); letter-spacing: 0.05em; text-transform: uppercase; margin-top: 0.25rem; }

    .dim-row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 1rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(237, 237, 240, 0.06); }
    .dim-label { font-size: 0.9375rem; color: #ededf0; }
    .dim-sym { color: #d4a017; margin-right: 0.4rem; }
    .dim-bar { background: rgba(237, 237, 240, 0.08); border-radius: 100px; height: 6px; overflow: hidden; }
    .dim-fill { background: linear-gradient(90deg, #7c5ce6, #d4a017); height: 100%; border-radius: 100px; }
    .dim-val { font-size: 0.8125rem; color: rgba(237, 237, 240, 0.55); min-width: 3em; text-align: right; }

    .strong-weak { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
    .sw-card { padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(237, 237, 240, 0.1); }
    .sw-card.strong { background: rgba(212, 160, 23, 0.08); border-color: rgba(212, 160, 23, 0.25); }
    .sw-card.weak { background: rgba(124, 92, 230, 0.08); border-color: rgba(124, 92, 230, 0.25); }
    .sw-label { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(237, 237, 240, 0.55); margin: 0 0 0.5rem; }
    .sw-name { font-size: 1.125rem; font-weight: 500; color: #ededf0; margin: 0 0 0.5rem; }
    .sw-domain { font-size: 0.875rem; color: rgba(237, 237, 240, 0.7); margin: 0; }

    .figure-card { padding: 1.5rem; background: rgba(20, 20, 30, 0.5); border: 1px solid rgba(237, 237, 240, 0.09); border-radius: 12px; margin-bottom: 1rem; position: relative; }
    .figure-rank { position: absolute; top: 1rem; right: 1rem; font-family: Georgia, serif; font-size: 1.5rem; color: rgba(212, 160, 23, 0.55); }
    .figure-card h3 { font-size: 1.25rem; font-weight: 500; margin: 0 0 0.25rem; color: #ededf0; }
    .figure-meta { font-size: 0.875rem; color: rgba(237, 237, 240, 0.55); margin: 0 0 0.75rem; }
    .figure-sim { display: inline-block; font-size: 0.8125rem; color: #d4a017; background: rgba(212, 160, 23, 0.1); padding: 0.2rem 0.6rem; border-radius: 100px; margin-bottom: 1rem; }
    .figure-card blockquote { font-family: Georgia, serif; font-style: italic; color: rgba(237, 237, 240, 0.85); margin: 0 0 0.75rem; padding-left: 1rem; border-left: 2px solid rgba(212, 160, 23, 0.4); }
    .figure-bio { font-size: 0.9375rem; color: rgba(237, 237, 240, 0.7); margin: 0; }

    .thread-card { padding: 1.25rem 1.5rem; background: rgba(20, 20, 30, 0.4); border-left: 3px solid #7c5ce6; border-radius: 0 12px 12px 0; margin-bottom: 1rem; }
    .thread-name { font-size: 1rem; font-weight: 600; color: #7c5ce6; margin: 0 0 0.5rem; }
    .thread-desc { color: rgba(237, 237, 240, 0.8); margin: 0 0 0.5rem; font-size: 0.9375rem; }
    .thread-rel { color: rgba(237, 237, 240, 0.6); font-size: 0.875rem; font-style: italic; margin: 0; }

    .prompts { padding-left: 0; list-style: none; counter-reset: prompt; }
    .prompts li { counter-increment: prompt; padding: 1rem 0 1rem 3rem; position: relative; border-bottom: 1px solid rgba(237, 237, 240, 0.06); color: rgba(237, 237, 240, 0.9); }
    .prompts li::before { content: counter(prompt); position: absolute; left: 0; top: 1rem; width: 2rem; height: 2rem; background: rgba(212, 160, 23, 0.12); color: #d4a017; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 500; }

    .share-card { padding: 2rem; background: linear-gradient(135deg, rgba(212, 160, 23, 0.1), rgba(124, 92, 230, 0.08)); border: 1px solid rgba(212, 160, 23, 0.3); border-radius: 16px; text-align: center; margin: 3rem 0; }
    .share-card h2 { color: #d4a017; margin-bottom: 0.5rem; }
    .share-card p { color: rgba(237, 237, 240, 0.8); margin: 0 0 1.5rem; }
    .share-buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; }
    .share-btn { padding: 0.6rem 1.2rem; border-radius: 100px; background: rgba(237, 237, 240, 0.08); border: 1px solid rgba(237, 237, 240, 0.12); color: #ededf0; text-decoration: none; font-size: 0.9375rem; }
    .share-btn:hover { background: rgba(212, 160, 23, 0.15); border-color: rgba(212, 160, 23, 0.4); }

    .referral-card { padding: 2rem; background: rgba(20, 20, 30, 0.5); border: 1px dashed rgba(212, 160, 23, 0.4); border-radius: 12px; margin-bottom: 2rem; }
    .referral-card h3 { color: #d4a017; margin: 0 0 0.75rem; font-weight: 400; font-size: 1.1rem; }
    .referral-progress { display: flex; gap: 0.5rem; margin: 1rem 0; }
    .referral-dot { width: 14px; height: 14px; border-radius: 50%; background: rgba(237, 237, 240, 0.1); border: 1px solid rgba(237, 237, 240, 0.2); }
    .referral-dot.filled { background: #d4a017; border-color: #d4a017; box-shadow: 0 0 10px rgba(212, 160, 23, 0.5); }
    .referral-code { display: inline-block; font-family: "SF Mono", Monaco, monospace; background: rgba(212, 160, 23, 0.12); color: #d4a017; padding: 0.4rem 0.8rem; border-radius: 6px; margin-top: 0.5rem; }
    .referral-card small { color: rgba(237, 237, 240, 0.55); display: block; margin-top: 0.5rem; font-size: 0.8125rem; }

    .upgrade-card { padding: 2rem; background: rgba(20, 20, 30, 0.5); border: 1px solid rgba(237, 237, 240, 0.1); border-radius: 12px; text-align: center; margin-top: 2rem; }
    .upgrade-card h3 { font-weight: 400; color: #ededf0; margin: 0 0 0.75rem; font-size: 1.25rem; }
    .upgrade-card p { color: rgba(237, 237, 240, 0.7); margin: 0 0 1.25rem; }
    .upgrade-btn { display: inline-block; background: linear-gradient(135deg, #d4a017, #c08610); color: #0a0a10; padding: 0.8rem 1.8rem; border-radius: 8px; text-decoration: none; font-weight: 600; }

    footer.report-footer { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgba(237, 237, 240, 0.08); color: rgba(237, 237, 240, 0.45); font-size: 0.8125rem; text-align: center; }

    @media (max-width: 640px) {
      .page { padding: 2rem 1rem 4rem; }
      .hero-card { padding: 2rem 1.25rem; }
      .strong-weak { grid-template-columns: 1fr; }
      .dim-row { grid-template-columns: 1fr 1.3fr auto; gap: 0.5rem; }
    }
  </style>
</head>
<body>
  <div class="bg-glow">
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
  </div>

  <div class="page">
    <header class="topbar">
      <a href="${appUrl}" class="logo">✦ The Realm of Patterns</a>
      <a href="${appUrl}/free-report" class="cta-nav">Your report</a>
    </header>

    <section class="hero-card">
      <p class="archetype-eyebrow">Your core archetype</p>
      <h1 class="archetype-title">${escapeHtml(identity.primary_archetype.title)}</h1>
      <p class="archetype-gift">${escapeHtml(identity.primary_archetype.gift)}</p>
      <div class="archetype-meta">
        <span>Planet · ${escapeHtml(identity.primary_archetype.planet)}</span>
        <span>Dominant · ${escapeHtml(identity.dominant_dimension.name)}</span>
        <span>Shadow · ${escapeHtml(identity.weakest_dimension.name)}</span>
        <span>Stage · ${escapeHtml(identity.journey_stage)}</span>
      </div>
    </section>

    <section class="oracle">
      <p class="oracle-eyebrow">Oracle sentence</p>
      <p class="oracle-line">${escapeHtml(oracle_sentence)}</p>
    </section>

    <section>
      <h2>Your 8 dimensions<span class="sub">The inner octave, computed from your natal chart</span></h2>
      ${innerDims.map(d => renderDimensionBar(d.name, d.symbol, d.value)).join('')}
    </section>

    <section>
      <h2>Strength &amp; shadow<span class="sub">Where you shine, where the teacher lives</span></h2>
      <div class="strong-weak">
        <div class="sw-card strong">
          <p class="sw-label">Strongest</p>
          <h3 class="sw-name">${escapeHtml(identity.dominant_dimension.name)}</h3>
          <p class="sw-domain">${escapeHtml(identity.dominant_dimension.domain)} · ruled by ${escapeHtml(identity.dominant_dimension.ruler)}</p>
        </div>
        <div class="sw-card weak">
          <p class="sw-label">The teacher</p>
          <h3 class="sw-name">${escapeHtml(identity.weakest_dimension.name)}</h3>
          <p class="sw-domain">${escapeHtml(identity.weakest_dimension.domain)} · ruled by ${escapeHtml(identity.weakest_dimension.ruler)}</p>
        </div>
      </div>
      ${sol_voice.intro ? `<p>${escapeHtml(sol_voice.intro)}</p>` : ''}
      ${sol_voice.strength ? `<p>${escapeHtml(sol_voice.strength)}</p>` : ''}
    </section>

    <section>
      <h2>Historical resonance<span class="sub">Figures whose natal pattern most closely matches yours</span></h2>
      ${topFigures.map((f, i) => renderFigureCard(f, i + 1)).join('')}
      ${moreFigures.length > 0 ? `
        <details style="margin-top:1rem;">
          <summary style="cursor:pointer; color: rgba(237,237,240,0.65); padding: 0.5rem 0;">See 2 more matches</summary>
          ${moreFigures.map((f, i) => renderFigureCard(f, i + 4)).join('')}
        </details>
      ` : ''}
    </section>

    <section>
      <h2>Jungian threads<span class="sub">Depth-psychology concepts active in your field</span></h2>
      ${jungian_threads.map(t => `
        <div class="thread-card">
          <p class="thread-name">${escapeHtml(t.concept)}</p>
          <p class="thread-desc">${escapeHtml(t.description)}</p>
          <p class="thread-rel">${escapeHtml(t.relevance)}</p>
        </div>
      `).join('')}
    </section>

    <section>
      <h2>Practice prompts<span class="sub">Three open questions for the next week</span></h2>
      <ol class="prompts">
        ${practice_prompts.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
      </ol>
    </section>

    <section class="share-card">
      <h2>Share your report</h2>
      <p>Your archetype may surprise someone who needs to see it named.</p>
      <div class="share-buttons">
        <a class="share-btn" href="${twitterShare}" target="_blank" rel="noopener">Twitter / X</a>
        <a class="share-btn" href="${facebookShare}" target="_blank" rel="noopener">Facebook</a>
        <a class="share-btn" href="${telegramShare}" target="_blank" rel="noopener">Telegram</a>
        <a class="share-btn" id="copy-link" href="${shareUrl}">Copy link</a>
      </div>
    </section>

    <section class="referral-card">
      <h3>Unlock your bonus compatibility chapter</h3>
      <p>When 3 friends generate their report with your code, we unlock a chapter showing how your pattern resonates with theirs.</p>
      <div class="referral-progress">
        ${[1,2,3].map(n => `<div class="referral-dot ${referral.count >= n ? 'filled' : ''}"></div>`).join('')}
      </div>
      <p><strong>${referral.count}</strong> / 3 referrals · ${referral.bonus_unlocked ? '<strong style="color:#d4a017;">bonus unlocked</strong>' : 'keep sharing'}</p>
      <p>Your code: <span class="referral-code">${escapeHtml(referral.code)}</span></p>
      <small>Or share this link directly — it carries your code: <a href="${shareUrl}">${escapeHtml(shareUrl)}</a></small>
    </section>

    <section class="upgrade-card">
      <h3>This was one frame. Pro is the daily practice.</h3>
      <p>Sol reads your field every morning, tracks your rhythm, and deepens the reading as you check in. $9.99/mo.</p>
      <a href="${appUrl}/subscribe" class="upgrade-btn">See Pro →</a>
    </section>

    <footer class="report-footer">
      Report ${escapeHtml(report.report_id)} · generated ${escapeHtml(report.generated_at.slice(0, 10))} · The Realm of Patterns
    </footer>
  </div>

  <script>
    (function() {
      var btn = document.getElementById('copy-link');
      if (!btn) return;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        navigator.clipboard.writeText(${JSON.stringify(shareUrl)}).then(function() {
          var old = btn.textContent;
          btn.textContent = 'Copied ✓';
          setTimeout(function() { btn.textContent = old; }, 1800);
        });
      });
    })();
  </script>
</body>
</html>`;
}

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ params, env }) => {
  const id = typeof params.id === 'string' ? params.id : '';
  if (!id || !/^[a-f0-9]{16}$/.test(id)) {
    return notFoundPage(env.APP_URL);
  }

  const row = await env.DB.prepare(`
    SELECT id, report_data, primary_archetype, shadow_archetype, oracle_sentence,
           referral_code, referral_count, bonus_unlocked
    FROM free_reports
    WHERE id = ?
    LIMIT 1
  `).bind(id).first<StoredReport>();

  if (!row) return notFoundPage(env.APP_URL);

  let report: ArchetypeReport;
  try {
    report = JSON.parse(row.report_data);
    // Hydrate latest referral stats onto the rendered object
    report.referral.count = row.referral_count;
    report.referral.bonus_unlocked = row.bonus_unlocked === 1;
  } catch {
    return notFoundPage(env.APP_URL);
  }

  // Best-effort view-count bump
  try {
    await env.DB.prepare(`UPDATE free_reports SET view_count = view_count + 1, updated_at = datetime('now') WHERE id = ?`)
      .bind(id).run();
  } catch { /* non-fatal */ }

  const html = renderReportPage(report, env.APP_URL);
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
};
