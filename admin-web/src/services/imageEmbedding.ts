import { pipeline, env, RawImage } from '@huggingface/transformers';

// Configure transformers.js for optimal browser performance
env.allowLocalModels = false;
env.useBrowserCache = true;

export type ModelProgressCallback = (info: {
  status: 'idle' | 'loading_model' | 'preparing_image' | 'generating_embedding' | 'ready' | 'error';
  progress?: number;
  message: string;
}) => void;

class ImageEmbeddingService {
  private static instance: ImageEmbeddingService;
  private extractor: any = null;
  private initPromise: Promise<any> | null = null;
  private modelName = 'Xenova/clip-vit-base-patch32';
  private isWebGPUAvailable = false;
  private initializedDevice = 'wasm';

  private constructor() {}

  public static getInstance(): ImageEmbeddingService {
    if (!ImageEmbeddingService.instance) {
      ImageEmbeddingService.instance = new ImageEmbeddingService();
    }
    return ImageEmbeddingService.instance;
  }

  public getStatus() {
    return {
      isReady: this.extractor !== null,
      device: this.initializedDevice,
      modelName: this.modelName
    };
  }

  /**
   * Initializes the vision feature extractor model lazily.
   * Tries WebGPU first for hardware acceleration, then falls back to WASM/CPU.
   */
  public async initialize(onProgress?: ModelProgressCallback): Promise<any> {
    if (this.extractor) {
      return this.extractor;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (onProgress) {
        onProgress({
          status: 'loading_model',
          progress: 10,
          message: 'Initializing visual AI engine...'
        });
      }

      // Check WebGPU availability
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            this.isWebGPUAvailable = true;
          }
        } catch {
          this.isWebGPUAvailable = false;
        }
      }

      // Try WebGPU if available, fallback to WASM
      const devicesToTry = this.isWebGPUAvailable ? ['webgpu', 'wasm'] : ['wasm'];

      let loadedPipeline = null;
      let usedDevice = 'wasm';

      for (const device of devicesToTry) {
        try {
          if (onProgress) {
            onProgress({
              status: 'loading_model',
              progress: 30,
              message: `Loading vision signature model (${device.toUpperCase()})...`
            });
          }

          loadedPipeline = await pipeline('image-feature-extraction', this.modelName, {
            device: device as any,
            progress_callback: (progressInfo: any) => {
              if (onProgress && progressInfo.status === 'progress') {
                const percent = Math.round((progressInfo.progress || 0) * 100);
                onProgress({
                  status: 'loading_model',
                  progress: 30 + Math.round(percent * 0.6),
                  message: `Downloading visual model: ${progressInfo.file || ''} (${percent}%)`
                });
              }
            }
          });

          usedDevice = device;
          break;
        } catch (deviceErr) {
          console.warn(`Failed to initialize model on ${device}, falling back:`, deviceErr);
        }
      }

      if (!loadedPipeline) {
        throw new Error('Failed to initialize visual embedding model on both WebGPU and WASM.');
      }

      this.extractor = loadedPipeline;
      this.initializedDevice = usedDevice;

      if (onProgress) {
        onProgress({
          status: 'ready',
          progress: 100,
          message: `Visual engine ready (${usedDevice.toUpperCase()}).`
        });
      }

      return this.extractor;
    })();

    try {
      return await this.initPromise;
    } catch (err) {
      this.initPromise = null;
      this.extractor = null;
      throw err;
    }
  }

  /**
   * Generates a 512-dimensional normalized float embedding vector for an image.
   * Efficiently preprocesses and resizes image before passing to model.
   */
  public async generateEmbedding(
    imageInput: File | Blob | string | HTMLImageElement,
    onProgress?: ModelProgressCallback
  ): Promise<number[]> {
    const extractor = await this.initialize(onProgress);

    if (onProgress) {
      onProgress({
        status: 'preparing_image',
        message: 'Preprocessing image for visual encoding...'
      });
    }

    // Convert input to efficient RawImage or preprocessed blob
    const rawImage = await this.preprocessImage(imageInput);

    if (onProgress) {
      onProgress({
        status: 'generating_embedding',
        message: 'Generating 512-dim visual vector signature...'
      });
    }

    const output = await extractor(rawImage, { pooling: 'none', normalize: false });
    
    // Extract features and normalize L2
    let vectorData: number[] = [];
    if (output && output.data) {
      vectorData = Array.from(output.data);
    } else if (Array.isArray(output)) {
      vectorData = output;
    } else {
      throw new Error('Unexpected model output format');
    }

    // Slice to 512 if necessary and normalize
    if (vectorData.length > 512) {
      vectorData = vectorData.slice(0, 512);
    }

    const normalized = normalizeL2(vectorData);

    if (onProgress) {
      onProgress({
        status: 'ready',
        message: 'Visual signature generated.'
      });
    }

    return normalized;
  }

  /**
   * Preprocesses and resizes image to max 384px to prevent large buffer memory leaks.
   */
  private async preprocessImage(imageInput: File | Blob | string | HTMLImageElement): Promise<RawImage> {
    if (typeof imageInput === 'string' && imageInput.startsWith('http')) {
      // Remote URL -> RawImage.fromURL handles it
      return await RawImage.fromURL(imageInput);
    }

    // For Files, Blobs, data URLs or Image Elements: resize via Canvas
    return new Promise<RawImage>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let blobUrl = '';
      if (imageInput instanceof Blob) {
        blobUrl = URL.createObjectURL(imageInput);
        img.src = blobUrl;
      } else if (typeof imageInput === 'string') {
        img.src = imageInput;
      } else if (imageInput instanceof HTMLImageElement) {
        img.src = imageInput.src;
      }

      img.onload = () => {
        try {
          const maxDim = 384;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(w, 1);
          canvas.height = Math.max(h, 1);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            throw new Error('Failed to obtain canvas 2D context');
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          
          // Construct RawImage from RGB bytes
          const raw = new RawImage(imgData.data, w, h, 4);

          // Cleanup
          canvas.width = 0;
          canvas.height = 0;
          if (blobUrl) URL.revokeObjectURL(blobUrl);

          resolve(raw);
        } catch (e) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          reject(e);
        }
      };

      img.onerror = (e) => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        reject(new Error(`Failed to load image for processing: ${e}`));
      };
    });
  }
}

