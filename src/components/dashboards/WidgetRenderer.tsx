import React, { useMemo } from 'react';
import { WidgetConfig, Dataset, DashboardFilter, RelationshipSuggestion } from '@/types';
import { executeQuery } from '@/lib/queryEngine';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';

interface WidgetRendererProps {
  widget: WidgetConfig;
  datasets: Dataset[];
  relationships: RelationshipSuggestion[];
  filters: DashboardFilter[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function WidgetRenderer({ widget, datasets, relationships, filters }: WidgetRendererProps) {
  const primaryDataset = datasets.find(d => d.name === widget.datasetId || d.id === widget.datasetId);

  const data = useMemo(() => {
    return executeQuery(datasets, relationships, widget, filters);
  }, [datasets, relationships, widget, filters]);

  if (!primaryDataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-sm p-4 text-center">
        <span className="text-amber-500 mb-2 font-bold flex items-center gap-1">⚠️ Missing Data</span>
        <p>Dataset '{widget.datasetId}' is no longer available.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
        No data available
      </div>
    );
  }

  if (widget.type === 'kpi') {
    const value = data[0]?.value || 0;
    const formatted = typeof value === 'number' 
      ? value % 1 === 0 ? value.toLocaleString() : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value;
      
    return (
      <div className="flex-1 flex flex-col justify-center">
        <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{formatted}</span>
      </div>
    );
  }

  const { xAxisColumn, yAxisColumn } = widget;
  
  if (!xAxisColumn || !yAxisColumn) {
    return <div className="text-red-500 text-sm">Missing axis configuration</div>;
  }

  const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  );

  switch (widget.type) {
    case 'line':
      return (
        <ChartWrapper>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
            <Line type="monotone" dataKey={yAxisColumn} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ChartWrapper>
      );
    case 'bar':
      return (
        <ChartWrapper>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip cursor={{ fill: 'var(--color-bg-muted)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
            <Bar dataKey={yAxisColumn} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartWrapper>
      );
    case 'area':
      return (
        <ChartWrapper>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
            <Area type="monotone" dataKey={yAxisColumn} stroke="#3b82f6" fillOpacity={1} fill="url(#colorY)" />
          </AreaChart>
        </ChartWrapper>
      );
    case 'donut':
    case 'pie':
      return (
        <ChartWrapper>
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={widget.type === 'donut' ? 60 : 0}
              outerRadius={80}
              paddingAngle={widget.type === 'donut' ? 5 : 0}
              dataKey={yAxisColumn}
              nameKey={xAxisColumn}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ChartWrapper>
      );
    case 'scatter':
      return (
        <ChartWrapper>
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis type="category" dataKey={xAxisColumn} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey={yAxisColumn} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
            <Scatter data={data} fill="#3b82f6" />
          </ScatterChart>
        </ChartWrapper>
      );
    default:
      return <div className="text-zinc-500 text-sm flex items-center justify-center h-full"><Activity className="w-5 h-5 mr-2" /> Unsupported chart type</div>;
  }
}
