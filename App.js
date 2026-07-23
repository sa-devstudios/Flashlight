import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { CameraView, useCameraPermissions } from "expo-camera";

import {
  Activity,
  AlertTriangle,
  Check,
  Circle,
  Hand,
  LifeBuoy,
  Lightbulb,
  Power,
  Send,
  Sparkles,
  Zap,
} from "lucide-react-native";

import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads";

/* ========================================================================= */
/*                              MORSE CODE                                  */
/* ========================================================================= */

const MORSE_CODE = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-.",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",

  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
};

/* -------------------------------------------------------------------------- */
/*                                  ADS                                       */
/* -------------------------------------------------------------------------- */

const bannerAdUnitId = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-5296467128204489/3318481793";

const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-5296467128204489/1492132910";

const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

/* ========================================================================= */
/*                              CONSTANTS                                    */
/* ========================================================================= */

const MAX_MORSE_LENGTH = 20;

const BASE_DOT_DURATION = 180;

const MORSE_SPEEDS = {
  slow: {
    label: "SLOW",
    multiplier: 1.8,
  },

  normal: {
    label: "NORMAL",
    multiplier: 1,
  },

  fast: {
    label: "FAST",
    multiplier: 0.55,
  },
};

const QUICK_MESSAGES = [
  { id: "HELLO", icon: Hand },
  { id: "OK", icon: Check },
  { id: "SOS", icon: AlertTriangle },
  { id: "HELP", icon: LifeBuoy },
];

/* ========================================================================= */
/*                                  APP                                      */
/* ========================================================================= */

