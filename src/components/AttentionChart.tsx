import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface AttentionChartProps {
  data: { time: string; score: number }[];
}

const AttentionChart = ({ data }: AttentionChartProps) => {
  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
      <h3 className="font-semibold mb-4">Attention Score History</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => value.split(':').slice(1).join(':')}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="url(#scoreGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          No data yet. Start monitoring to see the attention score graph.
        </div>
      )}
    </Card>
  );
};

export default AttentionChart;
