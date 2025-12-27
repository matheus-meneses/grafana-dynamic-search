import React, { useState, useEffect } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Input, useStyles2, Icon } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

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

export const RegexEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange }) => {
    const styles = useStyles2(getStyles);
    const [inputValue, setInputValue] = useState(value || '');
    const [validation, setValidation] = useState<{ valid: boolean; error: string | null }>({
        valid: true,
        error: null,
    });

    // Validate regex whenever input changes
    useEffect(() => {
        if (!inputValue) {
            setValidation({ valid: true, error: null });
            return;
        }

        try {
            new RegExp(inputValue);
            setValidation({ valid: true, error: null });
        } catch (e) {
            setValidation({ valid: false, error: (e as Error).message });
        }
    }, [inputValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Only update parent if regex is valid (or empty)
        try {
            if (newValue) {
                new RegExp(newValue);
            }
            onChange(newValue);
        } catch {
            // Don't update parent if invalid - keeps last valid value
        }
    };

    const handleBlur = () => {
        // On blur, always sync to parent (even if empty)
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

            {/* Validation feedback */}
            {inputValue ? (
                validation.valid ? (
                    <div className={`${styles.feedback} ${styles.valid}`}>
                        <Icon name="check-circle" size="sm" />
                        <span>Valid regex pattern</span>
                    </div>
                ) : (
                    <div className={`${styles.feedback} ${styles.invalid}`}>
                        <Icon name="exclamation-triangle" size="sm" />
                        <span>{validation.error}</span>
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
