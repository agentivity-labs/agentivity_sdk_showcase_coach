import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import {
  ChatController,
  ChatDiscussion,
  ConnectionStatusBanner,
  TeamRoster,
  WaitNotice,
  buildArtifactsBundle,
  displayWidget,
  retryWithBackoff,
  teamAvatarResolver,
  teamMembersFromStructure,
  useAgentivityClient,
  useExecutionStatuses,
  useRunStream,
  type ChatHilGate,
  type ChatMessage,
  type TeamStructure,
} from '@agentivity-labs/sdk-react';
import { COACH_TEAM_ID } from '../config';
import { rateLastSession, teamContext, useApp } from '../plan';
import { Back } from './Screens';
import { ChangeCard } from '../widgets/ChangeCard';
import { ExerciseChoice } from '../widgets/ExerciseChoice';
import { FoodWeek } from '../widgets/FoodWeek';
import { LoadChart } from '../widgets/LoadChart';
import { PlanWeek } from '../widgets/PlanWeek';
import { ProfileCard } from '../widgets/ProfileCard';

/**
 * The app adds what it knows after @context, for the team: the person does not see it. The list is kept until the thread changes,
 * because the chat compares it by reference.
 */
class PersonChat extends ChatController {
  private source: ChatMessage[] = [];
  private shown: ChatMessage[] = [];
  override messagesFor(threadId: string) {
    const list = super.messagesFor(threadId);
    if (list !== this.source) {
      this.source = list;
      this.shown = list.map((m) => (m.text.includes('@context') ? { ...m, text: m.text.split('@context')[0].trim() } : m));
    }
    return this.shown;
  }
}

const widgetRegistry = buildArtifactsBundle({
  ExerciseChoice: (props) => <ExerciseChoice {...props} />,
  ChangeCard: (props) => <ChangeCard {...props} />,
  PlanWeek: displayWidget((props) => <PlanWeek {...props} />),
  FoodWeek: displayWidget((props) => <FoodWeek {...props} />),
  ProfileCard: displayWidget((props) => <ProfileCard {...props} />),
  LineChart: displayWidget((props) => <LoadChart {...props} />),
});

const END_TEXTS = { finished: 'Done. What next?', goOn: 'Keep going', close: 'Close', startAnother: 'New conversation', startNew: 'New conversation' };

export interface ChatContext {
  /** Shown as a chip: what this conversation is about. */
  about?: string;
  /** Sent to the team right away. */
  send?: string;
  /** Offered as one tap. */
  suggestions?: string[];
  /** After a session: this is sent to the team with the person's rating. */
  rate?: string;
}

interface ChatProps {
  context: ChatContext;
  onBack: () => void;
  canGoBack: boolean;
}

/**
 * The conversation stays alive while the other screens are open: every screen opens it with its own context. A new conversation
 * starts from zero, so everything of the last one is dropped here: its execution, its stream and what the chat shows.
 */
export function CoachChat(props: ChatProps) {
  const [conversation, setConversation] = useState(0);
  const sent = useRef<ChatContext>(undefined);
  // What the person had written goes with them into the new conversation.
  const [draft, setDraft] = useState<string>();
  return (
    <Conversation
      key={conversation}
      {...props}
      sent={sent}
      draft={draft}
      onNew={(text) => {
        setDraft(text || undefined);
        setConversation((n) => n + 1);
      }}
    />
  );
}

