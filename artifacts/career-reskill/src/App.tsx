import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  getGetCareerProfileQueryKey,
  useGetCareerProfile,
  useSaveCareerProfile,
} from '@workspace/api-client-react';
import { Shell } from './components/Shell';
import { IntakePage } from './pages/IntakePage';
import { PathwayPage } from './pages/PathwayPage';
import { RadarPage } from './pages/RadarPage';
import type { CareerProfile } from './data/catalog';
import {
  clearLegacyProfile,
  clearStoredProfileId,
  getProfileIdentity,
  isProfileNotFoundError,
  readLegacyProfile,
} from './data/profile';
import { LanguageProvider } from './i18n/LanguageContext';

const queryClient = new QueryClient();

export function CareerReskillRouter() {
  const [profileIdentity, setProfileIdentity] = useState(() => getProfileIdentity());
  const profileId = profileIdentity.profileId;
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const profileQuery = useGetCareerProfile(profileId, {
    query: {
      queryKey: getGetCareerProfileQueryKey(profileId),
      enabled: Boolean(profileId),
      retry: false,
    },
  });
  const saveMutation = useSaveCareerProfile();
  const migrationAttempted = useRef(false);
  const missingProfileHandled = useRef<string | null>(null);
  const legacyProfile = useRef(readLegacyProfile());
  const [isMigrating, setIsMigrating] = useState(false);
  const profileNotFound =
    profileQuery.isError && isProfileNotFoundError(profileQuery.error);

  useEffect(() => {
    if (!profileNotFound || missingProfileHandled.current === profileId) return;

    missingProfileHandled.current = profileId;
    if (!profileIdentity.isNew) {
      clearStoredProfileId();
      setProfileIdentity(getProfileIdentity());
      queryClient.removeQueries({ queryKey: getGetCareerProfileQueryKey(profileId) });
    }
    if (location !== "/intake") {
      setLocation("/intake", { replace: true });
    }
  }, [
    location,
    profileId,
    profileIdentity.isNew,
    profileNotFound,
    queryClient,
    setLocation,
  ]);

  useEffect(() => {
    if (
      !profileQuery.isSuccess ||
      profileQuery.data !== null ||
      !legacyProfile.current ||
      migrationAttempted.current
    ) {
      return;
    }

    migrationAttempted.current = true;
    setIsMigrating(true);
    saveMutation.mutate(
      { profileId, data: legacyProfile.current },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetCareerProfileQueryKey(profileId), saved);
          setProfileIdentity((current) => ({ ...current, isNew: false }));
          clearLegacyProfile();
          setIsMigrating(false);
        },
        onError: () => setIsMigrating(false),
      },
    );
  }, [profileId, profileQuery.data, profileQuery.isSuccess, queryClient, saveMutation.mutate]);

  const updateProfile = async (next: CareerProfile): Promise<void> => {
    const saved = await saveMutation.mutateAsync({ profileId, data: next });
    queryClient.setQueryData(getGetCareerProfileQueryKey(profileId), saved);
    setProfileIdentity((current) => ({ ...current, isNew: false }));
  };
  const profile =
    profileQuery.data ??
    (profileQuery.data === null ? legacyProfile.current : null);
  const profileLoading = profileQuery.isLoading || isMigrating;
  const profileError =
    profileQuery.isError && !profileNotFound
      ? 'Could not load your saved profile. Check the API server and refresh the page.'
      : undefined;

  return (
    <Shell profile={profile}>
      {profileError && <div className="api-error" role="alert" data-testid="status-profile-load-error">{profileError}</div>}
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/"><Redirect to="/intake" replace /></Route>
          <Route path="/radar"><RadarPage profile={profile} /></Route>
          <Route path="/intake"><IntakePage profileId={profileId} profile={profile} profileLoading={profileLoading} onSave={updateProfile} isSaving={saveMutation.isPending && !isMigrating} /></Route>
          <Route path="/pathway"><PathwayPage profileId={profileId} profile={profile} profileLoading={profileLoading} /></Route>
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <LanguageProvider>
            <CareerReskillRouter />
          </LanguageProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
