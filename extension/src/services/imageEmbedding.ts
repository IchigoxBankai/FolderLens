import { pipeline, env, RawImage } from '@huggingface/transformers';

// Configure transformers.js for Chrome extension MV3 sidepanel
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
          message: 'Loading visual search engine...'
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

      const devicesToTry = this.isWebGPUAvailable ? ['webgpu', 'wasm'] : ['wasm'];
      let loadedPipeline = null;
      let usedDevice = 'wasm';

      for (const device of devicesToTry) {
        try {
          if (onProgress) {
            onProgress({
              status: 'loading_model',
              progress: 30,
              message: `Initializing neural engine (${device.toUpperCase()})...`
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
                  message: `Loading vision model (${percent}%)...`
                });
              }
            }
          });

          usedDevice = device;
          break;
        } catch (deviceErr) {
          console.warn(`Failed to initialize on ${device}, falling back:`, deviceErr);
        }
      }

      if (!loadedPipeline) {
        throw new Error('Failed to initialize visual embedding model.');
      }

      this.extractor = loadedPipeline;
      this.initializedDevice = usedDevice;

      if (onProgress) {
        onProgress({
          status: 'ready',
          progress: 100,
          message: `Engine ready (${usedDevice.toUpperCase()}).`
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
   */
  public async generateEmbedding(
    imageInput: Blob | string | HTMLImageElement,
    onProgress?: ModelProgressCallback
  ): Promise<number[]> {
    const extractor = await this.initialize(onProgress);

    if (onProgress) {
      onProgress({
        status: 'preparing_image',
        message: 'Preparing image...'
      });
    }

    const rawImage = await this.preprocessImage(imageInput);

    if (onProgress) {
      onProgress({
        status: 'generating_embedding',
        message: 'Generating visual signature...'
      });
    }

    const output = await extractor(rawImage, { pooling: 'none', normalize: false });
    
    let vectorData: number[] = [];
    if (output && output.data) {
      vectorData = Array.from(output.data);
    } else if (Array.isArray(output)) {
      vectorData = output;
    } else {
      throw new Error('Unexpected model output format');
    }

    if (vectorData.length > 512) {
      vectorData = vectorData.slice(0, 512);
    }

    const normalized = normalizeL2(vectorData);

    if (onProgress) {
      onProgress({
        status: 'ready',
        message: 'Signature generated.'
      });
    }

    return normalized;
  }

  private async preprocessImage(imageInput: Blob | string | HTMLImageElement): Promise<RawImage> {
    if (typeof imageInput === 'string' && imageInput.startsWith('http')) {
      return await RawImage.fromURL(imageInput);
    }

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
          if (!ctx) throw new Error('Canvas 2D context unavailable');

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const raw = new RawImage(imgData.data, w, h, 4);

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
        reject(new Error(`Failed to load image: ${e}`));
      };
    });
  }
}

export function normalizeL2(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export async function computeSHA256(blobOrBuffer: Blob | ArrayBuffer): Promise<string> {
  const buffer = blobOrBuffer instanceof Blob ? await blobOrBuffer.arrayBuffer() : blobOrBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

        const grays: number[][] = [];
        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            row.push(gray);
          }
          grays.push(row);
        }

        let bitStr = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < hashSize; x++) {
            bitStr += grays[y][x + 1] > grays[y][x] ? '1' : '0';
          }
        }

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

export const imageEmbeddingService = ImageEmbeddingService.getInstance();
