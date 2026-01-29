import 'react-native';

// Extend React Native types to include className for NativeWind
declare module 'react-native' {
    interface ViewProps {
        className?: string;
    }
    interface TextProps {
        className?: string;
    }
    interface ImageProps {
        className?: string;
    }
    interface TextInputProps {
        className?: string;
    }
    interface PressableProps {
        className?: string;
    }
    interface TouchableOpacityProps {
        className?: string;
    }
    interface ScrollViewProps {
        className?: string;
    }
}

