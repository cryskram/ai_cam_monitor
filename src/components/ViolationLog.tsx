import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Eye, Users, Smartphone, Clock } from 'lucide-react';
import { ViolationEvent } from '@/utils/attentionScorer';

interface ViolationLogProps {
  violations: ViolationEvent[];
}

const ViolationLog = ({ violations }: ViolationLogProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'gaze_away':
      case 'prolonged_distraction':
        return <Eye className="h-4 w-4" />;
      case 'multiple_faces':
      case 'no_face':
        return <Users className="h-4 w-4" />;
      case 'prohibited_object':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return '';
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Violation Log</h3>
        <Badge variant="outline">{violations.length} Events</Badge>
      </div>
      
      <ScrollArea className="h-[300px]">
        {violations.length > 0 ? (
          <div className="space-y-2">
            {violations.map((violation) => (
              <div
                key={violation.id}
                className={`p-3 rounded-lg border ${getSeverityColor(violation.severity)} transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">{getIcon(violation.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{violation.description}</span>
                      <Badge variant="outline" className="text-xs">
                        {violation.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {violation.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No violations detected yet</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default ViolationLog;
