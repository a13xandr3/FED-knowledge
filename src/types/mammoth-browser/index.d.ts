declare module 'mammoth/mammoth.browser' {
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: {
      styleMap?: string[];
      includeDefaultStyleMap?: boolean;
    }
  ): Promise<{ value: string; messages: Array<{ type: string; message: string }> }>;
}
