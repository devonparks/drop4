import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { StaggeredEntry } from '../components/animations';
import { useShopStore } from '../stores/shopStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

// ═══════════════════════════════════════════════════════════════════════
// LegalScreen
//
// Renders one of four document types (Privacy Policy, Terms of Service,
// Credits, Support) based on the `type` route param. Content is plain
// text stored inline for offline availability — required by App Store.
//
// Content is app-store-review ready but not lawyer-reviewed. Before
// monetizing or adding regulated features (IAPs, user-to-user chat,
// ads, etc.) have a lawyer vet it for your jurisdiction. The
// {{SUPPORT_EMAIL}} / {{COMPANY_ADDRESS}} placeholders are swapped by
// fillPlaceholders() below — update those constants for contact info.
// ═══════════════════════════════════════════════════════════════════════

// Bump this whenever you make material changes to Privacy or Terms.
// App-store review flags "Last updated" stamps that look copy-pasted
// or are older than the binary, so keep this current.
const LEGAL_UPDATED = 'April 16, 2026';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

type DocType = 'privacy' | 'terms' | 'credits' | 'support';

interface Doc {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

const DOCS: Record<DocType, Doc> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: `Last updated: ${LEGAL_UPDATED}`,
    sections: [
      {
        heading: 'What we collect',
        body:
          'Drop4 collects the minimum data needed to run the game and save your progress:\n\n' +
          '• A random anonymous Firebase user ID created on first launch.\n' +
          '• Your gameplay stats (wins, losses, level, coins, match history).\n' +
          '• Your cosmetic choices (equipped board, pieces, emotes, character).\n' +
          '• Basic device info provided by the operating system (model, OS version, language).\n\n' +
          'We do NOT collect your name, email, phone number, precise location, contacts, microphone input, photo library, or health data. We do not use your camera. We do not track you across other apps or websites.',
      },
      {
        heading: 'What we do with it',
        body:
          'Your data is used to:\n\n' +
          '• Save your progress across sessions and devices.\n' +
          '• Generate aggregate statistics about game balance and retention.\n' +
          '• Send gameplay-related push notifications if you opt in (daily spin reminder, streak reminder, weekly shop reminder).\n\n' +
          'We do not sell your data. We do not share your data with advertisers or data brokers. We do not build advertising profiles of you. Drop4 contains no third-party advertising SDKs.',
      },
      {
        heading: 'Analytics',
        body:
          'Drop4 does not use Google Analytics, Firebase Analytics, Facebook SDK, AppsFlyer, Adjust, Amplitude, Mixpanel, or any other analytics provider. Gameplay stats described above are stored for the individual player\'s own progress, not aggregated into analytics dashboards about you.',
      },
      {
        heading: 'Push notifications',
        body:
          'If you grant notification permission, Drop4 schedules local reminders on your device for your daily spin, streak, and weekly shop rotation. These are sent by your own device, not our servers, and contain no personal data. You can disable them at any time in your device\'s Settings or in Drop4 → Settings → Notifications.',
      },
      {
        heading: 'Third-party services',
        body:
          '• Firebase (Google) — anonymous authentication + data storage. Their privacy policy: https://policies.google.com/privacy\n' +
          '• Expo (EAS) — app framework and build pipeline. Their privacy policy: https://expo.dev/privacy\n' +
          '• Apple / Google app stores — handle in-app purchases, app ratings, and crash reports you opt into sharing with developers via OS-level settings. We receive no personally identifying info from app store purchases beyond the receipt needed to unlock your content.',
      },
      {
        heading: 'Account deletion',
        body:
          'Drop4 creates an anonymous Firebase account on first launch. To delete all local and remote data:\n\n' +
          '1. Open Drop4 → Settings → Reset All Progress. This wipes local AsyncStorage, ends the Firebase anonymous session, and marks the remote record for deletion.\n' +
          '2. Alternatively, email {{SUPPORT_EMAIL}} with "DELETE ACCOUNT" in the subject line and we will remove your Firebase record within 30 days.\n\n' +
          'Because accounts are anonymous, we can only identify your specific record if you provide the user ID shown in Settings → About (tap the build number five times to reveal it).',
      },
      {
        heading: 'Your rights',
        body:
          'Under GDPR (EU/UK) and CCPA (California) you have the right to access, correct, port, or delete your personal data, and to object to its processing. To exercise any of these rights, email {{SUPPORT_EMAIL}} with the details of your request. We do not discriminate against users who exercise their privacy rights.',
      },
      {
        heading: 'Children',
        body:
          'Drop4 is suitable for all ages. We do not knowingly collect data from children under 13 beyond the anonymous gameplay stats described above. Drop4 does not contain advertising, social features, user-to-user chat, or other mechanisms typical of apps covered by COPPA\'s stricter rules. If you are a parent and believe your child\'s data has been collected in violation of COPPA, email {{SUPPORT_EMAIL}} and we will delete it.',
      },
      {
        heading: 'Changes to this policy',
        body:
          'We may update this policy to reflect new features or legal requirements. When we do, we will update the "Last updated" date above. Continued use of Drop4 after an update means you accept the new policy. Material changes (sharing data with new third parties, adding advertising, etc.) will trigger an in-app notice the first time you open the app.',
      },
      {
        heading: 'Contact',
        body:
          'Questions about this policy? Email {{SUPPORT_EMAIL}}.\n\nAMG Studios\n{{COMPANY_ADDRESS}}',
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    subtitle: `Last updated: ${LEGAL_UPDATED}`,
    sections: [
      {
        heading: 'Acceptance of terms',
        body:
          'By downloading or using Drop4 you agree to these terms. If you don\'t agree, don\'t use the app. These terms may be updated from time to time; we\'ll update the "Last updated" date and continued use after a material update means you accept the new terms.',
      },
      {
        heading: 'Eligibility',
        body:
          'Drop4 is available to users of any age. You must be old enough under your local law to form a binding contract with us, or have your parent or guardian\'s permission. We have designed Drop4 to be safe for all ages, but parents should supervise in-app purchases on children\'s devices using their app store\'s family controls.',
      },
      {
        heading: 'Your account',
        body:
          'Drop4 creates an anonymous account for you on first launch. No email or password is required. You are responsible for anything that happens under your account. If you share your device, those sessions count as yours. If you lose your device, your progress may not be recoverable without your user ID (see Settings → About).',
      },
      {
        heading: 'In-game purchases',
        body:
          'Drop4 offers optional in-app purchases for coins, gems, and cosmetic bundles through the Apple App Store or Google Play. All purchases are final unless otherwise required by law or your app store\'s own refund policy. Virtual currency and cosmetics have no cash value, cannot be exchanged for real money or other goods, and are licensed to you for use within Drop4 only. You can restore non-consumable purchases from Settings → Restore Purchases on the same app store account.',
      },
      {
        heading: 'Fair play',
        body:
          'You agree not to cheat, exploit bugs for unfair advantage, use modified clients, reverse-engineer the game beyond what applicable law permits, or attempt to attack the game\'s servers. We reserve the right to suspend accounts that violate this rule, including revoking virtual currency earned through exploitation.',
      },
      {
        heading: 'User conduct',
        body:
          'Any profile name, custom title, or text you enter must not be illegal, harassing, hateful, sexually explicit, or infringe third-party rights. We can reset names that violate this at our discretion and without notice.',
      },
      {
        heading: 'Intellectual property',
        body:
          'Drop4 and all its code, UI art, music, sound effects, and original characters are owned by AMG Studios. The game uses the Synty Studios Sidekick Character Creator under a commercial license for character art; those models remain the property of Synty Studios. Fonts "Fredoka" and "Outfit" are licensed under the SIL Open Font License (OFL). Connect Four is in the public domain; Drop4 is a separate creative work and is not affiliated with Hasbro or Milton Bradley.',
      },
      {
        heading: 'Disclaimers',
        body:
          'Drop4 is provided "AS IS" and "AS AVAILABLE" without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We don\'t guarantee the game will be error-free, uninterrupted, or available at all times. To the maximum extent permitted by law, we are not liable for lost progress, virtual currency, or any indirect, incidental, consequential, or special damages.',
      },
      {
        heading: 'Termination',
        body:
          'You can stop using Drop4 at any time by deleting the app. We can terminate or suspend access for users who violate these terms. On termination, your license to use the app ends, but sections on intellectual property, disclaimers, limitation of liability, and dispute resolution survive.',
      },
      {
        heading: 'Governing law',
        body:
          'These terms are governed by the laws of the jurisdiction where AMG Studios is organized, without regard to conflict-of-law rules. Any dispute that cannot be resolved informally will be resolved in the courts of that jurisdiction. If any provision of these terms is found unenforceable, the rest remain in effect.',
      },
      {
        heading: 'Contact',
        body: 'Questions about these terms? Email {{SUPPORT_EMAIL}}.',
      },
    ],
  },

  credits: {
    title: 'Credits',
    subtitle: 'Built with love',
    sections: [
      {
        heading: 'AMG Studios',
        body: 'Design, code, and direction: Devon Parks\nGame design consulting: Devon Parks',
      },
      {
        heading: 'Art & Characters',
        body:
          'Character models: Synty Studios — Sidekick Character Creator\nCharacter animations: Synty Sidekick + Mixamo (Adobe)\nProcedural board thumbnails + map art + UI: custom\nFonts: Fredoka (Fredoka team) + Outfit (Rodrigo Fuenzalida), both OFL',
      },
      {
        heading: 'Tech stack',
        body:
          'React Native + Expo SDK 54\nZustand + AsyncStorage\nReact Navigation 7\nReact Native Reanimated 3\n@react-three/fiber (3D characters)\nexpo-linear-gradient\n@shopify/react-native-skia',
      },
      {
        heading: 'Sound',
        body: 'All sound effects procedurally synthesized in JavaScript (scripts/generate-sfx.js). See the script for the math.',
      },
      {
        heading: 'Thanks',
        body:
          'Basketball Stars, NBA Street Vol. 2, NBA 2K, and Fortnite for the visual vocabulary.\nCandy Crush and Clash Royale for proving mobile polish can be premium.\nEveryone who playtested along the way.',
      },
      {
        heading: 'Version',
        body: 'Drop4 v1.0.0\n© 2026 AMG Studios. All rights reserved.',
      },
    ],
  },

  support: {
    title: 'Support',
    subtitle: 'Need help?',
    sections: [
      {
        heading: 'Contact us',
        body:
          'Email: {{SUPPORT_EMAIL}}\n\n' +
          'We aim to respond within 2 business days. Include:\n' +
          '• What you were trying to do\n' +
          '• What happened instead\n' +
          '• Your device model and OS version\n' +
          '• Your Drop4 version (see Settings → About)\n' +
          '• A screenshot if you can',
      },
      {
        heading: 'Common issues',
        body:
          '• Progress lost → First, try force-quitting and reopening the app. Your data syncs on boot.\n' +
          '• Purchase didn\'t go through → Tap Restore Purchases in Settings.\n' +
          '• Can\'t sign in → Check your internet connection. Anonymous accounts work offline but need internet for sync.',
      },
      {
        heading: 'Refunds',
        body:
          'Drop4 itself is free. Refunds for in-app purchases are handled by your app store (Apple App Store or Google Play) according to their policies, not by us. We can\'t process refunds directly.',
      },
      {
        heading: 'Bug reports',
        body:
          'Spotted a bug? Email {{SUPPORT_EMAIL}} with "BUG:" in the subject line. Include steps to reproduce. We log every report and fix what we can in the next update.',
      },
      {
        heading: 'Feature requests',
        body:
          'Got an idea for Drop4? Email {{SUPPORT_EMAIL}} with "FEATURE:" in the subject. Popular requests get added to the roadmap.',
      },
    ],
  },
};

// Placeholder replacer — swap these for real values before submission
const SUPPORT_EMAIL = 'support@amgstudios.com';
const COMPANY_ADDRESS = 'AMG Studios, LLC';

function fillPlaceholders(text: string): string {
  return text
    .replace(/{{SUPPORT_EMAIL}}/g, SUPPORT_EMAIL)
    .replace(/{{COMPANY_ADDRESS}}/g, COMPANY_ADDRESS);
}

export function LegalScreen({ navigation, route }: Props) {
  const { type } = route.params;
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);

  const doc = DOCS[type];
  if (!doc) {
    return (
      <ScreenBackground>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />
        <Text style={styles.errorText}>Document not found.</Text>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <TopBar
        coins={coins}
        gems={gems}
        level={level}
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">{doc.title}</Text>
        <Text style={styles.subtitle}>{doc.subtitle}</Text>

        {doc.sections.map((section, i) => (
          <StaggeredEntry key={i} index={i} delay={70}>
            <View style={styles.section}>
              <Text style={styles.heading} accessibilityRole="header">{section.heading}</Text>
              <Text style={styles.body}>{fillPlaceholders(section.body)}</Text>
            </View>
          </StaggeredEntry>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: weight.black,
    color: '#ffffff',
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: weight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: weight.bold,
    color: colors.orange,
    marginBottom: 6,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.82)',
  },
  errorText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
});
