declare module "mp3-duration" {
  function mp3Duration(
    bufferOrPath: Buffer | string,
    callback?: (err: Error | null, duration: number) => void
  ): Promise<number>;
  export = mp3Duration;
}

declare module "fluent-ffmpeg" {
  const ffmpeg: any;
  export = ffmpeg;
}
