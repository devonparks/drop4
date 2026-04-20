import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import {
  CompositeCharacter,
  getManifest,
  listPartsForSlot,
  NEUTRAL_CHARACTER,
  type CharacterState,
  type ContentSource,
  type ContentManifest,
} from '@amg/character-runtime';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// AmgTestScreen — smoke test for the new amg-engine character pipeline
//
// Wired temporarily so we can verify the end-to-end flow works:
//   Unity exporter → content/ dir → dev HTTP server → @amg/character-runtime
//   → react-three-fiber → rendered in Drop4.
//
// Loads the manifest, picks the first Human head + torso + hips + legs +
// feet it can find, composes them on the base skeleton, and draws the
// result. Once this renders, we delete this screen and move the
// Composite into CustomizeScreen properly.
// ═══════════════════════════════════════════════════════════════════════

const CONTENT_SOURCE: ContentSource = {
  baseUrl: 'http://localhost:8080',
};

export function AmgTestScreen() {
  const [state, setState] = useState<CharacterState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const manifest = await getManifest(CONTENT_SOURCE);
        const first = (slot: string) =>
          listPartsForSlot(manifest, 'Human', slot as any)[0]?.name;

        // Build a minimum viable character from the first available part
        // per essential slot. The composition pipeline doesn't care if
        // any slot is missing — it just renders whatever it finds.
        const pick: CharacterState = {
          ...NEUTRAL_CHARACTER,
          species: 'Human',
          parts: {
            Head: first('Head'),
            Hair: first('Hair'),
            EyeLeft: first('EyeLeft'),
            EyeRight: first('EyeRight'),
            Torso: first('Torso'),
            Hips: first('Hips'),
            ArmUpperLeft: first('ArmUpperLeft'),
            ArmUpperRight: first('ArmUpperRight'),
            ArmLowerLeft: first('ArmLowerLeft'),
            ArmLowerRight: first('ArmLowerRight'),
            HandLeft: first('HandLeft'),
            HandRight: first('HandRight'),
            LegLeft: first('LegLeft'),
            LegRight: first('LegRight'),
            FootLeft: first('FootLeft'),
            FootRight: first('FootRight'),
          },
          colors: {
            'Skin 01': '#dcb088',
            'Hair 01': '#3d2817',
            'Outfit 01 Primary': '#3a4a5e',
            'Outfit 01 Secondary': '#2d3546',
            'Outfit 01 Tertiary': '#2a2a30',
          },
          animation: null,
        };
        setState(pick);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <ScreenBackground scene="profile">
      <View style={styles.container}>
        <Text style={styles.title}>AMG Engine — Smoke Test</Text>
        {err ? (
          <View style={styles.errBox}>
            <Text style={styles.errTitle}>Failed to load character:</Text>
            <Text style={styles.errMsg}>{err}</Text>
            <Text style={styles.errHint}>
              Is the content server running?{'\n'}
              From amg-engine: {'\n'}
              <Text style={styles.errCode}>  node tools/serve-content.mjs</Text>
            </Text>
          </View>
        ) : !state ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.orange} />
            <Text style={styles.loadingText}>Fetching manifest…</Text>
          </View>
        ) : (
          <View style={styles.canvasWrap}>
            <Canvas
              camera={{ position: [0, 1.1, 3.2], fov: 42 }}
              gl={{ antialias: true, alpha: true }}
              onCreated={(state) => state.camera.lookAt(0, 0.95, 0)}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[3, 5, 3]} intensity={0.8} />
              <directionalLight position={[-3, 2, -1]} intensity={0.3} />
              <CompositeCharacter
                source={CONTENT_SOURCE}
                state={state}
                targetHeightMeters={1.8}
              />
            </Canvas>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 8,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: fonts.body, color: 'rgba(255,255,255,0.7)' },
  canvasWrap: { flex: 1, marginTop: 10 },
  errBox: {
    marginTop: 40, padding: 20, backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(231,76,60,0.4)',
  },
  errTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    color: '#ff6b6b', fontSize: 13, marginBottom: 8,
  },
  errMsg: {
    fontFamily: fonts.body, color: '#ffffff', fontSize: 12, marginBottom: 10,
  },
  errHint: {
    fontFamily: fonts.body, color: 'rgba(255,255,255,0.7)',
    fontSize: 11, lineHeight: 17,
  },
  errCode: {
    fontFamily: 'Courier', color: colors.orange,
  },
});
