/**
 * GLB Loader for React Native + Expo
 *
 * Loads .glb 3D models from bundled assets or remote URLs.
 * Handles Expo's Asset system for local files and caches parsed results.
 *
 * Usage:
 *   const { gltf, loading } = useGLB(require('../assets/models/body.glb'));
 *   const gltf = await loadGLB('https://cdn.example.com/model.glb');
 */
import { useState, useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
// @ts-ignore — three.js examples path types may not resolve in all configs
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// In-memory cache of parsed GLTFs — avoids re-parsing on re-renders
const glbCache = new Map<string, GLTF>();
const pendingLoads = new Map<string, Promise<GLTF>>();

/**
 * Resolve an asset source (require() ID or URL string) to a file URI
 * that THREE.GLTFLoader can fetch.
 */
async function resolveAssetUri(source: number | string): Promise<string> {
  if (typeof source === 'string') return source;

  const asset = Asset.fromModule(source);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  // On web, localUri may be null — fall back to the uri (http URL)
  return asset.localUri || asset.uri;
}

/**
 * Get a cache key for a source.
 */
function getCacheKey(source: number | string): string {
  if (typeof source === 'string') return source;
  return `bundled:${source}`;
}

/**
 * Load a GLB model imperatively.
 * Returns cached result if already loaded.
 */
async function loadGLB(source: number | string): Promise<GLTF> {
  const key = getCacheKey(source);

  // Return cached
  if (glbCache.has(key)) return glbCache.get(key)!;

  // Return pending (dedup concurrent loads of the same asset)
  if (pendingLoads.has(key)) return pendingLoads.get(key)!;

  const promise = (async () => {
    const uri = await resolveAssetUri(source);
    const loader = new GLTFLoader();

    return new Promise<GLTF>((resolve, reject) => {
      loader.load(
        uri,
        (gltf: any) => {
          glbCache.set(key, gltf);
          pendingLoads.delete(key);
          resolve(gltf);
        },
        undefined,
        (error: any) => {
          if (__DEV__) console.error('[glbLoader] failed:', error?.message || error);
          pendingLoads.delete(key);
          reject(error);
        },
      );
    });
  })();

  pendingLoads.set(key, promise);
  return promise;
}

/**
 * React hook to load a GLB model.
 */
export function useGLB(source: number | string | null): {
  gltf: GLTF | null;
  loading: boolean;
  error: Error | null;
} {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (source == null) {
      setGltf(null);
      setLoading(false);
      return;
    }

    const key = getCacheKey(source);

    // Instant cache hit
    if (glbCache.has(key)) {
      setGltf(glbCache.get(key)!);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    loadGLB(source)
      .then((result) => {
        if (mountedRef.current) {
          setGltf(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
  }, [source]);

  return { gltf, loading, error };
}

/**
 * Preload multiple GLBs at app startup.
 */
export async function preloadGLBs(sources: (number | string)[]): Promise<void> {
  await Promise.all(sources.map(loadGLB));
}
