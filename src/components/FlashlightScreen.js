import React from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Power } from "lucide-react-native";
import { styles } from "../styles/globalStyles";

export default function FlashlightScreen({
  isLightOn,
  toggleLight,
  ringAnim1,
  ringAnim2,
  ringAnim3,
  sliderVal,
}) {
  const intensity = sliderVal / 35;

  return (
    <View style={styles.flashlightScreen}>
      <View style={styles.flashlightButtonArea}>
        {isLightOn && (
          <View style={styles.rippleContainer}>
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [
                    {
                      scale: ringAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.45 + intensity * 0.55],
                      }),
                    },
                  ],
                  opacity: ringAnim1.interpolate({
                    inputRange: [0, 0.1, 0.7, 1],
                    outputRange: [0, 0.4, 0.2, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [
                    {
                      scale: ringAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.45 + intensity * 0.55],
                      }),
                    },
                  ],
                  opacity: ringAnim2.interpolate({
                    inputRange: [0, 0.1, 0.7, 1],
                    outputRange: [0, 0.4, 0.2, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ripple,
                {
                  transform: [
                    {
                      scale: ringAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.45 + intensity * 0.55],
                      }),
                    },
                  ],
                  opacity: ringAnim3.interpolate({
                    inputRange: [0, 0.1, 0.7, 1],
                    outputRange: [0, 0.4, 0.2, 0],
                  }),
                },
              ]}
            />
          </View>
        )}

        <Pressable
          style={[styles.powerButton, isLightOn && styles.powerButtonActive]}
          onPress={toggleLight}
        >
          <Power size={56} color="#1C1C1E" strokeWidth={2} />
        </Pressable>
      </View>
      <Text style={styles.flashlightHint}>
        Tap to {isLightOn ? "turn off" : "turn on"}
      </Text>
    </View>
  );
}
