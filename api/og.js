import { ImageResponse } from '@vercel/og';
import { computeArchetype, ARCHETYPES } from '../src/data/archetypes.js';

export const config = { runtime: 'edge' };

/**
 * Dynamic Open Graph image generator.
 * GET /api/og                   → default branded image
 * GET /api/og?code=L2_...       → your terrain: archetype + your signature bars
 * GET /api/og?archetype=<key>   → a named archetype card (for /a/<key> share links)
 */
export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const archetypeKey = searchParams.get('archetype');

  const PARAM_LABELS = [
    'Deep Friendships', 'Romantic Love', 'Tender Middle', 'Casual Touch',
    'Physical Barriers', 'Ungrounded Barriers', 'Uncertainty Tolerance',
    'Openness', 'Mapped Terrain', 'Self-Intimacy', 'Conflict Approach',
    'Playfulness', 'Attachment Security',
  ];

  // Decode the code param to get landscape values
  let params = null;
  if (code) {
    try {
      const isV2 = code.startsWith('L2_');
      const payload = isV2 || code.startsWith('L1_') ? code.slice(3) : null;
      if (payload) {
        let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const binary = atob(b64);
        // L2 codes carry exactly 13 param bytes, L1 exactly 9 — anything else is garbage
        if (binary.length === (isV2 ? 13 : 9)) {
          params = [];
          for (let i = 0; i < binary.length; i++) {
            params.push(binary.charCodeAt(i) / 255);
          }
        }
      }
    } catch { /* ignore decode errors, fall back to default */ }
  }

  // Resolve the archetype + the values to draw its signature bars from:
  //  - ?archetype=<key> → the named archetype, bars from its prototype
  //  - ?code=…          → nearest archetype to the user's terrain, bars from their params
  let arch = null;
  let barSource = null;
  if (archetypeKey) {
    arch = ARCHETYPES.find((a) => a.key === archetypeKey) || null;
    barSource = arch ? arch.prototype : null;
  } else if (params && params.length >= 13) {
    const r = computeArchetype(params);
    arch = r ? r.archetype : null;
    barSource = params;
  }

  // The archetype's signature params become the bars (3-4 per archetype).
  let highlights = [];
  if (arch && barSource) {
    highlights = arch.signature.map((i) => ({ label: PARAM_LABELS[i] || `P${i}`, value: barSource[i] }));
  }

  const isPersonalized = !!arch;

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1a1a18 0%, #242422 50%, #2a2838 100%)',
          fontFamily: 'Georgia, serif',
          color: '#e8e6e0',
          padding: '60px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: '28px',
                color: '#7F77DD',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginBottom: '12px',
              },
              children: 'Love Landscape',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: isPersonalized ? '54px' : '52px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: isPersonalized ? '10px' : '24px',
                lineHeight: 1.15,
              },
              children: isPersonalized ? arch.name : 'The Shape of Intimacy',
            },
          },
          ...(isPersonalized
            ? [{
                type: 'div',
                props: {
                  style: {
                    fontSize: '26px',
                    color: '#b8b4d8',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginBottom: '22px',
                  },
                  children: arch.essence,
                },
              }]
            : []),
          isPersonalized
            ? {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '100%',
                    maxWidth: '700px',
                    marginTop: '16px',
                  },
                  children: highlights.map((h) => ({
                    type: 'div',
                    props: {
                      key: h.label,
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              width: '160px',
                              fontSize: '18px',
                              color: '#9a9890',
                              textAlign: 'right',
                            },
                            children: h.label,
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex', // Satori requires explicit flex here; without it the whole render throws
                              flex: 1,
                              height: '20px',
                              background: '#333',
                              borderRadius: '10px',
                              overflow: 'hidden',
                            },
                            children: {
                              type: 'div',
                              props: {
                                style: {
                                  width: `${Math.round(h.value * 100)}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #7F77DD, #6B63C7)',
                                  borderRadius: '10px',
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  })),
                },
              }
            : {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px',
                    color: '#9a9890',
                    textAlign: 'center',
                    maxWidth: '600px',
                    lineHeight: 1.6,
                  },
                  children: '19 questions · 3D terrain · No account needed',
                },
              },
          {
            type: 'div',
            props: {
              style: {
                marginTop: 'auto',
                paddingTop: '32px',
                fontSize: '18px',
                color: '#6b6960',
              },
              children: 'love-landscape.com',
            },
          },
        ],
      },
    },
    { width: 1200, height: 630 },
  );
}
