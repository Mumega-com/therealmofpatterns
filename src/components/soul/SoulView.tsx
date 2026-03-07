// @ts-nocheck
'use client';

/**
 * SoulView — authenticated full-screen soul field page.
 * Loads natal data from localStorage, renders SoulToroid in full mode,
 * and handles share link generation.
 */

import { useState, useEffect, useCallback } from 'react';
import { SoulToroid, encodeShareToken } from '../charts/SoulToroid';
import { getDashboardData } from '../../lib/dashboard-utils';

export function SoulView() {
  const [data, setData]       = useState<any>(null);
  const [copied, setCopied]   = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const d = getDashboardData();
    setData(d);
    if (!d.hasBirthData && typeof window !== 'undefined') {
      window.location.href = '/discover';
    }
  }, []);

  const handleShare = useCallback(() => {
    if (!data?.birthData) return;
    const token = encodeShareToken(data.birthData);
    const url   = `${window.location.origin}/soul/${token}`;
    setShareUrl(url);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }, [data]);

  if (!data || !data.hasBirthData) return null;

  return (
    <div className="soul-view">
      {/* Back nav */}
      <a href="/dashboard" className="sv-back">← Dashboard</a>

      <SoulToroid
        natal={data.natalVector ?? Array(8).fill(0.5)}
        transit={data.transitVector ?? undefined}
        mode="full"
        archetypeName={data.archetype?.primary.title}
        onShare={handleShare}
      />

      {/* Share toast */}
      {shareUrl && (
        <div className={`sv-toast ${copied ? 'sv-toast-ok' : ''}`}>
          {copied ? '✓ Link copied — share your field' : shareUrl}
        </div>
      )}

      <style>{`
        .soul-view {
          position: fixed;
          inset: 0;
          background: #05060a;
          display: flex;
          flex-direction: column;
        }
        .sv-back {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 20;
          font-size: 12px;
          color: rgba(207,211,255,0.5);
          text-decoration: none;
          transition: color 0.2s;
          padding: 6px 10px;
          background: rgba(4,6,18,0.6);
          border-radius: 6px;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(100,140,255,0.12);
        }
        .sv-back:hover { color: #fff; }
        .sv-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          background: rgba(4,6,18,0.9);
          border: 1px solid rgba(100,140,255,0.3);
          border-radius: 8px;
          color: rgba(207,211,255,0.8);
          font-size: 12px;
          backdrop-filter: blur(8px);
          max-width: 420px;
          text-align: center;
          word-break: break-all;
          z-index: 30;
          transition: all 0.3s;
        }
        .sv-toast-ok {
          border-color: rgba(199,255,106,0.4);
          color: #c7ff6a;
        }
      `}</style>
    </div>
  );
}
