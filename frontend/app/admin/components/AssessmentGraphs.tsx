'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

export default function AssessmentGraphs({ submissions }: AssessmentGraphsProps) {
  // Prepare data for bar chart - Score vs Assessment
  const barChartData = submissions
    .filter((s) => s.Assessment && s.score !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((submission) => ({
      name: submission.Assessment?.title || 'Unknown',
      score: submission.score || 0,
      maxScore: submission.Assessment?.totalPoints || 100,
      percentage: submission.Assessment
        ? Math.round((submission.score! / submission.Assessment.totalPoints) * 100)
        : 0,
    }));

  // Prepare data for pie chart - Performance distribution
  const performanceData = submissions
    .filter((s) => s.score !== undefined)
    .reduce(
      (acc, submission) => {
        const percentage = submission.Assessment
          ? Math.round((submission.score! / submission.Assessment.totalPoints) * 100)
          : 0;

        if (percentage >= 80) {
          acc[0].value += 1;
        } else if (percentage >= 60) {
          acc[1].value += 1;
        } else {
          acc[2].value += 1;
        }
        return acc;
      },
      [
        { name: 'Excellent (≥80%)', value: 0, color: '#10b981' },
        { name: 'Good (60-79%)', value: 0, color: '#3b82f6' },
        { name: 'Needs Improvement (<60%)', value: 0, color: '#ef4444' },
      ]
    )
    .filter((d) => d.value > 0);

  // Prepare data for line chart - Performance trend
  const trendData = submissions
    .filter((s) => s.Assessment && s.score !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((submission, index) => ({
      index: index + 1,
      name: `Assessment ${index + 1}`,
      percentage: submission.Assessment
        ? Math.round((submission.score! / submission.Assessment.totalPoints) * 100)
        : 0,
      score: submission.score || 0,
      maxScore: submission.Assessment?.totalPoints || 100,
    }));

  const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Bar Chart - Scores by Assessment */}
      {barChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Score by Assessment</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={barChartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'score') return [`${value} pts`, 'Score'];
                  if (name === 'maxScore') return [`${value} pts`, 'Max'];
                  return value;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="score" fill="#3b82f6" name="Score" radius={[8, 8, 0, 0]} />
              <Bar dataKey="maxScore" fill="#e5e7eb" name="Max Score" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Line Chart - Performance Trend */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trendData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: any) => [`${value}%`, 'Score']}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
                name="Percentage (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie Chart - Performance Distribution */}
      {performanceData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Distribution</h3>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 md:mt-0 md:ml-6 space-y-2">
              {performanceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name}: <span className="font-semibold">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
