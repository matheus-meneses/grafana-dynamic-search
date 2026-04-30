import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { useStyles2, Icon } from '@grafana/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: ${theme.spacing(2)};
    text-align: center;
    gap: ${theme.spacing(1)};
  `,
  icon: css`
    color: ${theme.colors.error.main};
    opacity: 0.8;
  `,
  title: css`
    font-size: ${theme.typography.body.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.primary};
  `,
  message: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    max-width: 300px;
    word-break: break-word;
  `,
  retryButton: css`
    margin-top: ${theme.spacing(1)};
    padding: ${theme.spacing(0.5, 1)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.primary.text};
    background: ${theme.colors.primary.transparent};
    border: 1px solid ${theme.colors.primary.border};
    border-radius: ${theme.shape.radius.default};
    cursor: pointer;
    transition: background 0.2s ease;
    &:hover {
      background: ${theme.colors.primary.shade};
    }
  `,
});

const ErrorFallback: React.FC<{ error: Error | null; onRetry: () => void }> = ({ error, onRetry }) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container} data-testid="error-boundary-fallback">
      <Icon name="exclamation-circle" size="xl" className={styles.icon} />
      <div className={styles.title}>Something went wrong</div>
      {error && <div className={styles.message}>{error.message}</div>}
      <button className={styles.retryButton} onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Panel error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

