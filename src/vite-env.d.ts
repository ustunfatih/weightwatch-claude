/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_SHEET_ID: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

// Google API type declarations
declare namespace gapi {
  namespace client {
    function init(config: { apiKey?: string; discoveryDocs: string[] }): Promise<void>;
    function getToken(): { access_token: string; scope?: string } | null;
    function setToken(token: null): void;

    namespace sheets {
      namespace spreadsheets {
        namespace values {
          function get(params: { spreadsheetId: string; range: string }): Promise<{
            result: { values?: string[][] };
          }>;
          function update(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            resource: { values: (string | number)[][] };
          }): Promise<void>;
          function append(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            resource: { values: (string | number)[][] };
          }): Promise<void>;
          function clear(params: { spreadsheetId: string; range: string }): Promise<void>;
        }
      }
    }
  }

  function load(api: string, callback: () => void): void;
}

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        callback: (response: { error?: string; access_token?: string }) => void;
        requestAccessToken(options: { prompt: string }): void;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: () => void;
      }): TokenClient;

      function revoke(accessToken: string): void;
    }
  }
}
