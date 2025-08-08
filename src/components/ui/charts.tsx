import { Bar, BarChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

interface ChartProps {
  data: any[];
  className?: string;
}

export const SimpleBarChart = ({ data, className = "" }: ChartProps) => (
  <ResponsiveContainer width="100%" height={300} className={className}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="value" fill="hsl(var(--primary))" />
    </BarChart>
  </ResponsiveContainer>
);

export const SimpleLineChart = ({ data, className = "" }: ChartProps) => (
  <ResponsiveContainer width="100%" height={300} className={className}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const SimplePieChart = ({ data, className = "" }: ChartProps) => {
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    'hsl(var(--destructive))',
  ];

  return (
    <ResponsiveContainer width="100%" height={300} className={className}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};