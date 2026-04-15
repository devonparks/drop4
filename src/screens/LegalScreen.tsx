import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
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
// The text is a starter baseline. Replace with vetted legal copy before
// submission; placeholders are clearly marked with {{PLACEHOLDER}}.
// ═══════════════════════════════════════════════════════════════════════

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
    subtitle: 'Last updated: 2026',
    sections: [
      {
        heading: 'What we collect',
        body:
          'Drop4 collects the minimum data needed to run the game and save your progress:\n\n' +
          '• A random anonymous Firebase user ID created on first launch.\n' +
          '• Your gameplay stats (wins, losses, level, coins, match history).\n' +
          '• Your cosmetic choices (equipped board, pieces, emotes, character).\n' +
          '• Basic device info provided by the operating system (model, OS version, language).\n\n' +
          'We do NOT collect your name, email, phone number, location, contacts, or any other personal identifier unless you voluntarily sign in with an optional third-party provider.',
      },
      {
        heading: 'What we do with it',
        body:
          'Your data is used to:\n\n' +
          '• Save your progress across sessions and devices.\n' +
          '• Generate aggregate statistics about game balance and retention.\n' +
          '• Power online features (matchmaking, leaderboards) when those features ship.\n\n' +
          'We do not sell your data. We do not share your data with advertisers. We do not build profiles of you.',
      },
      {
        heading: 'Third-party services',
        body:
          '• Firebase (Google) — authentication + data storage. Their privacy policy: https://policies.google.com/privacy\n' +
          '• Expo — app framework. Their privacy policy: https://expo.dev/privacy',
      },
      {
        heading: 'Your rights',
        body:
          'You can reset all your data at any time from Settings → Reset All Progress. To request deletion of your Firebase data, contact {{SUPPORT_EMAIL}}. Under GDPR and CCPA you have the right to access, correct, or delete your personal data.',
      },
      {
        heading: 'Children',
        body:
          'Drop4 is rated for all ages. We do not knowingly collect data from children under 13 beyond the anonymous gameplay stats described above. If you are a parent and believe your child\'s data has been collected in violation of COPPA, please contact {{SUPPORT_EMAIL}}.',
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
    subtitle: 'Last updated: 2026',
    sections: [
      {
        heading: 'Acceptance of terms',
        body:
          'By downloading or using Drop4 you agree to these terms. If you don\'t agree, don\'t use the app. These terms may be updated; continued use after an update means you accept the new terms.',
      },
      {
        heading: 'Your account',
        body:
          'Drop4 creates an anonymous account for you on first launch. You are responsible for anything that happens under your account. If you share your device, those sessions count as yours.',
      },
      {
        heading: 'In-game purchases',
        body:
          'Drop4 offers optional in-app purchases for coins, gems, and cosmetic bundles. All purchases are final unless otherwise required by law or your app store. Virtual currency and cosmetics have no cash value and cannot be exchanged for money outside the game. You can restore previous non-consumable purchases from Settings → Restore Purchases.',
      },
      {
        heading: 'Fair play',
        body:
          'You agree not to cheat, exploit bugs for unfair advantage, use modified clients, or attack the game\'s servers. We reserve the right to suspend accounts that violate this rule, including revoking virtual currency earned through exploitation.',
      },
      {
        heading: 'Intellectual property',
        body:
          'Drop4 and all its art, code, music, sound effects, and characters are owned by AMG Studios. The game uses the Synty Studios Sidekick Character Creator under a commercial license for character art. Font "Fredoka" is licensed under OFL; "Outfit" is licensed under OFL. Connect 4 the game concept is in the public domain.',
      },
      {
        heading: 'Disclaimers',
        body:
          'Drop4 is provided "as is" without warranty of any kind. We don\'t guarantee the game will be error-free or available at all times. We are not liable for lost progress, virtual currency, or any indirect damages.',
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
          'React Native + Expo SDK 54\nFirebase (auth + firestore)\nZustand + AsyncStorage\nReact Navigation 7\nReact Native Reanimated 3\nexpo-linear-gradient\n@shopify/react-native-skia',
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
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.subtitle}>{doc.subtitle}</Text>

        {doc.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{fillPlaceholders(section.body)}</Text>
          </View>
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
