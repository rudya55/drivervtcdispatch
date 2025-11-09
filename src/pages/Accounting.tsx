import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, Course } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Euro, FileText, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, eachHourOfInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useNotifications } from '@/hooks/useNotifications';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Period = 'day' | 'week' | 'month' | 'year';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Accounting = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [courses, setCourses] = useState<Course[]>([]);
  const [todayCourses, setTodayCourses] = useState<Course[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (driver) {
      fetchCourses();
      fetchTodayCourses();
    } else {
      setLoading(false);
    }
  }, [driver, period]);

  const fetchTodayCourses = async () => {
    if (!driver) return;

    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', driver.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString())
        .lte('completed_at', endOfToday.toISOString());

      if (error) throw error;
      setTodayCourses(data || []);
    } catch (error: any) {
      console.error('Fetch today courses error:', error);
    }
  };

  const fetchCourses = async () => {
    if (!driver) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (period) {
        case 'day':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now, { locale: fr });
          endDate = endOfWeek(now, { locale: fr });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', driver.id)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Fetch courses error:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getRevenueData = () => {
    const now = new Date();
    let intervals: Date[] = [];

    switch (period) {
      case 'day':
        intervals = eachHourOfInterval({
          start: startOfDay(now),
          end: endOfDay(now)
        });
        break;
      case 'week':
        intervals = eachDayOfInterval({
          start: startOfWeek(now, { locale: fr }),
          end: endOfWeek(now, { locale: fr })
        });
        break;
      case 'month':
        intervals = eachWeekOfInterval({
          start: startOfMonth(now),
          end: endOfMonth(now)
        });
        break;
      case 'year':
        intervals = eachMonthOfInterval({
          start: startOfYear(now),
          end: endOfYear(now)
        });
        break;
    }

    return intervals.map(date => {
      const periodCourses = courses.filter(c => {
        const courseDate = new Date(c.completed_at!);
        if (period === 'day') {
          return courseDate >= date && courseDate < new Date(date.getTime() + 60 * 60 * 1000);
        } else if (period === 'week') {
          return format(courseDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        } else if (period === 'month') {
          return courseDate >= date && courseDate < new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          return format(courseDate, 'MM') === format(date, 'MM');
        }
      });

      const revenue = periodCourses.reduce((sum, c) => sum + (c.net_driver || c.client_price), 0);
      const commission = periodCourses.reduce((sum, c) => sum + (c.commission || 0), 0);

      return {
        date: period === 'day' ? `${format(date, 'HH')}h` :
              period === 'week' ? format(date, 'EEE', { locale: fr }) :
              period === 'month' ? `S${format(date, 'w')}` :
              format(date, 'MMM', { locale: fr }),
        revenue,
        commission,
        count: periodCourses.length
      };
    });
  };

  const getCompanyData = () => {
    const companies: { [key: string]: { revenue: number; count: number } } = {};

    courses.forEach(course => {
      const company = course.company_name || 'Particulier';
      if (!companies[company]) {
        companies[company] = { revenue: 0, count: 0 };
      }
      companies[company].revenue += course.net_driver || course.client_price;
      companies[company].count += 1;
    });

    return Object.entries(companies).map(([name, data]) => ({
      name,
      value: data.revenue,
      count: data.count
    }));
  };

  const getTotalRevenue = () => courses.reduce((sum, c) => sum + (c.net_driver || c.client_price), 0);
  const getTotalCommission = () => courses.reduce((sum, c) => sum + (c.commission || 0), 0);
  const getNetRevenue = () => getTotalRevenue() - getTotalCommission();

  // Calculate today's revenue from dedicated state
  const todayStats = {
    revenue: todayCourses.reduce((sum, c) => sum + (c.net_driver || c.client_price), 0),
    commission: todayCourses.reduce((sum, c) => sum + (c.commission || 0), 0),
    count: todayCourses.length
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const usedCourses = courses;
      if (!usedCourses.length) {
        toast.info('Aucune course sur la période sélectionnée');
        setDownloading(false);
        return;
      }

      // Compute period boundaries and label
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let periodLabel = '';

      switch (period) {
        case 'day':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          periodLabel = format(now, "EEEE dd MMMM yyyy", { locale: fr });
          break;
        case 'week':
          startDate = startOfWeek(now, { locale: fr });
          endDate = endOfWeek(now, { locale: fr });
          periodLabel = `Semaine du ${format(startDate, 'dd/MM', { locale: fr })} au ${format(endDate, 'dd/MM', { locale: fr })}`;
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          periodLabel = format(now, 'MMMM yyyy', { locale: fr });
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          periodLabel = format(now, 'yyyy', { locale: fr });
          break;
      }

      const totalRevenue = usedCourses.reduce((sum, c) => sum + (c.net_driver || c.client_price), 0);
      const totalCommission = usedCourses.reduce((sum, c) => sum + (c.commission || 0), 0);
      const totalNet = totalRevenue - totalCommission;

      const dispatcherSet = Array.from(new Set(usedCourses.map(c => c.company_name || 'Particulier').filter(Boolean)));

      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text('Facture / Relevé de courses', 14, 20);
      doc.setFontSize(11);
      doc.text(`Période: ${periodLabel}`, 14, 28);

      // Driver & companies
      const yStart = 36;
      const driverName = driver?.name || '';
      const driverCompany = driver?.company_name || '';
      const driverAddress = driver?.company_address || '';
      const driverSiret = driver?.siret || '';
      doc.text(`Chauffeur: ${driverName}`, 14, yStart);
      if (driverCompany) doc.text(`Société: ${driverCompany}`, 14, yStart + 6);
      if (driverAddress) doc.text(`Adresse: ${driverAddress}`, 14, yStart + 12);
      if (driverSiret) doc.text(`SIRET: ${driverSiret}`, 14, yStart + 18);

      doc.text(`Dispatcher(s): ${dispatcherSet.join(', ') || '—'}`, 120, yStart);

      // Table
      const rows = usedCourses.map(c => [
        c.completed_at ? format(new Date(c.completed_at), 'dd/MM/yyyy HH:mm') : '',
        c.departure_location,
        c.destination_location,
        c.client_name,
        c.company_name || 'Particulier',
        `${(c.client_price ?? 0).toFixed(2)}€`,
        `${(c.commission ?? 0).toFixed(2)}€`,
        `${(c.net_driver ?? c.client_price).toFixed(2)}€`
      ]);

      autoTable(doc, {
        head: [[
          'Date', 'Départ', 'Destination', 'Client', 'Société', 'Prix client', 'Commission', 'Net'
        ]],
        body: rows,
        startY: 60,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [25, 91, 255] },
      });

      // Totals
      const endY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.text(`Total CA: ${totalRevenue.toFixed(2)}€`, 14, endY);
      doc.text(`Total commission: ${totalCommission.toFixed(2)}€`, 80, endY);
      doc.text(`Net chauffeur: ${totalNet.toFixed(2)}€`, 155, endY);

      const fname = `facture_${period}_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.pdf`;
      doc.save(fname);
      toast.success('Facture téléchargée');
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const revenueData = getRevenueData();
  const companyData = getCompanyData();

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Comptabilité" unreadCount={unreadCount} />
      
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger PDF
          </Button>
        </div>

        {/* Period Highlight - only for day */}
        {period === 'day' && (
          <Card className="p-6 border-2 border-primary bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Aujourd'hui</h3>
              <span className="text-sm text-muted-foreground ml-auto">
                {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-primary">{todayStats.revenue.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Commission</p>
                <p className="text-2xl font-bold text-warning">-{todayStats.commission.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Net</p>
                <p className="text-2xl font-bold text-success">{(todayStats.revenue - todayStats.commission).toFixed(2)}€</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                {todayStats.count} course{todayStats.count > 1 ? 's' : ''} terminée{todayStats.count > 1 ? 's' : ''} aujourd'hui
              </p>
            </div>
          </Card>
        )}

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Chiffre d'affaires</h3>
            </div>
            <p className="text-3xl font-bold">{getTotalRevenue().toFixed(2)}€</p>
            <p className="text-sm text-muted-foreground mt-1">{courses.length} courses</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              <h3 className="font-semibold">Commission</h3>
            </div>
            <p className="text-3xl font-bold text-warning">{getTotalCommission().toFixed(2)}€</p>
            <p className="text-sm text-muted-foreground mt-1">
              {((getTotalCommission() / getTotalRevenue()) * 100).toFixed(1)}% du CA
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-success" />
              <h3 className="font-semibold">Net chauffeur</h3>
            </div>
            <p className="text-3xl font-bold text-success">{getNetRevenue().toFixed(2)}€</p>
            <p className="text-sm text-muted-foreground mt-1">Après commission</p>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue">Évolution du CA</TabsTrigger>
            <TabsTrigger value="companies">Par société</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Revenus par période</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenu (€)" fill={COLORS[0]} />
                  <Bar dataKey="commission" name="Commission (€)" fill={COLORS[2]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 mt-4">
              <h3 className="font-semibold mb-4">Nombre de courses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Courses" stroke={COLORS[1]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="mt-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Répartition par société</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={companyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}€`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {companyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-6 space-y-2">
                {companyData.map((company, index) => (
                  <div key={company.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{company.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{company.value.toFixed(2)}€</p>
                      <p className="text-sm text-muted-foreground">{company.count} courses</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Accounting;
