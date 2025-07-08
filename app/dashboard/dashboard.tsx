'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Square, Zap, Phone, Users, Activity, Plus, X, Check, AlertCircle, Cpu, Brain, Headphones, Mic, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { APPOINTMENT_SCHEDULAR } from '../utils/appointment_schedular';
import { CUSTOMER_SUPPORT_SPECIALIST } from '../utils/customer_support_specialist';
import { CARE_COORDINATOR } from '../utils/care_coordinator';
import { Formik, Form, Field, FieldArray, FormikHelpers, FieldArrayRenderProps } from 'formik';

// Define types for agent and running agent
interface AssistantTTS {
  name: string;
  // ElevenLabs fields
  voice_id?: string;
  model: string;
  language?: string;
  voice_settings?: {
    similarity_boost: number;
    stability: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
  // Sarvam fields
  target_language_code?: string;
  speaker?: string;
  loudness?: number;
  speed?: number;
  enable_preprocessing?: boolean;
}

type Assistant = {
  name: string;
  prompt: string;
  stt: { name: string; language: string; model: string };
  llm: { name: string; model: string; temperature: number };
  tts: AssistantTTS;
  vad: { name: string; min_silence_duration: number };
};

interface Agent {
  name: string;
  type: string;
  config_path?: string;
  assistant: Assistant[];
}

interface RunningAgent {
  agent_name: string;
  pid: number;
}

// Place these at the top of the file/component, before useState for assistants
const PROVIDER_DEFAULTS = {
  elevenlabs: {
    name: 'elevenlabs',
    voice_id: 'H8bdWZHK2OgZwTN7ponr',
    model: 'eleven_flash_v2_5',
    language: 'en-US',
    voice_settings: {
      similarity_boost: 1,
      stability: 0.7,
      style: 0.7,
      use_speaker_boost: false,
      speed: 1.1
    }
  },
  sarvam_tts: {
    name: 'sarvam_tts',
    target_language_code: 'en-IN',
    model: 'bulbul:v2',
    speaker: 'anushka',
    loudness: 1.1,
    speed: 0.8,
    enable_preprocessing: true
  },
  sarvam: {
    name: 'sarvam',
    model: 'saarika:v2.5',
    language: 'en-IN'
  },
  deepgram: {
    name: 'deepgram',
    model: 'alex',
    language: 'en-US'
  }
};

const Dashboard = () => {

  const [agents, setAgents] = useState<Agent[]>([]);
  const [runningAgents, setRunningAgents] = useState<RunningAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  // Add preset agent templates
  const agentTemplates = [
    {
      key: 'customer_support_specialist',
      label: 'Customer Support Specialist',
      agent: CUSTOMER_SUPPORT_SPECIALIST
    },
    {
      key: 'care_coordinator',
      label: 'Care Coordinator',
      agent: CARE_COORDINATOR
    },
    {
      key: 'appointment_schedular',
      label: 'Appointment Schedular',
      agent: APPOINTMENT_SCHEDULAR
    },
    {
      key: 'custom_agent',
      label: 'Custom Agent',
      agent: null // will use current default values
    }
  ];

  // Add state for template selection
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Add state for agent modal values
  const [agentName, setAgentName] = useState('Agent');
  const [agentType, setAgentType] = useState('INBOUND');
  const [assistants, setAssistants] = useState<Assistant[]>([{
    name: 'Neha',
    prompt: 'You are a helpful agent...',
    stt: { name: 'sarvam', language: 'en-IN', model: 'saarika:v2.5' },
    llm: { name: 'openai', model: 'gpt-4.1-mini', temperature: 0.3 },
    tts: { ...PROVIDER_DEFAULTS.elevenlabs },
    vad: { name: 'silero', min_silence_duration: 0.2 }
  }]);

  // Add error handling for API calls
  const fetchWithErrorHandling = async (url: string, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: unknown) {
      console.error('API call failed:', error);
      if (error instanceof Error) {
        showNotification(`API Error: ${error.message}`, 'error');
      } else {
        showNotification('API Error', 'error');
      }
      throw error;
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchRunningAgents();
    // const interval = setInterval(fetchRunningAgents, 5000);
    // return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgents = async () => {
    try {
      setAgents(await fetchWithErrorHandling('/api/agents'));
    } catch {
      setAgents([]);
    }
  };

  const fetchRunningAgents = async () => {
    try {
      setRunningAgents(await fetchWithErrorHandling('/api/running_agents'));
    } catch {
      setRunningAgents([]);
    }
  };

  const runAgent = async (agentName: string) => {
    setLoading(true);
    try {
      await fetch('/api/run_agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName })
      });
      showNotification(`Agent ${agentName} started successfully`, 'success');
      fetchRunningAgents();
      fetchAgents();
    } catch (err) {
      if (err instanceof Error) {
        showNotification(`Failed to start agent: ${err.message}`, 'error');
      } else {
        showNotification('Failed to start agent', 'error');
      }
    }
    setLoading(false);
  };

