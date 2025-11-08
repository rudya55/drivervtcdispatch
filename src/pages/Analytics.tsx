import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, Course } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, MapPin, TrendingUp, Award, Target, Zap, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useNotifications } from '@/hooks/useNotifications';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Analytics = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (driver) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [driver]);

  const fetchAnalytics = async () => {
    if (!driver) return;

    setLoading(true);
    try {
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', driver.id)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Fetch analytics error:', error);
      toast.error('Erreur lors du chargement des analyses');
    } finally {
      setLoading(false);
    }
  };

  const getTotalTime = () => {
    return courses.reduce((total, course) => {
      if (course.started_at && course.completed_at) {
        return total + differenceInMinutes(new Date(course.completed_at), new Date(course.started_at));
      }
      return total;
    }, 0);
  };

  const getAverageTime = () => {
    const validCourses = courses.filter(c => c.started_at && c.completed_at);
    if (validCourses.length === 0) return 0;
    return getTotalTime() / validCourses.length;
  };

  const getCompanyPerformance = () => {
    const companies: { [key: string]: { count: number; revenue: number; avgTime: number; totalTime: number } } = {};

    courses.forEach(course => {
      const company = course.company_name || 'Particulier';
      if (!companies[company]) {
        companies[company] = { count: 0, revenue: 0, avgTime: 0, totalTime: 0 };
      }
      companies[company].count += 1;
      companies[company].revenue += course.net_driver || course.client_price;
      
      if (course.started_at && course.completed_at) {
        const time = differenceInMinutes(new Date(course.completed_at), new Date(course.started_at));
        companies[company].totalTime += time;
      }
    });

    return Object.entries(companies).map(([name, data]) => ({
      name,
      courses: data.count,
      revenue: data.revenue,
      avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      score: Math.round((data.count * 20 + data.revenue / 10) / 2)
    }));
  };

  const getPerformanceRadar = () => {
    const companyPerf = getCompanyPerformance();
    const avgRevenue = companyPerf.reduce((sum, c) => sum + c.revenue, 0) / companyPerf.length || 1;
    const avgCourses = companyPerf.reduce((sum, c) => sum + c.courses, 0) / companyPerf.length || 1;

    return companyPerf.slice(0, 5).map(company => ({
      company: company.name,
      Courses: (company.courses / avgCourses) * 100,
      Revenue: (company.revenue / avgRevenue) * 100,
      Efficacité: company.avgTime > 0 ? Math.max(0, 100 - (company.avgTime / 60) * 10) : 50,
    }));
  };

  const getRecommendations = () => {
    const companyPerf = getCompanyPerformance();
    const recommendations: string[] = [];

    // Société la plus rentable
    const mostProfitable = companyPerf.sort((a, b) => b.revenue - a.revenue)[0];
    if (mostProfitable) {
      recommendations.push(`💰 **${mostProfitable.name}** est votre société la plus rentable avec ${mostProfitable.revenue.toFixed(0)}€. Concentrez-vous sur cette relation.`);
    }

    // Société avec le plus de courses
    const mostActive = companyPerf.sort((a, b) => b.courses - a.courses)[0];
    if (mostActive && mostActive.name !== mostProfitable?.name) {
      recommendations.push(`📈 **${mostActive.name}** vous confie le plus de courses (${mostActive.courses}). Excellente régularité !`);
    }

    // Temps moyen
    const avgTime = getAverageTime();
    if (avgTime > 45) {
      recommendations.push(`⚠️ Votre temps moyen par course est de ${Math.round(avgTime)} min. Optimisez vos trajets pour augmenter votre productivité.`);
    } else if (avgTime > 0) {
      recommendations.push(`✅ Excellent temps moyen de ${Math.round(avgTime)} min par course. Continuez ainsi !`);
    }

    // Diversification
    if (companyPerf.length < 3) {
      recommendations.push(`🎯 Vous travaillez avec ${companyPerf.length} société(s). Diversifiez vos sources pour plus de stabilité.`);
    } else {
      recommendations.push(`✨ Bonne diversification avec ${companyPerf.length} sociétés partenaires.`);
    }

    return recommendations;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const companyPerformance = getCompanyPerformance();
  const radarData = getPerformanceRadar();
  const recommendations = getRecommendations();
  const totalMinutes = getTotalTime();
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Analyses" unreadCount={unreadCount} />
      
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Courses</h3>
            </div>
            <p className="text-3xl font-bold">{courses.length}</p>
            <p className="text-sm text-muted-foreground">Ce mois</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Temps total</h3>
            </div>
            <p className="text-3xl font-bold">{hours}h{minutes}m</p>
            <p className="text-sm text-muted-foreground">En activité</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-warning" />
              <h3 className="font-semibold">Temps moyen</h3>
            </div>
            <p className="text-3xl font-bold">{Math.round(getAverageTime())} min</p>
            <p className="text-sm text-muted-foreground">Par course</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-success" />
              <h3 className="font-semibold">Sociétés</h3>
            </div>
            <p className="text-3xl font-bold">{companyPerformance.length}</p>
            <p className="text-sm text-muted-foreground">Partenaires</p>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="companies">Sociétés</TabsTrigger>
            <TabsTrigger value="recommendations">Conseils</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="mt-4 space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Vue d'ensemble</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="company" />
                  <PolarRadiusAxis angle={90} domain={[0, 150]} />
                  <Radar name="Courses" dataKey="Courses" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
                  <Radar name="Revenue" dataKey="Revenue" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} />
                  <Radar name="Efficacité" dataKey="Efficacité" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.6} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="mt-4 space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Performance par société</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={companyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="courses" name="Courses" fill={COLORS[0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenu (€)" fill={COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyPerformance.map((company, index) => (
                <Card key={company.name} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{company.name}</h4>
                      <Badge className="mt-1">Score: {company.score}</Badge>
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Courses:</span>
                      <span className="font-medium">{company.courses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenu:</span>
                      <span className="font-medium">{company.revenue.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temps moyen:</span>
                      <span className="font-medium">{company.avgTime} min</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-semibold">Conseils personnalisés</h3>
              </div>
              
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <Card key={index} className="p-4 bg-muted/50">
                    <p className="leading-relaxed">{rec}</p>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Résumé du mois
                </h4>
                <p className="text-sm text-muted-foreground">
                  Vous avez effectué <strong>{courses.length} courses</strong> pour un temps total de <strong>{hours}h{minutes}m</strong>.
                  Vous travaillez avec <strong>{companyPerformance.length} sociétés</strong> différentes.
                  Continuez sur cette lancée pour maximiser vos revenus !
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Analytics;
