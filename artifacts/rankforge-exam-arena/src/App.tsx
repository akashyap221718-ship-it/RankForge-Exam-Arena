import { type ReactNode, useEffect, useRef } from 'react';
import { ClerkProvider, RedirectToSignIn, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import LandingPage from '@/pages/landing';
import DashboardPage from '@/pages/dashboard';
import PracticePage from '@/pages/practice';
import SolvePage from '@/pages/solve';
import ContestsPage from '@/pages/contests';
import LeaderboardPage from '@/pages/leaderboard';
import SettingsPage from '@/pages/settings';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#303f9f',
    colorForeground: '#222744',
    colorMutedForeground: '#73778b',
    colorDanger: '#c84c3f',
    colorBackground: '#ffffff',
    colorInput: '#f3f4f8',
    colorInputForeground: '#222744',
    colorNeutral: '#dfe1ea',
    fontFamily: 'Outfit, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#222744] font-extrabold tracking-tight',
    headerSubtitle: 'text-[#73778b]',
    socialButtonsBlockButtonText: 'text-[#222744] font-semibold',
    formFieldLabel: 'text-[#222744] font-semibold',
    footerActionLink: 'text-[#303f9f] font-semibold',
    footerActionText: 'text-[#73778b]',
    dividerText: 'text-[#73778b]',
    identityPreviewEditButton: 'text-[#303f9f]',
    formFieldSuccessText: 'text-emerald-700',
    alertText: 'text-[#c84c3f]',
    logoBox: 'mb-3',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-[#dfe1ea] bg-[#f8f9fb] hover:bg-[#eef0f6]',
    formButtonPrimary: 'bg-[#303f9f] hover:bg-[#263480] text-white',
    formFieldInput: 'bg-[#f3f4f8] border-[#dfe1ea] text-[#222744]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#dfe1ea]',
    alert: 'bg-red-50 border-red-200',
    otpCodeFieldInput: 'border-[#dfe1ea] text-[#222744]',
    formFieldRow: 'mb-4',
    main: 'bg-transparent',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <LandingPage />;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;
  if (!isSignedIn) return <RedirectToSignIn />;
  return <>{children}</>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const nextUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
        client.clear();
      }
      previousUserId.current = nextUserId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/dashboard">
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        </Route>
        <Route path="/practice">
          <ProtectedRoute><PracticePage /></ProtectedRoute>
        </Route>
        <Route path="/practice/:id">
          <ProtectedRoute><SolvePage /></ProtectedRoute>
        </Route>
        <Route path="/contests">
          <ProtectedRoute><ContestsPage /></ProtectedRoute>
        </Route>
        <Route path="/leaderboard">
          <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to continue your training' } },
        signUp: { start: { title: 'Create your arena account', subtitle: 'Build a rank you can prove' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkApp />
    </WouterRouter>
  );
}

export default App;