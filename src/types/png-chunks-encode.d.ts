declare module 'png-chunks-encode' {
  interface Chunk {
    name: string
    data: Uint8Array
  }

  function encode(chunks: Chunk[]): Buffer
  export = encode
}
