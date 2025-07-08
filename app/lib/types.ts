export interface Assistant {
    name: string;
    prompt: string;
    stt: {
      name: string;
      language: string;
      model: string;
    };
    llm: {
      name: string;
      model: string;
      temperature: number;
    };
    tts: {
      name: string;
      voice_id: string;
      language: string;
      model: string;
      voice_settings: {
        similarity_boost: number;
        stability: number;
        style: number;
        use_speaker_boost: boolean;
        speed: number;
      };
    };
    vad: {
      name: string;
      min_silence_duration: number;
    };
  }
  
  export interface Agent {
    name: string;
    type: string;
    config_path?: string;
    assistant: Assistant[];
  }
  
  export interface RunningAgent {
    agent_name: string;
    pid: number;
  }
  
  export interface NotificationData {
    message: string;
    type: 'success' | 'error';
  }
  