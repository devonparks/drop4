import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Drop4 Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message || 'Unknown error'}</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgDark, padding: 24,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 20, color: '#ffffff', marginBottom: 8,
  },
  message: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 13, color: colors.textSecondary, textAlign: 'center',
    marginBottom: 20, lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.orange, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 14, color: '#ffffff',
  },
});