export default function App() {
  /* ----------------------------------------------------------------------- */
  /*                              PERMISSION                                 */
  /* ----------------------------------------------------------------------- */

  const [permission, requestPermission] = useCameraPermissions();

  /* ----------------------------------------------------------------------- */
  /*                                MODES                                    */
  /* ----------------------------------------------------------------------- */

  const [activeMode, setActiveMode] = useState("torch");

  /* ----------------------------------------------------------------------- */
  /*                             FLASHLIGHT                                  */
  /* ----------------------------------------------------------------------- */

  const [isLightOn, setIsLightOn] = useState(false);
  const [hardwareTorch, setHardwareTorch] = useState(false);

  /* ----------------------------------------------------------------------- */
  /*                                SLIDER                                   */
  /* ----------------------------------------------------------------------- */

  const [sliderVal, setSliderVal] = useState(18);

  const sliderWidthRef = useRef(0);

  /* ----------------------------------------------------------------------- */
  /*                                MORSE                                    */
  /* ----------------------------------------------------------------------- */

  const [morseText, setMorseText] = useState("");

  const [morseSpeed, setMorseSpeed] = useState("normal");

  const [isTransmitting, setIsTransmitting] = useState(false);

  const [currentMorseIndex, setCurrentMorseIndex] = useState(-1);

  const [currentMorseState, setCurrentMorseState] = useState("idle");

  const morseSequenceRef = useRef([]);

  /* ----------------------------------------------------------------------- */
  /*                                 ADS                                     */
  /* ----------------------------------------------------------------------- */

  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const pendingMorseModeRef = useRef(false);

  /* ----------------------------------------------------------------------- */
  /*                                 REFS                                    */
  /* ----------------------------------------------------------------------- */

  const timeoutRefs = useRef([]);

  const sosIntervalRef = useRef(null);

  /* ----------------------------------------------------------------------- */
  /*                           RIPPLE ANIMATIONS                             */
  /* ----------------------------------------------------------------------- */

  const ringAnim1 = useRef(new Animated.Value(0)).current;

  const ringAnim2 = useRef(new Animated.Value(0)).current;

  const ringAnim3 = useRef(new Animated.Value(0)).current;

  const rippleLoopsRef = useRef([]);

  /* ----------------------------------------------------------------------- */
  /*                            MORSE ANIMATION                              */
  /* ----------------------------------------------------------------------- */

  const morsePulse = useRef(new Animated.Value(0)).current;

  const liveGlow = useRef(new Animated.Value(0)).current;

  /* ========================================================================= */
  /*                            CAMERA PERMISSION                             */
  /* ========================================================================= */

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  /* ========================================================================= */
  /*                            INTERSTITIAL AD                               */
  /* ========================================================================= */

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setInterstitialLoaded(true);

        if (pendingMorseModeRef.current) {
          interstitial.show();
        }
      },
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setInterstitialLoaded(false);

        pendingMorseModeRef.current = false;

        setActiveMode("morse");
        setIsLightOn(false);

        interstitial.load();
      },
    );

    const unsubscribeError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      () => {
        setInterstitialLoaded(false);

        pendingMorseModeRef.current = false;

        setActiveMode("morse");
        setIsLightOn(false);
      },
    );

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  /* ========================================================================= */
  /*                              ENTER MORSE                                 */
  /* ========================================================================= */

  const enterMorseMode = () => {
    if (interstitialLoaded) {
      pendingMorseModeRef.current = true;

      interstitial.show();

      return;
    }

    pendingMorseModeRef.current = true;

    interstitial.load();
  };

  /* ========================================================================= */
  /*                           RIPPLE ANIMATION                               */
  /* ========================================================================= */

  const getRippleDuration = () => {
    const intensity = sliderVal / 35;
    return 2800 - intensity * 1800;
  };

  const stopRippleAnimation = () => {
    rippleLoopsRef.current.forEach((loop) => {
      if (loop?.stop) {
        loop.stop();
      }
    });

    rippleLoopsRef.current = [];

    ringAnim1.stopAnimation();
    ringAnim2.stopAnimation();
    ringAnim3.stopAnimation();

    ringAnim1.setValue(0);
    ringAnim2.setValue(0);
    ringAnim3.setValue(0);
  };

  const startRippleAnimation = () => {
    stopRippleAnimation();

    const duration = getRippleDuration();

    const loop1 = Animated.loop(
      Animated.timing(ringAnim1, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(duration / 3),
        Animated.timing(ringAnim2, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.delay((duration / 3) * 2),
        Animated.timing(ringAnim3, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    rippleLoopsRef.current = [loop1, loop2, loop3];

    loop1.start();
    loop2.start();
    loop3.start();
  };

  useEffect(() => {
    if (isLightOn && (activeMode === "torch" || activeMode === "sos")) {
      startRippleAnimation();
    } else {
      stopRippleAnimation();
    }

    return () => {
      stopRippleAnimation();
    };
  }, [isLightOn, activeMode, sliderVal]);

  /* ========================================================================= */
  /*                              SOS ENGINE                                  */
  /* ========================================================================= */

  const getSosDelay = (value) => {
    return Math.max(80, 600 - value * 14);
  };

  const getSosHz = (value) => {
    return (1000 / (getSosDelay(value) * 2)).toFixed(1);
  };

  useEffect(() => {
    clearInterval(sosIntervalRef.current);

    if (activeMode === "morse") {
      setHardwareTorch(false);

      return;
    }

    if (!isLightOn) {
      setHardwareTorch(false);

      return;
    }

    if (activeMode === "torch") {
      setHardwareTorch(true);

      return;
    }

    if (activeMode === "sos") {
      const delay = getSosDelay(sliderVal);

      let state = true;

      setHardwareTorch(true);

      sosIntervalRef.current = setInterval(() => {
        state = !state;

        setHardwareTorch(state);
      }, delay);
    }

    return () => {
      clearInterval(sosIntervalRef.current);
    };
  }, [activeMode, isLightOn, sliderVal]);

  /* ========================================================================= */
  /*                                SLIDER                                    */
  /* ========================================================================= */

  const updateSliderFromTouch = (event) => {
    if (!sliderWidthRef.current) {
      return;
    }

    const x = event.nativeEvent.locationX;

    const percentage = Math.max(0, Math.min(1, x / sliderWidthRef.current));

    const value = Math.max(1, Math.min(35, Math.round(percentage * 35)));

    setSliderVal(value);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: updateSliderFromTouch,

      onPanResponderMove: updateSliderFromTouch,
    }),
  ).current;

  /* ========================================================================= */
  /*                           MORSE SEQUENCE                                 */
  /* ========================================================================= */

  const createMorseSequence = (text) => {
    const sequence = [];
    const normalizedText = text.toUpperCase().slice(0, MAX_MORSE_LENGTH);

    const speedMultiplier = MORSE_SPEEDS[morseSpeed].multiplier;

    const dotDuration = BASE_DOT_DURATION * speedMultiplier;

    for (let charIndex = 0; charIndex < normalizedText.length; charIndex++) {
      const character = normalizedText[charIndex];

      if (character === " ") {
        sequence.push({
          type: "space",

          characterIndex: charIndex,

          duration: dotDuration * 7,
        });

        continue;
      }

      const code = MORSE_CODE[character];

      if (!code) {
        continue;
      }

      for (let symbolIndex = 0; symbolIndex < code.length; symbolIndex++) {
        const symbol = code[symbolIndex];

        sequence.push({
          type: symbol === "." ? "dot" : "dash",

          symbol,

          characterIndex: charIndex,

          duration: symbol === "." ? dotDuration : dotDuration * 3,
        });

        if (symbolIndex < code.length - 1) {
          sequence.push({
            type: "gap",

            characterIndex: charIndex,

            duration: dotDuration,
          });
        }
      }

      if (charIndex < normalizedText.length - 1) {
        sequence.push({
          type: "character-gap",

          characterIndex: charIndex,

          duration: dotDuration * 3,
        });
      }
    }

    return sequence;
  };

  /* ========================================================================= */
  /*                         STOP TRANSMISSION                                */
  /* ========================================================================= */

  const stopMorseTransmission = () => {
    timeoutRefs.current.forEach(clearTimeout);

    timeoutRefs.current = [];

    setHardwareTorch(false);

    setIsTransmitting(false);

    setCurrentMorseIndex(-1);

    setCurrentMorseState("idle");

    morseSequenceRef.current = [];
  };

  /* ========================================================================= */
  /*                         TRANSMIT MORSE                                  */
  /* ========================================================================= */

  const transmitMorse = () => {
    if (isTransmitting) {
      return;
    }

    const cleanText = morseText.trim();

    if (!cleanText) {
      return;
    }

    const sequence = createMorseSequence(cleanText);

    if (!sequence.length) {
      return;
    }

    stopMorseTransmission();

    setIsTransmitting(true);

    morseSequenceRef.current = sequence;

    let elapsed = 0;

    sequence.forEach((step, index) => {
      const startTimeout = setTimeout(() => {
        setCurrentMorseIndex(index);

        if (step.type === "dot" || step.type === "dash") {
          setHardwareTorch(true);

          setCurrentMorseState("on");

          morsePulse.stopAnimation();

          morsePulse.setValue(0);

          Animated.sequence([
            Animated.timing(morsePulse, {
              toValue: 1,

              duration: 100,

              useNativeDriver: true,
            }),

            Animated.timing(morsePulse, {
              toValue: 0,

              duration: Math.max(50, step.duration - 100),

              useNativeDriver: true,
            }),
          ]).start();
        } else {
          setHardwareTorch(false);

          setCurrentMorseState("off");
        }
      }, elapsed);

      timeoutRefs.current.push(startTimeout);

      elapsed += step.duration;
    });

    const finishTimeout = setTimeout(() => {
      setHardwareTorch(false);

      setIsTransmitting(false);

      setCurrentMorseIndex(-1);

      setCurrentMorseState("idle");
    }, elapsed);

    timeoutRefs.current.push(finishTimeout);
  };

  /* ========================================================================= */
  /*                         MORSE CHARACTERS                                 */
  /* ========================================================================= */

  const getMorseCharacters = () => {
    const text = morseText.toUpperCase().slice(0, MAX_MORSE_LENGTH);

    return text.split("").map((character, index) => ({
      character,

      code: MORSE_CODE[character] || "?",

      index,
    }));
  };

  const morseCharacters = getMorseCharacters();

  /* ========================================================================= */
  /*                         LIVE MORSE GLOW                                  */
  /* ========================================================================= */

  useEffect(() => {
    if (!isTransmitting) {
      liveGlow.stopAnimation();

      liveGlow.setValue(0);

      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(liveGlow, {
          toValue: 1,

          duration: 900,

          easing: Easing.inOut(Easing.ease),

          useNativeDriver: true,
        }),

        Animated.timing(liveGlow, {
          toValue: 0,

          duration: 900,

          easing: Easing.inOut(Easing.ease),

          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isTransmitting]);

  /* ========================================================================= */
  /*                            RIPPLE STYLE                                  */
  /* ========================================================================= */

  const getRippleStyle = (animatedValue) => {
    const intensity = sliderVal / 35;

    return {
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],

            outputRange: [1, 1.45 + intensity * 0.55],
          }),
        },
      ],

      opacity: animatedValue.interpolate({
        inputRange: [0, 0.1, 0.7, 1],

        outputRange: [0, 0.25 + intensity * 0.65, 0.25 + intensity * 0.35, 0],
      }),
    };
  };

  /* ========================================================================= */
  /*                           QUICK MESSAGES                                 */
  /* ========================================================================= */

  const applyQuickMessage = (message) => {
    if (isTransmitting) {
      return;
    }

    setMorseText(message);
  };

  /* ========================================================================= */
  /*                              CLEANUP                                     */
  /* ========================================================================= */

  useEffect(() => {
    return () => {
      clearInterval(sosIntervalRef.current);

      timeoutRefs.current.forEach(clearTimeout);

      stopRippleAnimation();

      setHardwareTorch(false);
    };
  }, []);

  /* ========================================================================= */
  /*                              LOADING                                     */
  /* ========================================================================= */

  if (!permission) {
    return (
      <View style={styles.centerTextContainer}>
        <ActivityIndicator size="large" color="#FFC700" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerTextContainer}>
        <Text style={styles.permissionText}>
          Camera and flashlight permission is required to use Flashlight.
        </Text>

        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  /* ========================================================================= */
  /*                                UI                                        */
  /* ========================================================================= */

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.appContent}>
          <CameraView
            style={styles.hiddenCamera}
            enableTorch={hardwareTorch}
            facing="back"
          />

          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>SA.DEVSTUDIOS</Text>

              <Text style={styles.headerTitle}>Flashlight</Text>
            </View>

            <View style={styles.headerStatus}>
              <Circle
                size={8}
                fill={isLightOn ? "#22C55E" : "#D1D5DB"}
                color={isLightOn ? "#22C55E" : "#D1D5DB"}
              />

              <Text style={styles.headerStatusText}>
                {isLightOn ? "ACTIVE" : "READY"}
              </Text>
            </View>
          </View>

          {/* MODE SWITCHER */}
          <View style={styles.modeSwitcher}>
            <Pressable
              style={[
                styles.modeButton,
                activeMode === "sos" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setActiveMode("sos");
                setIsLightOn(false);
              }}
            >
              <Activity
                size={18}
                color={activeMode === "sos" ? "#111111" : "#6B7280"}
              />

              <Text
                style={[
                  styles.modeButtonText,
                  activeMode === "sos" && styles.modeButtonTextActive,
                ]}
              >
                SOS
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeButton,
                activeMode === "torch" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setActiveMode("torch");
              }}
            >
              <Zap
                size={18}
                color={activeMode === "torch" ? "#111111" : "#6B7280"}
                fill={activeMode === "torch" ? "#111111" : "none"}
              />

              <Text
                style={[
                  styles.modeButtonText,
                  activeMode === "torch" && styles.modeButtonTextActive,
                ]}
              >
                Light
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeButton,
                activeMode === "morse" && styles.modeButtonActive,
              ]}
              onPress={enterMorseMode}
            >
              <Sparkles
                size={18}
                color={activeMode === "morse" ? "#111111" : "#6B7280"}
              />

              <Text
                style={[
                  styles.modeButtonText,
                  activeMode === "morse" && styles.modeButtonTextActive,
                ]}
              >
                Morse
              </Text>
            </Pressable>
          </View>

          {/* MAIN AREA */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.mainArea}
          >
            {activeMode === "morse" ? (
              <ScrollView
                style={styles.morseScreen}
                showsVerticalScrollIndicator={false}
              >
                {/* MESSAGE INPUT */}
                <View style={styles.messageCard}>
                  <View style={styles.messageCardHeader}>
                    <Text style={styles.messageLabel}>YOUR MESSAGE</Text>

                    <Text style={styles.characterCounter}>
                      {morseText.length}/{MAX_MORSE_LENGTH}
                    </Text>
                  </View>

                  <TextInput
                    style={styles.morseInput}
                    value={morseText}
                    onChangeText={(text) => {
                      if (!isTransmitting && text.length <= MAX_MORSE_LENGTH) {
                        setMorseText(text);
                      }
                    }}
                    placeholder="Type something..."
                    placeholderTextColor="#A1A1AA"
                    maxLength={MAX_MORSE_LENGTH}
                    editable={!isTransmitting}
                    autoCapitalize="characters"
                    textAlign="center"
                    returnKeyType="done"
                  />
                </View>

                {/* QUICK SHORTCUTS */}
                <View style={styles.quickMessageRow}>
                  {QUICK_MESSAGES.map((msg) => {
                    const Icon = msg.icon;
                    const isActive = morseText === msg.id;

                    return (
                      <Pressable
                        key={msg.id}
                        style={[
                          styles.quickMessageButton,
                          isActive && styles.quickMessageButtonActive,
                        ]}
                        onPress={() => applyQuickMessage(msg.id)}
                        disabled={isTransmitting}
                      >
                        <Icon
                          size={14}
                          color={isActive ? "#111111" : "#71717A"}
                          strokeWidth={2.5}
                        />
                        <Text
                          style={[
                            styles.quickMessageText,
                            isActive && styles.quickMessageTextActive,
                          ]}
                        >
                          {msg.id}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                {/* SPEED CONTROLS */}
                <View style={styles.speedSection}>
                  <Text style={styles.speedLabel}>MORSE SPEED</Text>

                  <View style={styles.speedRow}>
                    {Object.keys(MORSE_SPEEDS).map((speed) => (
                      <Pressable
                        key={speed}
                        style={[
                          styles.speedButton,
                          morseSpeed === speed && styles.speedButtonActive,
                        ]}
                        onPress={() => setMorseSpeed(speed)}
                        disabled={isTransmitting}
                      >
                        <Text
                          style={[
                            styles.speedButtonText,
                            morseSpeed === speed &&
                              styles.speedButtonTextActive,
                          ]}
                        >
                          {MORSE_SPEEDS[speed].label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* LIGHT MORSE TRANSLATION */}
                <View style={styles.translationSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>MORSE TRANSLATION</Text>

                    <View style={styles.signalStatus}>
                      <Animated.View
                        style={[
                          styles.signalDot,
                          {
                            opacity: isTransmitting
                              ? liveGlow.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.45, 1],
                                })
                              : 0.5,
                          },
                        ]}
                      />

                      <Text style={styles.signalStatusText}>
                        {isTransmitting ? "TRANSMITTING" : "READY"}
                      </Text>
                    </View>
                  </View>

                  {/* Character Badges Displayed Directly (No Container) */}
                  <View style={styles.nakedTranslationArea}>
                    {morseCharacters.length === 0 ? (
                      <Text style={styles.emptyTranslationText}>
                        Your Morse code will appear here
                      </Text>
                    ) : (
                      <View style={styles.morseCharactersRow}>
                        {morseCharacters.map((item) => {
                          const isActive =
                            currentMorseIndex >= 0 &&
                            morseSequenceRef.current[currentMorseIndex]
                              ?.characterIndex === item.index;

                          return (
                            <View
                              key={`${item.index}-${item.character}`}
                              style={[
                                styles.morseCharacter,
                                isActive && styles.morseCharacterActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.morseCharacterText,
                                  isActive && styles.morseCharacterTextActive,
                                ]}
                              >
                                {item.character === " " ? "·" : item.character}
                              </Text>

                              <Text
                                style={[
                                  styles.morseCodeText,
                                  isActive && styles.morseCodeTextActive,
                                ]}
                              >
                                {item.code}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>

                {/* LIVE SIGNAL */}
                <View style={styles.liveSignalArea}>
                  <Animated.View
                    style={[
                      styles.liveSignalGlow,
                      {
                        opacity: liveGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.08, 0.25],
                        }),

                        transform: [
                          {
                            scale: liveGlow.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.liveSignalCircle,
                      isTransmitting && styles.liveSignalCircleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.liveSignalInner,
                        currentMorseState === "on" && styles.liveSignalInnerOn,
                      ]}
                    />

                    <Text style={styles.liveSignalLabel}>
                      {currentMorseState === "on" ? "ON" : "OFF"}
                    </Text>
                  </View>
                </View>

                {/* TRANSMIT BUTTON */}
                <Pressable
                  style={[
                    styles.transmitButton,
                    (!morseText.trim() || isTransmitting) &&
                      styles.transmitButtonDisabled,
                  ]}
                  onPress={transmitMorse}
                  disabled={!morseText.trim() || isTransmitting}
                >
                  {isTransmitting ? (
                    <ActivityIndicator color="#111111" />
                  ) : (
                    <>
                      <Send size={20} color="#111111" />

                      <Text style={styles.transmitButtonText}>
                        TRANSMIT SIGNAL
                      </Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.flashlightScreen}>
                <View style={styles.flashlightButtonArea}>
                  {isLightOn && (
                    <View style={styles.rippleContainer}>
                      <Animated.View
                        style={[styles.ripple, getRippleStyle(ringAnim1)]}
                      />

                      <Animated.View
                        style={[styles.ripple, getRippleStyle(ringAnim2)]}
                      />

                      <Animated.View
                        style={[styles.ripple, getRippleStyle(ringAnim3)]}
                      />
                    </View>
                  )}

                  <Pressable
                    style={[
                      styles.powerButton,
                      isLightOn && styles.powerButtonActive,
                    ]}
                    onPress={() => {
                      setIsLightOn((previous) => !previous);
                    }}
                  >
                    <Power size={56} color="#1C1C1E" strokeWidth={2} />
                  </Pressable>
                </View>

                <Text style={styles.flashlightHint}>
                  Tap to {isLightOn ? "turn off" : "turn on"}
                </Text>
              </View>
            )}
          </KeyboardAvoidingView>

          {/* SLIDER */}
          {activeMode !== "morse" && (
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <View style={styles.sliderTitleRow}>
                  {activeMode === "sos" ? (
                    <Activity size={16} color="#FFC700" />
                  ) : (
                    <Lightbulb size={16} color="#FFC700" />
                  )}

                  <Text style={styles.sliderTitle}>
                    {activeMode === "sos"
                      ? "STROBE FREQUENCY"
                      : "LIGHT ANIMATION"}
                  </Text>
                </View>

                <Text style={styles.sliderValue}>
                  {activeMode === "sos"
                    ? `${getSosHz(sliderVal)} Hz`
                    : `${Math.round((sliderVal / 35) * 100)}%`}
                </Text>
              </View>

              <View
                style={styles.sliderTrack}
                onLayout={(event) => {
                  sliderWidthRef.current = event.nativeEvent.layout.width;
                }}
                {...panResponder.panHandlers}
              >
                {Array.from({
                  length: 35,
                }).map((_, index) => (
                  <View
                    key={index}
                    pointerEvents="none"
                    style={[
                      styles.sliderTick,
                      index < sliderVal && styles.sliderTickActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* BANNER */}
          <View style={styles.bannerContainer}>
            <BannerAd
              unitId={bannerAdUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/* ========================================================================= */
/*                                  STYLES                                   */
/* ========================================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  appContent: {
    flex: 1,
  },

  hiddenCamera: {
    position: "absolute",
    width: 1,
    height: 1,
  },

  centerTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },

  permissionText: {
    textAlign: "center",
    color: "#1C1C1E",
    fontSize: 15,
    marginBottom: 20,
  },

  permissionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 25,
    backgroundColor: "#FFC700",
  },

  permissionBtnText: {
    fontWeight: "700",
    color: "#111111",
  },

  /* ------------------------------- HEADER ------------------------------- */

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "#A1A1AA",
    letterSpacing: 1.6,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#18181B",
  },

  headerStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F4F4F5",
  },

  headerStatusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#71717A",
    letterSpacing: 1,
  },

  /* ---------------------------- MODE SWITCHER --------------------------- */

  modeSwitcher: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 10,
    padding: 5,
    borderRadius: 20,
    backgroundColor: "#F4F4F5",
    gap: 5,
  },

  modeButton: {
    flex: 1,
    height: 45,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  modeButtonActive: {
    backgroundColor: "#FFC700",
  },

  modeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#71717A",
  },

  modeButtonTextActive: {
    color: "#111111",
  },

  /* ------------------------------ MAIN AREA ----------------------------- */

  mainArea: {
    flex: 1,
  },

  /* --------------------------- FLASHLIGHT MODE -------------------------- */

  flashlightScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  flashlightButtonArea: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },

  rippleContainer: {
    position: "absolute",
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },

  ripple: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#FFEB60",
  },

  powerButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E5EA",
    borderWidth: 1,
    borderColor: "#D1D1D6",
  },

  powerButtonActive: {
    backgroundColor: "#FFC700",
    borderColor: "#E6B200",
    shadowColor: "#FFC700",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  flashlightHint: {
    marginTop: 16,
    fontSize: 12,
    color: "#A1A1AA",
    fontWeight: "600",
  },

  /* ------------------------------- MORSE -------------------------------- */

  morseScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },

  morseTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  morseIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFC700",
  },

  morseTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18181B",
  },

  morseSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#A1A1AA",
  },

  /* ------------------------------ DIVIDER ------------------------------- */

  divider: {
    height: 1,
    backgroundColor: "#F4F4F5",
    marginVertical: 18,
  },

  /* ----------------------------- MESSAGE -------------------------------- */

  messageCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },

  messageCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  messageLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#A1A1AA",
    letterSpacing: 1.2,
  },

  characterCounter: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A1A1AA",
  },

  morseInput: {
    marginTop: 8,
    height: 40,
    fontSize: 18,
    fontWeight: "600",
    color: "#18181B",
  },

  /* -------------------------- QUICK MESSAGES ---------------------------- */

  quickMessageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },

  quickMessageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },

  quickMessageButtonActive: {
    backgroundColor: "#FFC700",
    borderColor: "#FFC700",
  },

  quickMessageText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#71717A",
    letterSpacing: 0.5,
  },

  quickMessageTextActive: {
    color: "#111111",
  },

  /* ----------------------------- SPEED ---------------------------------- */

  speedSection: {
    paddingHorizontal: 4,
  },

  speedLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#A1A1AA",
    letterSpacing: 1.1,
    marginBottom: 10,
  },

  speedRow: {
    flexDirection: "row",
    gap: 8,
  },

  speedButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },

  speedButtonActive: {
    backgroundColor: "#FFC700",
    borderColor: "#FFC700",
  },

  speedButtonText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#71717A",
    letterSpacing: 0.4,
  },

  speedButtonTextActive: {
    color: "#111111",
  },

  /* -------------------------- TRANSLATION ------------------------------- */

  translationSection: {
    paddingHorizontal: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A1A1AA",
    letterSpacing: 1.2,
  },

  signalStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  signalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },

  signalStatusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#A1A1AA",
    letterSpacing: 0.5,
  },

  /* Naked Translation Area (No gray box) */

  nakedTranslationArea: {
    minHeight: 80,
    justifyContent: "center",
    paddingVertical: 10,
    alignItems: "center",
  },

  morseCharactersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  morseCharacter: {
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },

  morseCharacterActive: {
    backgroundColor: "#FFC700",
    borderColor: "#E6B200",
    transform: [{ scale: 1.08 }],
    shadowColor: "#FFC700",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },

  morseCharacterText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#18181B",
  },

  morseCharacterTextActive: {
    color: "#111111",
  },

  morseCodeText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#71717A",
    letterSpacing: 0.7,
  },

  morseCodeTextActive: {
    color: "#111111",
  },

  emptyTranslationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A1A1AA",
    textAlign: "center",
  },

  /* --------------------------- LIVE SIGNAL ------------------------------ */

  liveSignalArea: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  liveSignalGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#22C55E",
  },

  liveSignalCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderWidth: 2,
    borderColor: "#E4E4E7",
  },

  liveSignalCircleActive: {
    borderColor: "#22C55E",
  },

  liveSignalInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D4D4D8",
    marginBottom: 3,
  },

  liveSignalInnerOn: {
    backgroundColor: "#22C55E",
  },

  liveSignalLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#71717A",
    letterSpacing: 1,
  },

  /* ---------------------------- TRANSMIT -------------------------------- */

  transmitButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFC700",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginBottom: 20,
  },

  transmitButtonDisabled: {
    backgroundColor: "#E4E4E7",
  },

  transmitButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: 0.5,
  },

  /* ------------------------------- SLIDER ------------------------------- */

  sliderSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },

  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  sliderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sliderTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A1A1AA",
    letterSpacing: 0.8,
  },

  sliderValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#18181B",
  },

  sliderTrack: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sliderTick: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: "#E4E4E7",
  },

  sliderTickActive: {
    backgroundColor: "#FFC700",
  },

  /* ------------------------------- BANNER ------------------------------- */

  bannerContainer: {
    minHeight: 62,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F4F4F5",
  },
});
