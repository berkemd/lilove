import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { t, type Anahtar } from '../i18n';
import { resolveAvatarPreview, avatarTraitLabel, type PreviewZone } from '../lib/avatarPreview';

const labels: Record<PreviewZone, Anahtar> = {
  skin: 'avatar_zone_skin',
  hair: 'avatar_zone_hair',
  hair_color: 'avatar_zone_hair_color',
  clothing_top: 'avatar_zone_clothing_top',
};
const hairPaths = {
  Short:
    'M72 100 C66 68 84 45 121 46 C151 44 174 63 168 101 L156 89 L151 73 Q119 92 86 78 L83 99 Z',
  Long: 'M66 177 Q57 132 66 82 C69 54 91 40 122 41 C158 41 177 63 178 97 L179 179 L155 186 L155 87 Q113 92 88 69 L84 176 Z',
  Curly:
    'M70 101 Q53 89 65 77 Q58 60 78 56 Q77 39 96 42 Q108 27 122 42 Q138 30 151 45 Q173 42 175 63 Q191 73 177 89 L168 106 L156 94 L154 76 Q137 83 126 71 Q108 88 89 76 L83 101 Z',
  Wavy: 'M71 103 Q58 80 76 60 Q88 45 110 48 Q133 28 155 48 Q180 58 171 85 L163 105 L155 82 Q142 75 134 66 Q119 88 88 80 L84 101 Z',
};

export default function AvatarPreview({
  equipped,
  demo = false,
}: {
  equipped: readonly unknown[];
  demo?: boolean;
}) {
  const { isDark } = useTheme();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const model = resolveAvatarPreview(equipped, demo ? 'demo' : 'account');
  const ink = isDark ? '#E5E1ED' : '#352F43';
  const muted = isDark ? '#BBB4C9' : '#655D73';
  const placeholder = isDark ? '#3F3B4B' : '#E3DFE9';
  const skin = model.skin ?? placeholder;
  const hair = model.hairColor ?? (isDark ? '#777180' : '#817A8C');
  const top = model.top ? (isDark ? '#9D92C9' : '#716394') : placeholder;
  const status = model.empty
    ? t('avatar_preview_empty')
    : [
        model.missing.length
          ? t('avatar_preview_missing').replace(
              '{features}',
              model.missing.map((zone) => t(labels[zone])).join(', ')
            )
          : '',
        model.unsupported.length
          ? t('avatar_preview_unsupported').replace('{features}', model.unsupported.join(', '))
          : '',
      ]
        .filter(Boolean)
        .join('\n');
  const selections = model.shown
    .map((item) => `${t(labels[item.zone])}: ${avatarTraitLabel(item.zone, item.name, t, demo)}`)
    .join(' · ');
  return (
    <View
      style={styles.container}
      testID="avatar-preview"
      onLayout={({ nativeEvent }) => setLayoutWidth(Math.round(nativeEvent.layout.width))}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={[t('preview'), selections, status].filter(Boolean).join('. ')}
        style={styles.illustration}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {/* Recreate the native SVG surface when its container changes width. */}
          <Svg key={layoutWidth} width={232} height={252} viewBox="0 0 240 260" accessible={false}>
            <Circle cx="120" cy="119" r="100" fill={isDark ? '#292632' : '#F1EDF5'} />
            {model.hair === 'Long' && (
              <Path testID="avatar-long-hair-back" d={hairPaths.Long} fill={hair} />
            )}
            <Path
              testID="avatar-top"
              d={
                model.top === 'Hoodie'
                  ? 'M92 161 Q79 162 67 180 L48 212 Q44 224 44 245 L196 245 Q196 220 192 212 L173 180 Q161 162 148 161 Z'
                  : 'M93 164 L68 175 Q54 184 47 205 L65 216 L70 245 L170 245 L175 216 L193 205 Q186 184 172 175 L147 164 Z'
              }
              fill={top}
              stroke={model.top ? 'none' : muted}
              strokeWidth="1.5"
              strokeDasharray={model.top ? undefined : '5 5'}
            />
            {model.top === 'Hoodie' && (
              <Path
                d="M94 164 Q78 164 79 184 L105 200 L120 184 L135 200 L161 184 Q162 164 146 164"
                fill="none"
                stroke={isDark ? '#C2B8E6' : '#9D8FB9'}
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}
            <Path d="M103 139 L102 163 Q120 185 138 163 L137 139" fill={skin} />
            {model.top === 'T-Shirt' && (
              <Path
                d="M96 165 Q120 190 144 165"
                fill="none"
                stroke={isDark ? '#C2B8E6' : '#9D8FB9'}
                strokeWidth="6"
              />
            )}
            <G testID="avatar-skin-tone" fill={skin}>
              <Ellipse cx="78" cy="110" rx="9" ry="14" />
              <Ellipse cx="162" cy="110" rx="9" ry="14" />
              <Path
                testID="avatar-skin"
                d="M78 91 Q78 53 120 53 Q162 53 162 91 L159 125 Q150 155 120 160 Q90 155 81 125 Z"
              />
            </G>
            <G
              fill="none"
              stroke={
                model.skin && ['#805039', '#503326'].includes(model.skin) ? '#F2D5BD' : '#5A3D36'
              }
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <Path d="M94 106 Q99 102 104 106 M136 106 Q141 102 146 106" />
              <Path d="M120 109 L117 120 L122 121" strokeWidth="1.7" opacity="0.55" />
              <Path d="M109 134 Q120 141 131 134" />
            </G>
            {model.hair && model.hair !== 'Bald' && (
              <Path testID="avatar-hair" d={hairPaths[model.hair]} fill={hair} />
            )}
            {!model.hair && (
              <Path
                testID="avatar-hair-placeholder"
                d="M76 86 Q80 47 120 46 Q159 46 164 86"
                fill="none"
                stroke={muted}
                strokeWidth="2"
                strokeDasharray="4 5"
              />
            )}
            {model.top === 'Hoodie' && (
              <G fill="none" stroke={ink} strokeWidth="2" opacity="0.45">
                <Path d="M104 192 L104 216 M136 192 L136 216 M97 235 Q120 223 143 235" />
              </G>
            )}
          </Svg>
        </View>
      </View>
      {selections ? <Text style={[styles.selections, { color: ink }]}>{selections}</Text> : null}
      {status ? (
        <Text style={[styles.status, { color: muted }]} testID="avatar-preview-status">
          {status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', gap: 10, marginBottom: 16 },
  illustration: { alignItems: 'center', width: 232, height: 252 },
  selections: { fontSize: 13, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  status: { fontSize: 13, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
});
