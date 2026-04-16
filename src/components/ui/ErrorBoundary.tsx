import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Optional callback invoked when the user taps "Go Home". If not
   * provided, the button is hidden (so we don't offer a dead action
   * when there's nowhere to go). The parent can use this to call
   * navigation.navigate('MainTabs', { screen: 'Home' }) or the equivalent.
   */
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) console.error('[Drop4 Error]', error, errorInfo);
  }

  handleTryAgain = () => {
    // On web, a true reload is cheap and clears any corrupted runtime
    // state. On native, there's no equivalent API, so we clear the
    // error state and hope the re-render is enough — usually it is, since
    // error boundaries catch transient errors more often than structural
    // ones.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    this.props.onGoHome?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>🔧</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Don't worry — this is usually a quick fix.
            </Text>
            <Pressable
              onPress={() => this.setState({ showDetails: !this.state.showDetails })}
              style={styles.detailsToggle}
              accessibilityRole="button"
              accessibilityLabel={this.state.showDetails ? 'Hide error details' : 'Show error details'}
              accessibilityState={{ expanded: this.state.showDetails }}
            >
              <Text style={styles.detailsToggleText}>
                {this.state.showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
              </Text>
            </Pressable>
            {this.state.showDetails && (
              <Text style={styles.message}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>
            )}
            <Pressable
              onPress={this.handleTryAgain}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.retryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityHint="Reloads the app"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
            {this.props.onGoHome && (
              <Pressable
                onPress={this.handleGoHome}
                style={styles.secondaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Go home"
                accessibilityHint="Dismisses this error and returns to the home screen"
              >
                <Text style={styles.secondaryText}>Go Home</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDark,
    padding: 24,
  },
  card: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  detailsToggle: {
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  detailsToggleText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 17,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
    width: '100%',
  },
  retryBtn: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryBtnPressed: {
    backgroundColor: colors.orangeDark,
    transform: [{ scale: 0.97 }],
  },
  retryText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  secondaryText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
