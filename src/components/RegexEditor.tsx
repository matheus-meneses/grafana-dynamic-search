import React, { useState, useMemo } from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import { Input, useStyles2, Icon } from '@grafana/ui';
import { css } from '@emotion/css';

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
});

const validateRegex = (pattern: string): { valid: boolean; error: string | null } => {
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

export const RegexEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
    const styles = useStyles2(getStyles);
    const [inputValue, setInputValue] = useState(value || '');

    const validation = useMemo(() => validateRegex(inputValue), [inputValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Validation will be recalculated via useMemo on next render,
        // but we need immediate result for onChange
        const { valid } = validateRegex(newValue);
        if (valid) {
            onChange(newValue);
        }
    };

    const handleBlur = () => {
        if (validation.valid) {
            onChange(inputValue);
        }
    };

    return (
        <div className={styles.container}>
            <Input
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. /api/(.*)"
            />

            {inputValue ? (
                validation.valid ? (
                    <div className={`${styles.feedback} ${styles.valid}`}>
                        <Icon name="check-circle" size="sm" />
                        <span>Valid regex pattern</span>
                    </div>
                ) : (
                    <div className={`${styles.feedback} ${styles.invalid}`} data-testid="dynamic-search-panel-regex-error">
                        <Icon name="exclamation-triangle" size="sm" />
                        <span>Invalid regex: {validation.error}</span>
                    </div>
                )
            ) : (
                <div className={`${styles.feedback} ${styles.empty}`}>
                    <Icon name="info-circle" size="sm" />
                    <span>Optional: Use capture groups (.*) to extract values</span>
                </div>
            )}
        </div>
    );
};
