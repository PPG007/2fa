declare module 'hotp' {
  export default function (key: string, counter: number, option: Option): string
  export interface Option {
    algorithm?: Algorithm;
    digits?: number;
  }

  export type Algorithm = 'sha1' | 'sha256' | 'sha512'
}