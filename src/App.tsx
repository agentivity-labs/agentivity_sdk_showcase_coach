import '@agentivity-labs/sdk-react/styles.css';
import './app.css';
import { useMemo, useState } from 'react';
import { AgentivityProvider, ArtifactsThemeProvider, light } from '@agentivity-labs/sdk-react';
import { CoachChat, type ChatContext } from './screens/CoachChat';
import { ExerciseDetail, FoodScreen, Home, PlanScreen, Progression, ProfileScreen, SessionRunner, Today, Welcome, type Nav, type Screen } from './screens/Screens';
import { useApp, type PlanExercise } from './plan';

const baseUrl = import.meta.env.VITE_AGENTIVITY_BASE_URL;
const theme = { ...light, colors: { ...light.colors, primary: '#7A5CFA' }, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' };

export default function App() {
  const app = useApp();
  const [begun, setBegun] = useState(false);
  // The first plan arrives while the coach is still talking: the person leaves the chat when they choose.
  const [landed, setLanded] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [arg, setArg] = useState<string>();
  const [detail, setDetail] = useState<{ exercise: PlanExercise; back: Screen }>();
  const [chat, setChat] = useState<ChatContext>();

  const nav = useMemo<Nav>(
    () => ({
      to: (s, a) => {
        setChat(undefined);
        setScreen(s);
        setArg(a);
      },
      chat: setChat,
      show: (e) => {
        setDetail(e);
        setScreen('exercise');
      },
    }),
    [],
  );

  // Before a plan exists, the app is the conversation: there is nothing to look at yet.
  const noPlan = !app.plan;
  const inChat = chat !== undefined || (begun && !landed);

  const body = () => {
    if (noPlan) return <Welcome onBegin={() => setBegun(true)} />;
    if (screen === 'exercise' && detail) return <ExerciseDetail exercise={detail.exercise} onBack={() => setScreen(detail.back)} nav={nav} />;
    if (screen === 'today' && arg) return <Today day={arg} nav={nav} />;
    if (screen === 'session') return <SessionRunner nav={nav} />;
    if (screen === 'plan') return <PlanScreen key={arg} nav={nav} start={arg} />;
    if (screen === 'food') return <FoodScreen nav={nav} />;
    if (screen === 'prog') return <Progression nav={nav} />;
    if (screen === 'profile') return <ProfileScreen nav={nav} />;
    return <Home nav={nav} />;
  };

  return (
    <AgentivityProvider baseUrl={baseUrl} apiKey={import.meta.env.VITE_AGENTIVITY_API_KEY} waitNotice={false}>
      <ArtifactsThemeProvider theme={theme}>
        <div className="stage">
          <main className="phone">
            <div id="app">
              {!inChat && <div key={`${screen}-${arg ?? ''}`} className="view">{body()}</div>}
              {/* The conversation stays alive while the other screens are open. */}
              <div className="chatlayer" hidden={!inChat}>
                <CoachChat context={chat ?? {}} canGoBack={!noPlan} onBack={() => {
                    setLanded(true);
                    setChat(undefined);
                  }} />
              </div>
            </div>
          </main>
          <p className="note">A demo of what a VibeApp can do, built with Agentivity. It is not a coaching or medical service, and it cannot be used as is to sell one.</p>
        </div>
      </ArtifactsThemeProvider>
    </AgentivityProvider>
  );
}
