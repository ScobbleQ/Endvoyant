declare module 'user-agents' {
  export interface UserAgentOptions {
    deviceCategory?: string;
  }

  export default class UserAgent {
    constructor(options?: UserAgentOptions);
    toString(): string;
  }
}
