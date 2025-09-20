import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Scissors, Trophy, AlertTriangle } from "lucide-react";
import { getRecommendations } from "@/data/aiEngagement";

export const RecommendationsPanel = ({ id }: { id?: string }) => {
  const recommendations = getRecommendations();

  const sections = [
    {
      title: "Push Adoption",
      items: recommendations.pushAdoption,
      icon: TrendingUp,
      color: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      iconColor: "text-blue-600"
    },
    {
      title: "Cut Waste", 
      items: recommendations.cutWaste,
      icon: Scissors,
      color: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
      iconColor: "text-orange-600"
    },
    {
      title: "Celebrate Wins",
      items: recommendations.celebrateWins,
      icon: Trophy,
      color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", 
      iconColor: "text-emerald-600"
    },
    {
      title: "Risk Watch",
      items: recommendations.riskWatch,
      icon: AlertTriangle,
      color: "bg-red-500/20 text-red-700 dark:text-red-300",
      iconColor: "text-red-600"
    }
  ];

  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Recommendations Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div className="flex items-center space-x-2">
                <section.icon className={`h-4 w-4 ${section.iconColor}`} />
                <Badge className={section.color}>
                  {section.title}
                </Badge>
              </div>
              <div className="space-y-3">
                {section.items.map((item, index) => (
                  <div 
                    key={index}
                    className="bg-muted/30 rounded-lg p-3 text-sm border-l-4"
                    style={{ borderLeftColor: section.iconColor.includes('blue') ? 'hsl(var(--chart-1))' : 
                            section.iconColor.includes('orange') ? 'hsl(var(--chart-2))' :
                            section.iconColor.includes('emerald') ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))' }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};