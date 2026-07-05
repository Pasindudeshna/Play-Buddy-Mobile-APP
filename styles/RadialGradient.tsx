
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';


export type RadialGradientProps = {
  	colors?: string[];
  	locations?: number[];
  	cx?: string;
  	cy?: string;
  	rx?: string;
  	ry?: string;
  	style?: StyleProp<ViewStyle>;
    		children?: React.ReactNode;
    		};
    		
    		
    		const RadialGradient = ({ colors = [], locations = [], cx = '50%', cy = '50%', rx = '50%', ry = '50%', style, children }: RadialGradientProps) => {
      			const gradientId = React.useMemo(() => 'radial-' + Math.random().toString(36).slice(2), []);
      			return (
        				<View style={[{ position: 'relative', overflow: 'hidden' }, style]}>
          					<Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            						<Defs>
              							<SvgRadialGradient id={gradientId} cx={cx} cy={cy} rx={rx} ry={ry} gradientUnits="objectBoundingBox">
                								{colors.map((color, i) => (
                  									<Stop key={i} offset={locations[i] ?? (colors.length > 1 ? i / (colors.length - 1) : 0)} stopColor={color} />
                    										))}
                    										</SvgRadialGradient>
                    										</Defs>
                    										<Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
                    										</Svg>
                    										{children}
                    										</View>
                    										);
                  									};
                  									
                  									export default RadialGradient;
                  									