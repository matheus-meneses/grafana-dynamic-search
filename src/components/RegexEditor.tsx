import React, { useState, useMemo, useCallback, memo } from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import { Input, useStyles2, Icon, TextArea } from '@grafana/ui';
import { css, keyframes } from '@emotion/css';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
  `,
  feedback: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    padding: ${theme.spacing(0.5, 1)};
    border-radius: ${theme.shape.radius.default};
    animation: ${fadeIn} 0.15s ease-out;
  `,
  valid: css`
    color: ${theme.colors.success.text};
    background: ${theme.colors.success.transparent};
  `,
  invalid: css`
    color: ${theme.colors.error.text};
    background: ${theme.colors.error.transparent};
  `,
  empty: css`
    color: ${theme.colors.text.secondary};
    background: transparent;
  `,
  previewSection: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(0.5)};
    padding: ${theme.spacing(1)};
    background: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.radius.default};
    border: 1px solid ${theme.colors.border.weak};
  `,
  previewLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    font-weight: ${theme.typography.fontWeightMedium};
  `,
  previewResult: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    font-family: ${theme.typography.fontFamilyMonospace};
    color: ${theme.colors.text.primary};
    padding: ${theme.spacing(0.5)};
    background: ${theme.colors.background.primary};
    border-radius: ${theme.shape.radius.default};
    min-height: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  previewSuccess: css`
    border-left: 3px solid ${theme.colors.success.main};
  `,
  previewNoMatch: css`
    border-left: 3px solid ${theme.colors.warning.main};
    color: ${theme.colors.text.secondary};
    font-style: italic;
  `,
  testInput: css`
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
});

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

const validateRegex = (pattern: string): ValidationResult => {
  if (!pattern) {
    return { valid: true, error: null };
  }
  try {
    new RegExp(pattern);
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
};

const applyTestRegex = (pattern: string, testValue: string): string | null => {
  if (!pattern || !testValue) {
    return null;
  }
  try {
    const regex = new RegExp(pattern);
    const match = testValue.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    if (match) {
      return match[0];
    }
    return null;
  } catch {
    return null;
  }
};

const RegexEditorComponent: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
  const styles = useStyles2(getStyles);
  const [inputValue, setInputValue] = useState(value || '');
  const [testValue, setTestValue] = useState('');

  const validation = useMemo(() => validateRegex(inputValue), [inputValue]);

  const previewResult = useMemo(
    () => (validation.valid ? applyTestRegex(inputValue, testValue) : null),
    [inputValue, testValue, validation.valid]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      const { valid } = validateRegex(newValue);
      if (valid) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    if (validation.valid) {
      onChange(inputValue);
    }
  }, [validation.valid, inputValue, onChange]);

  const handleTestChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestValue(e.target.value);
  }, []);

  return (
    <div className={styles.container}>
      <Input
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="e.g. /api/(.*)"
        aria-label="Regex pattern"
        aria-describedby="regex-feedback"
      />

      {inputValue ? (
        validation.valid ? (
          <div className={`${styles.feedback} ${styles.valid}`} id="regex-feedback">
            <Icon name="check-circle" size="sm" />
            <span>Valid regex pattern</span>
          </div>
        ) : (
          <div
            className={`${styles.feedback} ${styles.invalid}`}
            id="regex-feedback"
            data-testid="dynamic-search-panel-regex-error"
          >
            <Icon name="exclamation-triangle" size="sm" />
            <span>Invalid regex: {validation.error}</span>
          </div>
        )
      ) : (
        <div className={`${styles.feedback} ${styles.empty}`} id="regex-feedback">
          <Icon name="info-circle" size="sm" />
          <span>Optional: Use capture groups (.*) to extract values</span>
        </div>
      )}

      {validation.valid && inputValue && (
        <div className={styles.previewSection}>
          <label className={styles.previewLabel}>Test your regex:</label>
          <TextArea
            value={testValue}
            onChange={handleTestChange}
            placeholder="Enter a sample value to test"
            rows={1}
            className={styles.testInput}
            aria-label="Test value for regex"
          />
          {testValue && (
            <div
              className={`${styles.previewResult} ${previewResult !== null ? styles.previewSuccess : styles.previewNoMatch}`}
            >
              {previewResult !== null ? (
                <>
                  <Icon name="arrow-right" size="sm" />
                  <span>{previewResult}</span>
                </>
              ) : (
                <>
                  <Icon name="times" size="sm" />
                  <span>No match</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const RegexEditor = memo(RegexEditorComponent);
