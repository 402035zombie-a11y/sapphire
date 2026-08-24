// components/ui/TextField.tsx
// Металлическое поле ввода (inset). Заменяет TextInput с metal(theme,'inset',{radius}).
import React, { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { metal } from '../../theme/neu';

const TextField = forwardRef<TextInput, { radius?: number } & TextInputProps>(
  ({ radius, style, ...rest }, ref) => {
    const theme = useTheme();
    // R1 ревізія: ЄДИНА inset-функція = диспетчер metal('inset') (neuMetalInset).
    // Стара neuInset мала іншу геометрію + Android border-хак → поля виглядали
    // інакше за всі інші вдавлені елементи.
    const insetShadow = metal(theme, 'inset', { radius: radius ?? 10 });
    return (
      <TextInput
        ref={ref}
        style={[
          insetShadow,
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
