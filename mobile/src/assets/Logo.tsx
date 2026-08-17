import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ width = 96, height = 96 }: LogoProps) {
  return (
    <Image
      source={require('../../assets/icon.png')}
      style={[styles.logo, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 20,
  },
});