  const stopAgent = async (agentName: string) => {
    setLoading(true);
    try {
      await fetch('/api/stop_agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName })
      });
      showNotification(`Agent ${agentName} stopped successfully`, 'success');
      fetchRunningAgents();
      fetchAgents();
    } catch (err) {
      if (err instanceof Error) {
        showNotification(`Failed to stop agent: ${err.message}`, 'error');
      } else {
        showNotification('Failed to stop agent', 'error');
      }
    }
    setLoading(false);
  };

  // Memoize the dispatch call function
  const dispatchCall = useCallback(async () => {
    if (!selectedAgent || !phoneNumber) {
      showNotification('Please select an agent and enter a phone number', 'error');
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/dispatch_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: selectedAgent, phone_number: phoneNumber })
      });
      showNotification('Call dispatched successfully', 'success');
      setShowDispatchModal(false);
      setPhoneNumber('');
      setSelectedAgent('');
    } catch (error: unknown) {
      if (error instanceof Error) {
        showNotification(`Failed to dispatch call: ${error.message}`, 'error');
      } else {
        showNotification('Failed to dispatch call', 'error');
      }
    }
    setLoading(false);
  }, [selectedAgent, phoneNumber]);

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type } as { message: string; type: string } | null);
    setTimeout(() => setNotification(null), 3000);
  };

  const isAgentRunning = (agentName: string) => {
    return runningAgents.some((ra: RunningAgent) => ra.agent_name === agentName);
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) => (
    <div className="group relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl hover:scale-105 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
          <p className="text-4xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );

  const AgentCard = ({ agent }: { agent: Agent }) => {
    const running = isAgentRunning(agent.name);
    const runningAgent = runningAgents.find((ra: RunningAgent) => ra.agent_name === agent.name);
    
    // Use agent.type directly from API
    const typeBadge = agent.type === 'INBOUND' ? (
      <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
        <ArrowDownLeft className="w-4 h-4" /> Inbound
      </div>
    ) : (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
        <ArrowUpRight className="w-4 h-4" /> Outbound
      </div>
    );
    
    return (
      <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 hover:shadow-3xl hover:scale-105 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full ${running ? 'bg-emerald-500' : 'bg-gray-400'} shadow-lg`}></div>
                {running && (
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-emerald-500 animate-ping"></div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
                <p className="text-sm text-gray-600">Voice Agent</p>
                {typeBadge}
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Status</span>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                running ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                {running ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            {running && runningAgent && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Process ID</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{runningAgent.pid}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Config</span>
              <span className="text-xs text-gray-500 truncate ml-2 max-w-32">{agent.config_path?.split('/').pop()}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            {running ? (
              <button
                onClick={() => stopAgent(agent.name)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-lg"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => runAgent(agent.name)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-lg"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            )}
            
            {/* Only show call dispatch for OUTBOUND agents that are running */}
            {running && agent.type === 'OUTBOUND' && (
              <button
                onClick={() => {
                  setSelectedAgent(agent.name);
                  setShowDispatchModal(true);
                }}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Formik-based CreateAgentModal for creating a new agent with nested assistant fields
  const CreateAgentModal = ({ show, onClose, agentName, agentType, assistants, onCreate }: {
    show: boolean;
    onClose: () => void;
    agentName: string;
    agentType: string;
    assistants: Assistant[];
    onCreate: (values: { agentName: string; agentType: string; assistants: Assistant[] }) => void;
  }) => {
    // Always call hooks at the top
    const [ttsAdvancedOpen, setTtsAdvancedOpen] = useState<Record<string, boolean>>({});
    if (!show) return null;

    type FormValues = {
      agentName: string;
      agentType: string;
      assistants: Assistant[];
    };

    const initialValues: FormValues = {
      agentName,
      agentType,
      assistants,
    };

    const defaultAssistant: Assistant = {
      name: '',
      prompt: '',
      stt: { name: '', language: '', model: '' },
      llm: { name: '', model: '', temperature: 0.3 },
      tts: {
        name: '',
        voice_id: '',
        language: '',
        model: '',
        voice_settings: {
          similarity_boost: 1,
          stability: 0.7,
          style: 0.7,
          use_speaker_boost: false,
          speed: 1
        }
      },
      vad: { name: '', min_silence_duration: 0.2 }
    };

    const sectionLabel = (icon: React.ReactNode, text: string) => (
      <h4 className="flex items-center gap-2 font-bold text-md mb-2 text-gray-700">
        {icon}
        {text}
      </h4>
    );

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100/80 via-purple-100/80 to-pink-100/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/30 overflow-y-auto max-h-[90vh] relative font-sans">
          <button onClick={onClose} className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-pink-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-10">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg">
              <Plus className="w-6 h-6 text-white" />
            </span>
            <h3 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent tracking-tight">Create New Agent</h3>
          </div>
          <Formik
            initialValues={initialValues}
            enableReinitialize
            onSubmit={(values: FormValues, actions: FormikHelpers<FormValues>) => {
              onCreate(values);
              actions.resetForm();
              onClose();
            }}
          >
            {({ values, handleReset }: { values: FormValues; handleReset: () => void }) => (
              <Form>
                <div className="space-y-10">
                  {/* Agent Section */}
                  <div>
                    <h4 className="flex items-center text-xl font-bold text-blue-700 mb-4 border-b border-blue-200 pb-2">
                      {sectionLabel(<Cpu className="w-5 h-5" />, 'Agent')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Agent Name (optional)</label>
                        <Field name="agentName" as="input" type="text" className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" placeholder="Agent Name (optional)" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                        <Field name="agentType" as="select" className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500">
                          <option value="INBOUND">INBOUND</option>
                          <option value="OUTBOUND">OUTBOUND</option>
                        </Field>
                      </div>
                    </div>
                  </div>
                  {/* Assistants Section */}
                  <div>
                    <FieldArray name="assistants">
                      {({ push, remove }: FieldArrayRenderProps) => (
                        <>
                          <h4 className="flex items-center text-xl font-bold text-purple-700 mb-4 border-b border-purple-200 pb-2 justify-between">
                            <span>{sectionLabel(<Users className="w-5 h-5" />, 'bg-purple-100 text-purple-600')}Assistants</span>
                            <button type="button" onClick={() => push(defaultAssistant)} className="ml-4 px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform">+ Add Assistant</button>
                          </h4>
                          {values.assistants.map((assistant: Assistant, idx: number) => (
                            <div key={idx} className="mb-10 border border-purple-200 rounded-2xl p-6 bg-purple-50/60 relative shadow-md">
                              {values.assistants.length > 1 && (
                                <button type="button" onClick={() => remove(idx)} className="absolute top-3 right-3 text-red-500 hover:text-red-700 font-bold text-2xl bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md">&times;</button>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                  <Field name={`assistants[${idx}].name`} as="input" type="text" className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                </div>
                              </div>
                              <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Prompt</label>
                                <Field name={`assistants[${idx}].prompt`} as="textarea" rows={6} className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-shadow hover:shadow-md resize-y min-h-[120px] text-gray-700 placeholder-gray-500" />
                              </div>
                              {/* STT Section */}
                              <div className="mb-4">
                                <h5 className="flex items-center text-md font-bold text-green-700 mb-2 mt-4">
                                  {sectionLabel(<Mic className="w-4 h-4 bg-green-100 text-green-600 rounded-full p-1" />, 'STT (Speech-to-Text)')}
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provider</label>
                                    <Field
                                      name={`assistants[${idx}].stt.name`}
                                      as="select"
                                      className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500"
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                        const value = e.target.value as 'sarvam' | 'deepgram' | '';
                                        let def;
                                        if (value === 'sarvam') {
                                          def = PROVIDER_DEFAULTS.sarvam;
                                        } else if (value === 'deepgram') {
                                          def = PROVIDER_DEFAULTS.deepgram;
                                        } else {
                                          def = { name: '', model: '', language: '' };
                                        }
                                        values.assistants[idx].stt = { ...def };
                                        handleReset();
                                      }}
                                    >
                                      <option value="">Select STT</option>
                                      <option value="sarvam">sarvam</option>
                                      <option value="deepgram">deepgram</option>
                                    </Field>
                                  </div>
                                  {/* Only show fields for selected provider */}
                                  {values.assistants[idx].stt.name === 'sarvam' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                                        <Field name={`assistants[${idx}].stt.language`} as="select" className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500">
                                          <option value="hi-IN">Hindi (hi-IN)</option>
                                          <option value="bn-IN">Bengali (bn-IN)</option>
                                          <option value="ta-IN">Tamil (ta-IN)</option>
                                          <option value="te-IN">Telugu (te-IN)</option>
                                          <option value="gu-IN">Gujarati (gu-IN)</option>
                                          <option value="kn-IN">Kannada (kn-IN)</option>
                                          <option value="ml-IN">Malayalam (ml-IN)</option>
                                          <option value="mr-IN">Marathi (mr-IN)</option>
                                          <option value="pa-IN">Punjabi (pa-IN)</option>
                                          <option value="od-IN">Odia (od-IN)</option>
                                          <option value="en-IN">English (en-IN)</option>
                                        </Field>
                                      </div>
                                      <div>
                                        <label className="hidden text-sm font-semibold text-gray-700 mb-2">Model</label>
                                        <Field name={`assistants[${idx}].stt.model`} as="input" className=" hidden w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                    </>
                                  )}
                                  {values.assistants[idx].stt.name === 'deepgram' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                                        <Field name={`assistants[${idx}].stt.language`} as="input" className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="hidden  text-sm font-semibold text-gray-700 mb-2">Model</label>
                                        <Field name={`assistants[${idx}].stt.model`} as="input" className="hidden w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              {/* LLM Section */}
                              <div className="mb-4">
                                <h5 className="flex items-center text-md font-bold text-pink-700 mb-2 mt-4">
                                  {sectionLabel(<Brain className="w-4 h-4 bg-pink-100 text-pink-600 rounded-full p-1" />, 'LLM (Language Model)')}
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provider (only openai)</label>
                                    <Field name={`assistants[${idx}].llm.name`} as="select" className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500">
                                      <option value="openai">openai</option>
                                    </Field>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                                    <Field name={`assistants[${idx}].llm.model`} as="input" className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Temperature</label>
                                    <Field name={`assistants[${idx}].llm.temperature`} as="input" type="number" className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                  </div>
                                </div>
                              </div>
                              {/* TTS Section */}
                              <div className="mb-4">
                                <h5 className="flex items-center text-md font-bold text-orange-700 mb-2 mt-4">
                                  {sectionLabel(<Headphones className="w-4 h-4 bg-orange-100 text-orange-600 rounded-full p-1" />, 'TTS (Text-to-Speech)')}
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provider</label>
                                    <Field
                                      name={`assistants[${idx}].tts.name`}
                                      as="select"
                                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500"
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                        const value = e.target.value as 'sarvam_tts' | 'elevenlabs';
                                        let def;
                                        if (value === 'elevenlabs') {
                                          def = PROVIDER_DEFAULTS.elevenlabs;
                                        } else if (value === 'sarvam_tts') {
                                          def = PROVIDER_DEFAULTS.sarvam_tts;
                                        } else {
                                          def = PROVIDER_DEFAULTS.elevenlabs;
                                        }
                                        values.assistants[idx].tts = { ...def };
                                        handleReset();
                                      }}
                                    >
                                      <option value="">Select TTS</option>
                                      <option value="elevenlabs">elevenlabs</option>
                                      <option value="sarvam_tts">sarvam</option>
                                    </Field>
                                  </div>
                                  {/* Only show fields for selected provider */}
                                  {values.assistants[idx].tts.name === 'elevenlabs' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Voice ID</label>
                                        <Field name={`assistants[${idx}].tts.voice_id`} as="input" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                                        <Field name={`assistants[${idx}].tts.language`} as="input" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                                        <Field name={`assistants[${idx}].tts.model`} as="input" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      {/* Advanced fields for elevenlabs only */}
                                      <div className="col-span-2">
                                        <button
                                          type="button"
                                          onClick={() => setTtsAdvancedOpen((prev) => ({ ...prev, [String(idx)]: !prev[String(idx)] }))}
                                          className="mt-2 mb-4 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-semibold shadow hover:bg-orange-200 transition"
                                        >
                                          {ttsAdvancedOpen[String(idx)] ? 'Hide' : 'Show'} Advanced Configuration
                                        </button>
                                        {ttsAdvancedOpen[String(idx)] && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 border border-orange-200 rounded-xl p-4 mt-2">
                                            <div>
                                              <label className="block text-sm font-semibold text-gray-700 mb-2">Similarity Boost</label>
                                              <Field name={`assistants[${idx}].tts.voice_settings.similarity_boost`} as="input" type="number" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold text-gray-700 mb-2">Stability</label>
                                              <Field name={`assistants[${idx}].tts.voice_settings.stability`} as="input" type="number" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold text-gray-700 mb-2">Style</label>
                                              <Field name={`assistants[${idx}].tts.voice_settings.style`} as="input" type="number" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold text-gray-700 mb-2">Use Speaker Boost</label>
                                              <Field name={`assistants[${idx}].tts.voice_settings.use_speaker_boost`} type="checkbox" className="mr-2" />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-semibold text-gray-700 mb-2">Speed</label>
                                              <Field name={`assistants[${idx}].tts.voice_settings.speed`} as="input" type="number" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {values.assistants[idx].tts.name === 'sarvam_tts' ? (
                                    <>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Target Language Code</label>
                                        <Field name={`assistants[${idx}].tts.target_language_code`} as="input" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                                        <Field name={`assistants[${idx}].tts.model`} as="input" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Speaker</label>
                                        <Field name={`assistants[${idx}].tts.speaker`} as="input" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Loudness</label>
                                        <Field name={`assistants[${idx}].tts.loudness`} as="input" type="number" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Speed</label>
                                        <Field name={`assistants[${idx}].tts.speed`} as="input" type="number" className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Enable Preprocessing</label>
                                        <Field name={`assistants[${idx}].tts.enable_preprocessing`} type="checkbox" className="mr-2" />
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              {/* VAD Section */}
                              <div className="mb-4">
                                <h5 className="flex items-center text-md font-bold text-cyan-700 mb-2 mt-4">
                                  {sectionLabel(<Zap className="w-4 h-4 bg-cyan-100 text-cyan-600 rounded-full p-1" />, 'VAD (Voice Activity Detection)')}
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">VAD Name</label>
                                    <Field name={`assistants[${idx}].vad.name`} as="input" className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">VAD Min Silence Duration</label>
                                    <Field name={`assistants[${idx}].vad.min_silence_duration`} as="input" type="number" className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-white transition-shadow hover:shadow-md text-gray-700 placeholder-gray-500" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </FieldArray>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => { handleReset(); onClose(); }} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg">Create</button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    );
  };

  // Simplified DispatchModal without memo to avoid re-render issues
  const DispatchModal = ({ show, onClose }: { show: boolean; onClose: () => void }) => {
    if (!show) return null;

    const handleClose = () => {
      setPhoneNumber('');
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Dispatch Call</h3>
            <button 
              onClick={handleClose} 
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber ?? ''}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 911 244 0000"
                className="w-full px-4 py-3 border-2 border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent bg-gray-900 text-white placeholder-gray-400"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={dispatchCall}
              disabled={loading || !selectedAgent || !phoneNumber}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Dispatching...' : 'Dispatch Call'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Notification = ({ notification }: { notification: { message: string; type: string } | null }) => {
    if (!notification) return null;
    
    return (
      <div className={`fixed top-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 backdrop-blur-xl border border-white/20 ${
        notification.type === 'success' 
          ? 'bg-emerald-500/90 text-white' 
          : 'bg-red-500/90 text-white'
      }`}>
        {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <span className="font-medium">{notification.message}</span>
      </div>
    );
  };

  // Template selection modal
  const TemplateModal = ({ show, onClose }: { show: boolean; onClose: () => void }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Choose Agent Type</h3>
          <div className="space-y-4 mb-8">
            {agentTemplates.map(tmpl => (
              <button
                key={tmpl.key}
                className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-100 text-lg font-semibold transition text-gray-700"
                onClick={() => {
                  if (tmpl.agent) {
                    setAgentName(tmpl.agent.name);
                    setAgentType(tmpl.agent.type);
                    setAssistants(tmpl.agent.assistant);
                  } else {
                    // Only reset to default if custom agent is selected
                    setAgentName('Agent');
                    setAgentType('INBOUND');
                    setAssistants([
                      {
                        name: 'Neha',
                        prompt: 'You are a helpful agent...',
                        stt: { name: 'sarvam', language: 'en-IN', model: 'saarika:v2.5' },
                        llm: { name: 'openai', model: 'gpt-4.1-mini', temperature: 0.3 },
                        tts: { ...PROVIDER_DEFAULTS.elevenlabs },
                        vad: { name: 'silero', min_silence_duration: 0.2 }
                      }
                    ]);
                  }
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                {tmpl.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-medium text-gray-700">Cancel</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full opacity-10 animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-xl shadow-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Agent Command Center
                </h1>
                <p className="text-sm text-gray-600">Intelligent Voice Agent Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Create Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <StatCard
            title="Total Agents"
            value={agents.length}
            icon={Cpu}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
          <StatCard
            title="Active Agents"
            value={runningAgents.length}
            icon={Activity}
            color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Idle Agents"
            value={agents.length - runningAgents.length}
            icon={Square}
            color="bg-gradient-to-r from-gray-500 to-gray-600"
          />
        </div>

        {/* Agents Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Voice Agents</h2>
              <p className="text-gray-600">Manage your intelligent voice agents</p>
            </div>
            <button
              onClick={() => {
                fetchAgents();
                fetchRunningAgents();
              }}
              className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl font-medium hover:bg-white hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-white/20"
            >
              <Activity className="w-5 h-5" />
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map(agent => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
          
          {agents.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Agents Deployed</h3>
              <p className="text-gray-600 mb-8">Create your first intelligent voice agent to get started</p>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                Create First Agent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TemplateModal
        show={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />
      <CreateAgentModal
        show={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
        agentName={agentName}
        agentType={agentType}
        assistants={assistants}
        onCreate={async (values: { agentName: string; agentType: string; assistants: Assistant[] }) => {
          const agent = {
            name: typeof values.agentName === 'string' ? values.agentName.toLowerCase().replace(/\s+/g, '_') : values.agentName,
            type: values.agentType,
            assistant: values.assistants.map((assistant: Assistant) => {
              let tts;
              if (assistant.tts.name === 'elevenlabs') {
                tts = {
                  name: 'elevenlabs',
                  voice_id: (assistant.tts as AssistantTTS).voice_id,
                  model: (assistant.tts as AssistantTTS).model,
                  language: (assistant.tts as AssistantTTS).language,
                  voice_settings: { ...(assistant.tts as AssistantTTS).voice_settings }
                };
              } else if (assistant.tts.name === 'sarvam_tts') {
                tts = {
                  name: 'sarvam_tts',
                  target_language_code: (assistant.tts as AssistantTTS).target_language_code,
                  model: (assistant.tts as AssistantTTS).model,
                  speaker: (assistant.tts as AssistantTTS).speaker,
                  loudness: (assistant.tts as AssistantTTS).loudness,
                  speed: (assistant.tts as AssistantTTS).speed,
                  enable_preprocessing: (assistant.tts as AssistantTTS).enable_preprocessing
                };
              } else {
                tts = assistant.tts;
              }
              return {
                ...assistant,
                tts
              };
            })
          };
          const endpoint = values.agentType === 'OUTBOUND'
            ? '/api/create-outbound-agent'
            : '/api/create-inbound-agent';
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agent })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            showNotification('Agent created successfully', 'success');
            fetchAgents();
            fetchRunningAgents();
            setAgentName('Agent');
            setAgentType('INBOUND');
            setAssistants([
              {
                name: 'Neha',
                prompt: 'You are a helpful agent...',
                stt: { name: 'sarvam', language: 'en-In', model: 'saarika:v2.5' },
                llm: { name: 'openai', model: 'gpt-4.1-mini', temperature: 0.3 },
                tts: { ...PROVIDER_DEFAULTS.elevenlabs },
                vad: { name: 'silero', min_silence_duration: 0.2 }
              }
            ]);
            setShowCreateModal(false);
          } catch (err: unknown) {
            if (err instanceof Error) {
              showNotification(`Failed to create agent: ${err.message}`, 'error');
            } else {
              showNotification('Failed to create agent', 'error');
            }
          }
        }}
      />
      <DispatchModal
        show={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
      />
      
      {/* Notification */}
      <Notification notification={notification} />
    </div>
  );
};

export default Dashboard;