// Add missing types for Chrome API
declare namespace chrome {
  namespace storage {
    const sync: {
      get(callback?: (items: any) => void): Promise<any>;
      get(keys?: string | string[] | object | null): Promise<any>;
      set(items: object): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    };
    const local: {
      get(callback?: (items: any) => void): Promise<any>;
      get(keys?: string | string[] | object | null): Promise<any>;
      set(items: object): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    };
    const managed: {
      get(callback?: (items: any) => void): void;
      get(keys?: string | string[] | object | null): Promise<any>;
    };
    const session: {
      get(callback?: (items: any) => void): Promise<any>;
      get(keys?: string | string[] | object | null): Promise<any>;
      set(items: object): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    };
  }
  namespace runtime {
    const lastError: Error | undefined;
    function sendMessage(message: any): void;
  }
} 