import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
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
import { clearLegacyProfile, getProfileId, readLegacyProfile } from './data/profile';

const queryClient = new QueryClient();

function Router() {
  const [profileId] = useState(() => getProfileId());
  const queryClient = useQueryClient();
  const profileQuery = useGetCareerProfile(profileId, {
    query: {
      queryKey: getGetCareerProfileQueryKey(profileId),
      enabled: Boolean(profileId),
      retry: false,
    },
  });
  const saveMutation = useSaveCareerProfile();
  const migrationAttempted = useRef(false);
  const legacyProfile = useRef(readLegacyProfile());
  const [isMigrating, setIsMigrating] = useState(false);
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
  };
  const profile =
    profileQuery.data ??
    (profileQuery.data === null ? legacyProfile.current : null);
  const profileLoading = profileQuery.isLoading || isMigrating;
  const profileError =
    profileQuery.isError
      ? 'Could not load your saved profile. Check the API server and refresh the page.'
      : undefined;

  return (
    <Shell profile={profile}>
      {profileError && <div className="api-error" role="alert" data-testid="status-profile-load-error">{profileError}</div>}
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={() => <RadarPage profile={profile} />} />
          <Route path="/intake" component={() => <IntakePage profileId={profileId} profile={profile} profileLoading={profileLoading} onSave={updateProfile} isSaving={saveMutation.isPending && !isMigrating} />} />
          <Route path="/pathway" component={() => <PathwayPage profileId={profileId} profile={profile} profileLoading={profileLoading} />} />
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