/**
 * Normalizes vector to unit L2 length.
 */
export function normalizeL2(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Computes SHA-256 binary hash in browser using Web Crypto API.
 */
export async function computeSHA256(blobOrBuffer: Blob | ArrayBuffer): Promise<string> {
  const buffer = blobOrBuffer instanceof Blob ? await blobOrBuffer.arrayBuffer() : blobOrBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes 64-bit difference hash (dHash) perceptual fingerprint in browser.
 */
export async function computeDHash(imageInput: Blob | string | HTMLImageElement, hashSize = 8): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let blobUrl = '';
    if (imageInput instanceof Blob) {
      blobUrl = URL.createObjectURL(imageInput);
      img.src = blobUrl;
    } else if (typeof imageInput === 'string') {
      img.src = imageInput;
    } else if (imageInput instanceof HTMLImageElement) {
      img.src = imageInput.src;
    }

    img.onload = () => {
      try {
        const width = hashSize + 1;
        const height = hashSize;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Grayscale values
        const grays: number[][] = [];
        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // Standard luminance formula: 0.299 R + 0.587 G + 0.114 B
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            row.push(gray);
          }
          grays.push(row);
        }

        // Compare adjacent pixels
        let bitStr = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < hashSize; x++) {
            bitStr += grays[y][x + 1] > grays[y][x] ? '1' : '0';
          }
        }

        // Convert 64 bits to hex string
        let hex = '';
        for (let i = 0; i < bitStr.length; i += 4) {
          const chunk = bitStr.substring(i, i + 4);
          hex += parseInt(chunk, 2).toString(16);
        }

        canvas.width = 0;
        canvas.height = 0;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        resolve(hex);
      } catch (err) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        reject(err);
      }
    };

    img.onerror = (e) => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to load image for dHash: ${e}`));
    };
  });
}

/**
 * Generates lightweight compressed base64 JPEG thumbnail.
 */
export async function generateThumbnailBase64(
  imageInput: Blob | string | HTMLImageElement,
  maxDim = 250
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let blobUrl = '';
    if (imageInput instanceof Blob) {
      blobUrl = URL.createObjectURL(imageInput);
      img.src = blobUrl;
    } else if (typeof imageInput === 'string') {
      img.src = imageInput;
    } else if (imageInput instanceof HTMLImageElement) {
      img.src = imageInput.src;
    }

    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(w, 1);
        canvas.height = Math.max(h, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        canvas.width = 0;
        canvas.height = 0;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        resolve(dataUrl);
      } catch (err) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        reject(err);
      }
    };

    img.onerror = (e) => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to generate thumbnail: ${e}`));
    };
  });
}

export const imageEmbeddingService = ImageEmbeddingService.getInstance();
