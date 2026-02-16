import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

interface HighlightedTextProps {
  text: string;
  highlight: string;
}

const getStyles = (theme: GrafanaTheme2) => ({
  highlight: css`
    background-color: ${theme.colors.warning.transparent};
    color: ${theme.colors.text.primary};
    border-radius: 2px;
    padding: 0 1px;
  `,
});

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight }) => {
  const styles = useStyles2(getStyles);

  const parts = useMemo(() => {
    if (!highlight || highlight.length === 0) {
      return [{ text, isMatch: false }];
    }

    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const splitParts = text.split(regex);

    return splitParts
      .filter((part) => part.length > 0)
      .map((part) => ({
        text: part,
        isMatch: part.toLowerCase() === highlight.toLowerCase(),
      }));
  }, [text, highlight]);

  return (
    <>
      {parts.map((part, index) =>
        part.isMatch ? (
          <mark key={index} className={styles.highlight}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
};
