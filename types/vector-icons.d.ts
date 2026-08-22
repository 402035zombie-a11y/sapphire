// types/vector-icons.d.ts
// Минимальные декларации для react-native-vector-icons (без @types).
declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';
  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
    onPress?: () => void;
  }
  export default class Ionicons extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/FontAwesome' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';
  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
    onPress?: () => void;
  }
  export default class FontAwesome extends Component<IconProps> {}
}
