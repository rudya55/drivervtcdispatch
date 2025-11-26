import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Course } from '@/lib/supabase';
import { TrendingUp, Target, Clock, CheckCircle, Euro } from 'lucide-react';
import { differenceInHours, startOfDay } from 'date-fns';

interface DailyEarningsWidgetProps {
  driverId: string | null;
  dailyTarget?: number; // Objectif quotidien en euros
}

export const DailyEarningsWidget = ({ driverId, dailyTarget = 200 }: DailyEarningsWidgetProps) => {
  const [earnings, setEarnings] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverId) {
      fetchDailyStats();

      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(fetchDailyStats, 30000);
      return () => clearInterval(interval);
    }
  }, [driverId]);

  const fetchDailyStats = async () => {
    if (!driverId) return;

    try {
      const today = startOfDay(new Date());

      // Récupérer toutes les courses terminées aujourd'hui
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      if (courses && courses.length > 0) {
        // Calculer les gains (net_driver ou client_price * 0.8)
        const totalEarnings = courses.reduce((sum, course) => {
          return sum + (course.net_driver || course.client_price * 0.8);
        }, 0);

        // Calculer les heures travaillées
        const firstCourse = courses[0];
        const lastCourse = courses[courses.length - 1];

        let hours = 0;
        if (firstCourse.started_at && lastCourse.completed_at) {
          hours = differenceInHours(
            new Date(lastCourse.completed_at),
            new Date(firstCourse.started_at)
          );
        }

        setEarnings(totalEarnings);
        setCoursesCount(courses.length);
        setHoursWorked(Math.max(hours, 0));
      } else {
        setEarnings(0);
        setCoursesCount(0);
        setHoursWorked(0);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = Math.min((earnings / dailyTarget) * 100, 100);
  const isTargetReached = earnings >= dailyTarget;
  const remaining = Math.max(dailyTarget - earnings, 0);

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Gains du jour</h3>
          </div>
          {isTargetReached && (
            <Badge className="bg-success text-white animate-pulse">
              🎯 Objectif atteint !
            </Badge>
          )}
        </div>

        {/* Montant principal */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">
            {earnings.toFixed(0)}€
          </span>
          <span className="text-lg text-muted-foreground">
            / {dailyTarget}€
          </span>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1">
          <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                isTargetReached
                  ? 'bg-gradient-to-r from-success to-success/80 animate-pulse'
                  : 'bg-gradient-to-r from-primary to-primary/60'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {!isTargetReached && (
            <p className="text-xs text-muted-foreground text-right">
              Encore {remaining.toFixed(0)}€ pour atteindre l'objectif
            </p>
          )}
        </div>

        {/* Stats secondaires */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Courses</p>
              <p className="font-bold">{coursesCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Heures</p>
              <p className="font-bold">{hoursWorked}h</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Moy/course</p>
              <p className="font-bold">
                {coursesCount > 0 ? (earnings / coursesCount).toFixed(0) : '0'}€
              </p>
            </div>
          </div>
        </div>

        {/* Message motivant */}
        {!isTargetReached && coursesCount > 0 && (
          <p className="text-xs text-center text-muted-foreground italic">
            💪 {coursesCount === 1 ? 'Première course' : `${coursesCount} courses`} terminée{coursesCount > 1 ? 's' : ''} ! Continuez sur cette lancée !
          </p>
        )}
        {isTargetReached && (
          <p className="text-xs text-center text-success font-semibold">
            🎉 Félicitations ! Objectif quotidien dépassé de {(earnings - dailyTarget).toFixed(0)}€ !
          </p>
        )}
      </div>
    </Card>
  );
};
