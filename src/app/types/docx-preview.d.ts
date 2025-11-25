declare module 'docx-preview' {
  export type RenderOptions = {
    className?: string;
    inWrapper?: boolean;
    ignoreWidth?: boolean;
    ignoreHeight?: boolean;
    debug?: boolean;
    experimental?: boolean;
    breakPages?: boolean;
    useBase64URL?: boolean;
  };

  const docx: {
    renderAsync(
      data: ArrayBuffer | Blob | File,
      container: HTMLElement,
      options?: RenderOptions
    ): Promise<void>;
  };

  export default docx;
}
