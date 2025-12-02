import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User,
  FileText,
  Edit,
  Check,
  X,
  Star,
  Trophy,
  Target,
  Crown,
  Rocket,
  Flame,
  Calendar,
  MapPin,
  Award,
  Car
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BADGES = [
  { 
    id: 'first_course', 
    name: 'Première course', 
    icon: Rocket, 
    condition: (stats: any) => stats.totalCourses >= 1,
    description: '1 course',
    color: 'bg-blue-500'
  },
  { 
    id: 'confirmed', 
    name: 'Confirmé', 
    icon: Target, 
    condition: (stats: any) => stats.totalCourses >= 100,
    description: '100 courses',
    color: 'bg-green-500'
  },
  { 
    id: 'expert', 
    name: 'Expert', 
    icon: Trophy, 
    condition: (stats: any) => stats.totalCourses >= 500,
    description: '500 courses',
    color: 'bg-purple-500'
  },
  { 
    id: 'legend', 
    name: 'Légende', 
    icon: Crown, 
    condition: (stats: any) => stats.totalCourses >= 1000,
    description: '1000 courses',
    color: 'bg-yellow-500'
  },
  { 
    id: 'five_stars', 
    name: '5 Étoiles', 
    icon: Star, 
    condition: (stats: any) => stats.avgRating >= 4.8,
    description: 'Note ≥ 4.8',
    color: 'bg-yellow-400'
  },
  { 
    id: 'on_fire', 
    name: 'En feu', 
    icon: Flame, 
    condition: (stats: any) => stats.weekCourses >= 10,
    description: '10 courses/semaine',
    color: 'bg-orange-500'
  },
];

