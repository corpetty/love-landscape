import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Legend,
} from 'recharts';
import { generateReading } from '../data/interpretation.js';

const ACCENT = '#7F77DD';
const PARTNER_COLOR = '#2dd4a8';

export default function RadarView({ params, partnerParams, view = 'yours' }) {
  const reading = generateReading(params);

  const data = reading.map((item, i) => {
    const entry = {
      param: item.short,
      fullName: item.name,
      yours: Math.round(params[i] * 100),
    };
    if (partnerParams) {
      entry.theirs = Math.round(partnerParams[i] * 100);
    }
    return entry;
  });

  const showYours = view === 'yours' || view === 'combined';
  const showTheirs = (view === 'theirs' || view === 'combined') && partnerParams;

  return (
    <div style={{
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      aspectRatio: '1',
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid
            stroke="var(--color-border)"
            strokeOpacity={0.5}
          />
          <PolarAngleAxis
            dataKey="param"
            tick={{
              fontSize: 10,
              fill: 'var(--color-text-muted)',
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 8, fill: 'var(--color-text-muted)' }}
            tickCount={5}
            axisLine={false}
          />

          {showYours && (
            <Radar
              name="Yours"
              dataKey="yours"
              stroke={ACCENT}
              fill={ACCENT}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          {showTheirs && (
            <Radar
              name="Theirs"
              dataKey="theirs"
              stroke={PARTNER_COLOR}
              fill={PARTNER_COLOR}
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
          )}

          {partnerParams && view === 'combined' && (
            <Legend
              wrapperStyle={{ fontSize: '0.75rem' }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
