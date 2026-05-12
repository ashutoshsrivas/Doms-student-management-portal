'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Submission {
  id: string;
  assessmentId: string;
  score?: number;
  status: string;
  createdAt: string;
  Assessment?: {
    id: string;
    title: string;
    totalPoints: number;
    createdAt: string;
  };
}

interface AssessmentGraphsProps {
  submissions: Submission[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; stroke?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[rgba(60,60,67,0.1)] px-4 py-3">
      {label && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(60,60,67,0.4)] mb-2">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-[13px] font-bold" style={{ color: entry.color || entry.stroke || '#007AFF' }}>
          {entry.name}: {entry.value}{entry.name === 'Score %' ? '%' : ' pts'}
        </p>
      ))}
    </div>
  );
};

export default function AssessmentGraphs({ submissions }: AssessmentGraphsProps) {
  const barChartData = submissions
    .filter((s) => s.Assessment && s.score !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((s) => {
      const title = s.Assessment?.title ?? 'Unknown';
      return {
        name: title.length > 16 ? title.slice(0, 15) + '…' : title,
        score: s.score ?? 0,
        maxScore: s.Assessment?.totalPoints ?? 100,
      };
    });

  const trendData = submissions
    .filter((s) => s.Assessment && s.score !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((s, i) => ({
      name: `#${i + 1}`,
      'Score %': s.Assessment
        ? Math.round((s.score! / s.Assessment.totalPoints) * 100)
        : 0,
    }));

  const performanceData = submissions
    .filter((s) => s.score !== undefined)
    .reduce(
      (acc, s) => {
        const pct = s.Assessment
          ? Math.round((s.score! / s.Assessment.totalPoints) * 100)
          : 0;
        if (pct >= 80) acc[0].value += 1;
        else if (pct >= 60) acc[1].value += 1;
        else acc[2].value += 1;
        return acc;
      },
      [
        { name: 'Excellent', label: '≥ 80%', value: 0, color: '#34C759' },
        { name: 'Good', label: '60–79%', value: 0, color: '#007AFF' },
        { name: 'Needs Work', label: '< 60%', value: 0, color: '#FF3B30' },
      ]
    )
    .filter((d) => d.value > 0);

  const totalGraded = performanceData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      {barChartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(60,60,67,0.4)] mb-1">Scores</p>
          <h3 className="text-[15px] font-bold text-gray-900 mb-5">Score by Assessment</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -22, bottom: 50 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007AFF" stopOpacity={1} />
                  <stop offset="100%" stopColor="#5AC8FA" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.06)" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                height={65}
                tick={{ fontSize: 11, fill: 'rgba(60,60,67,0.45)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgba(60,60,67,0.45)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,122,255,0.04)', radius: 6 }} />
              <Bar dataKey="score" fill="url(#barGrad)" name="Score" radius={[6, 6, 0, 0]} />
              <Bar dataKey="maxScore" fill="rgba(60,60,67,0.08)" name="Max Score" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend Area Chart */}
        {trendData.length > 1 && (
          <div className="bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(60,60,67,0.4)] mb-1">Trend</p>
            <h3 className="text-[15px] font-bold text-gray-900 mb-5">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -22, bottom: 5 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'rgba(60,60,67,0.45)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'rgba(60,60,67,0.45)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(0,122,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="Score %"
                  stroke="#007AFF"
                  strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={{ fill: '#007AFF', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#007AFF', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Donut + Legend */}
        {performanceData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(60,60,67,0.4)] mb-1">Distribution</p>
            <h3 className="text-[15px] font-bold text-gray-900 mb-5">Performance Split</h3>
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {performanceData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[20px] font-bold text-gray-900 leading-none">{totalGraded}</span>
                  <span className="text-[10px] text-[rgba(60,60,67,0.4)] font-medium mt-0.5">graded</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {performanceData.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[12px] font-semibold text-gray-800">{item.name}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900">{item.value}</span>
                    </div>
                    <div className="h-1 bg-[rgba(60,60,67,0.07)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(item.value / totalGraded) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