const DriverProfile = () => {
  const { driver, logout, profilePhotoSignedUrl, refreshDriver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState(driver?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [vehiclePhotoSignedUrls, setVehiclePhotoSignedUrls] = useState<{[key: string]: string}>({});

  useEffect(() => {
    setBioText(driver?.bio || '');
  }, [driver?.bio]);

  useEffect(() => {
    const generateVehiclePhotoUrls = async () => {
      if (!driver?.vehicle_photos_urls || driver.vehicle_photos_urls.length === 0) {
        setVehiclePhotoSignedUrls({});
        return;
      }

      try {
        const urls: {[key: string]: string} = {};
        for (const path of driver.vehicle_photos_urls) {
          const { data } = await supabase.storage
            .from('driver-documents')
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            urls[path] = data.signedUrl;
          }
        }
        setVehiclePhotoSignedUrls(urls);
      } catch (error) {
        console.error('Error generating vehicle photo signed URLs:', error);
      }
    };

    generateVehiclePhotoUrls();
  }, [driver?.vehicle_photos_urls]);

  // Fetch driver statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['driver-stats', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return null;

      const { data: courses } = await supabase
        .from('courses')
        .select('id, status, completed_at, created_at')
        .eq('driver_id', driver.id);

      const totalCourses = courses?.filter(c => c.status === 'completed').length || 0;
      
      // Courses this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekCourses = courses?.filter(c => 
        c.status === 'completed' && 
        c.completed_at && 
        new Date(c.completed_at) >= oneWeekAgo
      ).length || 0;

      return {
        totalCourses,
        weekCourses,
        avgRating: driver.rating || 0,
        memberSince: driver.created_at
      };
    },
    enabled: !!driver?.id
  });

  // Fetch driver reviews from accounting entries
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['driver-reviews', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return [];

      const { data } = await supabase
        .from('accounting_entries')
        .select(`
          id,
          rating,
          comment,
          created_at,
          course_id
        `)
        .eq('driver_id', driver.id)
        .not('rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch course details for company names
      if (data && data.length > 0) {
        const courseIds = data.map((r: any) => r.course_id).filter(Boolean);
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, company_name')
          .in('id', courseIds);

        const coursesMap = new Map(coursesData?.map((c: any) => [c.id, c]) || []);
        
        return data.map((review: any) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          course_id: review.course_id,
          company_name: coursesMap.get(review.course_id)?.company_name || 'Dispatcher'
        }));
      }
      
      return [];
    },
    enabled: !!driver?.id
  });

  const handleSaveBio = async () => {
    if (!driver?.id) return;
    
    if (bioText.length > 500) {
      toast.error('La bio ne peut pas dépasser 500 caractères');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ bio: bioText })
        .eq('id', driver.id);

      if (error) throw error;

      await refreshDriver();
      setEditingBio(false);
      toast.success('Bio mise à jour');
    } catch (error) {
      console.error('Error saving bio:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  const earnedBadges = BADGES.filter(badge => 
    stats ? badge.condition(stats) : false
  );

  const lockedBadges = BADGES.filter(badge => 
    stats ? !badge.condition(stats) : true
  );

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Mon Profil" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header Section - Driver Info */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="w-24 h-24">
              {profilePhotoSignedUrl ? (
                <AvatarImage 
                  src={profilePhotoSignedUrl} 
                  alt={driver?.name || "Photo de profil"}
                />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{driver?.name}</h2>
              {renderStars(driver?.rating || 0)}
              <Badge variant={driver?.status === 'active' ? 'default' : 'secondary'}>
                {driver?.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Badges Section */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Mes Badges</h3>
          </div>
          
          {statsLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <>
              {earnedBadges.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {earnedBadges.map(badge => (
                    <div key={badge.id} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border">
                      <div className={`w-12 h-12 rounded-full ${badge.color} flex items-center justify-center`}>
                        <badge.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">{badge.name}</p>
                        <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {lockedBadges.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    {lockedBadges.length} badge{lockedBadges.length > 1 ? 's' : ''} à débloquer
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {lockedBadges.map(badge => (
                      <div key={badge.id} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-border opacity-50">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <badge.icon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground">{badge.name}</p>
                          <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Bio Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              À propos de moi
            </h3>
            {!editingBio && (
              <Button variant="ghost" size="sm" onClick={() => setEditingBio(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {editingBio ? (
            <div className="space-y-3">
              <Textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="Décrivez-vous en quelques mots..."
                className="min-h-[100px]"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {bioText.length}/500 caractères
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setBioText(driver?.bio || '');
                      setEditingBio(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveBio}
                    disabled={isSaving}
                  >
                    {isSaving ? '...' : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {driver?.bio ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{driver.bio}</p>
              ) : (
                <p className="text-muted-foreground italic">
                  Ajoutez une description pour vous présenter aux dispatchers
                </p>
              )}
            </>
          )}
        </Card>

        {/* Vehicle Section */}
        {(driver?.vehicle_brand || driver?.vehicle_photos_urls?.length) && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Mon Véhicule</h3>
            </div>
            
            {driver?.vehicle_photos_urls && driver.vehicle_photos_urls.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {driver.vehicle_photos_urls.map((photoPath, index) => (
                    vehiclePhotoSignedUrls[photoPath] ? (
                      <img 
                        key={index}
                        src={vehiclePhotoSignedUrls[photoPath]}
                        className="w-32 h-24 object-cover rounded-lg flex-shrink-0 border border-border"
                        alt={`Véhicule photo ${index + 1}`}
                      />
                    ) : (
                      <div key={index} className="w-32 h-24 rounded-lg flex-shrink-0 border border-border bg-muted flex items-center justify-center">
                        <Car className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              {driver?.vehicle_brand && (
                <div>
                  <p className="text-muted-foreground">Marque</p>
                  <p className="font-medium">{driver.vehicle_brand}</p>
                </div>
              )}
              {driver?.vehicle_model && (
                <div>
                  <p className="text-muted-foreground">Modèle</p>
                  <p className="font-medium">{driver.vehicle_model}</p>
                </div>
              )}
              {driver?.vehicle_year && (
                <div>
                  <p className="text-muted-foreground">Année</p>
                  <p className="font-medium">{driver.vehicle_year}</p>
                </div>
              )}
              {driver?.vehicle_plate && (
                <div>
                  <p className="text-muted-foreground">Plaque</p>
                  <p className="font-medium">{driver.vehicle_plate}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Statistics Section */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Statistiques</h3>
          </div>
          
          {statsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{stats?.totalCourses || 0}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats?.avgRating?.toFixed(1) || 0}</p>
                <p className="text-xs text-muted-foreground">Note</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    {stats?.memberSince ? format(new Date(stats.memberSince), 'yyyy', { locale: fr }) : '-'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Membre</p>
              </div>
            </div>
          )}
        </Card>

        {/* Reviews Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Avis reçus ({reviews?.length || 0})
            </h3>
          </div>
          
          {reviewsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {reviews.map((review) => (
                <Card key={review.id} className="p-3 bg-accent/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{review.company_name}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(star => (
                        <Star 
                          key={star} 
                          className={`w-3 h-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(review.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Aucun avis pour le moment
            </p>
          )}
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default DriverProfile;
