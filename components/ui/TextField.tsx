// components/ui/TextField.tsx
// Металлическое поле ввода (inset). Заменяет TextInput с metal(theme,'inset',{radius}).
import React, { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { metal } from '../../theme/neu';

const TextField = forwardRef<TextInput, { radius?: number } & TextInputProps>(
  ({ radius, style, ...rest }, ref) => {
    const theme = useTheme();
    return (
      <TextInput
        ref={ref}
        style={[
          metal(theme, 'inset', { radius: radius ?? 10 }),
          { borderWidth: 0, color: theme.primaryText, paddingHorizontal: 12, paddingVertical: 10 },
          style,
        ]}
        placeholderTextColor={theme.secondaryText}
        {...rest}
      />
    );
  }
);

TextField.displayName = 'TextField';

export default TextField;
