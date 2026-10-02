export interface StoredFile {
  storageKey: string;
  storageUrl: string | null;
  storagePath: string;
  size: number;
}

export interface SaveProductFileOptions {
  productId: string;
  filename: string;
  buffer: Buffer;
}