function Conversation({ context, onBack, canGoBack, sent, draft, onNew }: ChatProps & { sent: RefObject<ChatContext | undefined>; draft?: string; onNew: (draft: string) => void }) {
  const client = useAgentivityClient();
  const online = useSyncExternalStore(client.connection.subscribe, client.connection.getSnapshot).status === 'online';
  const { plan } = useApp();
  const [executionId, setExecutionId] = useState<string>();
  const [streamUrl, setStreamUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [team, setTeam] = useState<TeamStructure>();

  useEffect(() => {
    let alive = true;
    if (COACH_TEAM_ID)
      client.entities
        .fetchTeam(COACH_TEAM_ID)
        .then((t) => alive && setTeam(t))
        .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [client]);

  // The mic shows only when the workspace can turn speech into text. No language is given: the person may speak English or French.
  const [voice, setVoice] = useState(false);
  useEffect(() => {
    let alive = true;
    client.voice
      .checkStatus()
      .then((ok) => alive && setVoice(ok))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [client]);
  const transcribe = (audio: Blob, mimeType: string) => client.voice.transcribe(audio, mimeType);

  const members = useMemo(() => (team ? teamMembersFromStructure(team) : []), [team]);
  const resolveAvatar = useMemo(() => teamAvatarResolver(members), [members]);
  const controller = useMemo(() => new PersonChat({ contextId: COACH_TEAM_ID }), []);
  const { events, connectionState } = useRunStream(streamUrl);
  const { members: statuses, running } = useExecutionStatuses(executionId, { controller });

  useEffect(() => {
    events.forEach(controller.feedEvent);
  }, [events, controller]);

  /** The conversation goes on in the same execution. It rejects when refused: the chat then offers what comes next, or keeps the text. */
  const send = async (text: string) => {
    setError(undefined);
    // What the person did on the screens since the last message reaches the team this way.
    const known = teamContext();
    // The saved data may be in another language than the person's words: the team answers in the language of the words above it.
    const input = known ? `${text}\n\n@context (saved app data, not the person's words; answer in the language of the message above) ${known}` : text;
    const session = await client.runs.startExecution({ entityId: COACH_TEAM_ID, input, enableHil: true, executionId });
    setExecutionId(session.executionId);
    setStreamUrl(session.streamUrl);
  };

  async function answer(gate: ChatHilGate, text: string, source: string) {
    if (!executionId) return;
    setError(undefined);
    try {
      await retryWithBackoff(() => client.runs.submitHilResponse({ executionId, requestId: gate.requestId, response: text, source }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  /** When the team is waiting for an answer, the message is that answer: a new execution would not reach it. */
  const say = (text: string) => {
    const gate = controller.pendingHilGate;
    if (gate) {
      void answer(gate, text, 'text');
      controller.clearHilGate();
    } else
      // An ended conversation says so itself; a tap that the team still at work could not take must not vanish without a word.
      send(text).catch((err: unknown) => {
        if (controller.noteSendRefused(err) !== 'ended') setError(err instanceof Error ? err.message : String(err));
      });
  };

  // A plan arrived and the team has stopped: the person decides what comes next, whatever the model wrote last.
  const [settledPlan, setSettledPlan] = useState(plan);
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    if (running) return;
    const t = setTimeout(() => setIdle(true), 2500);
    return () => clearTimeout(t);
  }, [running, plan]);
  const planReady = !!plan && plan !== settledPlan && idle;

  const [used, setUsed] = useState<ChatContext>();
  const [rated, setRated] = useState<ChatContext>();
  useEffect(() => {
    if (!context.send || sent.current === context) return;
    sent.current = context;
    say(context.send);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  return (
    <div className="s">
      <div className="top" style={{ paddingBottom: 6 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {canGoBack && <button type="button" className="bk" onClick={onBack} aria-label="Back"><Back /></button>}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>Your team</div>
            <TeamRoster controller={controller} members={members} statuses={statuses} />
          </div>
        </div>
        {context.about && <span className="ctx">{context.about}</span>}
      </div>
      <WaitNotice waiting={client.waiting} texts={{ title: 'One moment…', detail: 'Your coaches are getting ready.', later: 'Almost there…', long: 'This is taking a little longer than usual.' }} />
      {/* A new plan has its own question below: the choice of what comes next waits for the answer. */}
      <div className={`chat ${planReady ? 'plan-ready' : ''}`}>
        <ChatDiscussion
          controller={controller}
          onSend={(text) => send(text)}
          onNewConversation={onNew}
          initialInputText={draft}
          conversationEndTexts={END_TEXTS}
          onHilResponse={(gate, text, source) => answer(gate, text, source)}
          widgetRegistry={widgetRegistry}
          running={running}
          onStop={executionId ? () => void client.runs.cancelExecution(executionId) : undefined}
          showActiveMemberIndicator
          teamProgressTexts={{ working: 'Your coaches are on it', agentPending: 'Up next', managerWorking: 'Coordinating your coaches' }}
          showSpeakerLabels
          resolveMemberAvatar={resolveAvatar}
          inputHint="Say anything…"
          hilInputHint="Say anything…"
          enableVoice={voice}
          onTranscribeAudio={voice ? transcribe : undefined}
          enableAttachments={false}
          emptyBuilder={() => <p className="co">{plan ? 'Your team knows you and your plan. What should change?' : 'Hi, I am your head coach. Tell me about you and what you want to change. A sentence is enough, I will ask the rest.'}</p>}
        />
      </div>
      {!!context.suggestions?.length && !running && !planReady && used !== context && (
        <div className="sug">
          {context.suggestions.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setUsed(context);
                say(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {context.rate && rated !== context && (
        <div className="done">
          <b>How was it?</b>
          <div className="wb">
            {['Easy', 'Good', 'Hard', 'Too hard'].map((r) => (
              <button
                key={r}
                type="button"
                className="g"
                onClick={() => {
                  setRated(context);
                  rateLastSession(r);
                  say(`${context.rate} It felt: ${r}.`);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
      {planReady && (
        <div className="done">
          <b>Happy with this plan?</b>
          <div className="wb">
            <button
              type="button"
              onClick={() => {
                setSettledPlan(plan);
                onBack();
              }}
            >
              OK with this plan
            </button>
            <button
              type="button"
              className="g"
              onClick={() => {
                setSettledPlan(plan);
                document.querySelector<HTMLTextAreaElement>('.ag-chat-input__field')?.focus();
              }}
            >
              Change something
            </button>
          </div>
        </div>
      )}
      {streamUrl && <ConnectionStatusBanner state={connectionState} />}
      {error && online && <p className="mu" style={{ color: '#c8452b', padding: '0 16px 10px' }}>{error}</p>}
    </div>
  );
}
