import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  Activity,
  Circle,
  Lightbulb,
  Sparkles,
  Zap,
} from "lucide-react-native";
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
} from "react-native-google-mobile-ads";

import {
  MORSE_CODE,
  MORSE_SPEEDS,
  bannerAdUnitId,
  interstitialAdUnitId,
  BASE_DOT_DURATION,
} from "./src/constants/morseData";
import { styles } from "./src/styles/globalStyles";
import FlashlightScreen from "./src/components/FlashlightScreen";
import MorseScreen from "./src/components/MorseScreen";
import RateUsModal from "./src/components/RateUsModal";
import { useRateUsPrompt } from "./src/hooks/useRateUsPrompt";

const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState("torch");
  const [isLightOn, setIsLightOn] = useState(false);
  const [hardwareTorch, setHardwareTorch] = useState(false);
  const [sliderVal, setSliderVal] = useState(18);
  const sliderWidthRef = useRef(0);

  const [morseText, setMorseText] = useState("");
  const [morseSpeed, setMorseSpeed] = useState("normal");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentMorseIndex, setCurrentMorseIndex] = useState(-1);
  const [currentMorseState, setCurrentMorseState] = useState("off");
  const morseSequenceRef = useRef([]);

  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const pendingMorseModeRef = useRef(false);

  const {
    visible: rateUsVisible,
    recordActivation,
    respondRate,
    respondLater,
  } = useRateUsPrompt();

  const timeoutRefs = useRef([]);
  const sosIntervalRef = useRef(null);

  const ringAnim1 = useRef(new Animated.Value(0)).current;
  const ringAnim2 = useRef(new Animated.Value(0)).current;
  const ringAnim3 = useRef(new Animated.Value(0)).current;
  const rippleLoopsRef = useRef([]);

  const morsePulse = useRef(new Animated.Value(0)).current;
  const liveGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setInterstitialLoaded(true);
        if (pendingMorseModeRef.current) interstitial.show();
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

  const stopRippleAnimation = useCallback(() => {
    rippleLoopsRef.current.forEach((loop) => loop?.stop?.());
    rippleLoopsRef.current = [];
    ringAnim1.stopAnimation();
    ringAnim2.stopAnimation();
    ringAnim3.stopAnimation();
    ringAnim1.setValue(0);
    ringAnim2.setValue(0);
    ringAnim3.setValue(0);
  }, [ringAnim1, ringAnim2, ringAnim3]);

  const startRippleAnimation = useCallback(() => {
    stopRippleAnimation();
    const intensity = sliderVal / 35;
    const duration = 2800 - intensity * 1800;

    const createLoop = (anim, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      );

    const loop1 = createLoop(ringAnim1);
    const loop2 = createLoop(ringAnim2, duration / 3);
    const loop3 = createLoop(ringAnim3, (duration / 3) * 2);

    rippleLoopsRef.current = [loop1, loop2, loop3];
    loop1.start();
    loop2.start();
    loop3.start();
  }, [sliderVal, ringAnim1, ringAnim2, ringAnim3, stopRippleAnimation]);

  useEffect(() => {
    if (isLightOn && (activeMode === "torch" || activeMode === "sos")) {
      startRippleAnimation();
    } else {
      stopRippleAnimation();
    }
    return stopRippleAnimation;
  }, [
    isLightOn,
    activeMode,
    sliderVal,
    startRippleAnimation,
    stopRippleAnimation,
  ]);

  useEffect(() => {
    clearInterval(sosIntervalRef.current);

    if (activeMode === "morse" || !isLightOn) {
      setHardwareTorch(false);
      return;
    }

    if (activeMode === "torch") {
      setHardwareTorch(true);
      return;
    }

    if (activeMode === "sos") {
      const delay = Math.max(80, 600 - sliderVal * 14);
      let state = true;
      setHardwareTorch(true);

      sosIntervalRef.current = setInterval(() => {
        state = !state;
        setHardwareTorch(state);
      }, delay);
    }

    return () => clearInterval(sosIntervalRef.current);
  }, [activeMode, isLightOn, sliderVal]);

  const toggleLight = useCallback(() => {
    setIsLightOn((prev) => {
      const next = !prev;
      if (next) recordActivation();
      return next;
    });
  }, [recordActivation]);

  const updateSliderFromTouch = useCallback((event) => {
    if (!sliderWidthRef.current) return;
    const x = event.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, x / sliderWidthRef.current));
    const value = Math.max(1, Math.min(35, Math.round(percentage * 35)));
    setSliderVal(value);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: updateSliderFromTouch,
        onPanResponderMove: updateSliderFromTouch,
      }),
    [updateSliderFromTouch],
  );

  const createMorseSequence = useCallback(
    (text) => {
      const sequence = [];
      const normalizedText = text.toUpperCase().slice(0, 20);
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
        if (!code) continue;

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
    },
    [morseSpeed],
  );

  const stopMorseTransmission = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    setHardwareTorch(false);
    setIsTransmitting(false);
    setCurrentMorseIndex(-1);
    setCurrentMorseState("off");
    morseSequenceRef.current = [];
  }, []);

  const transmitMorse = useCallback(() => {
    if (isTransmitting) return;
    const cleanText = morseText.trim();
    if (!cleanText) return;

    const sequence = createMorseSequence(cleanText);
    if (!sequence.length) return;

    stopMorseTransmission();
    setIsTransmitting(true);
    recordActivation();
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
      setCurrentMorseState("off");
    }, elapsed);

    timeoutRefs.current.push(finishTimeout);
  }, [
    isTransmitting,
    morseText,
    createMorseSequence,
    stopMorseTransmission,
    morsePulse,
    recordActivation,
  ]);

  const morseCharacters = useMemo(() => {
    const text = morseText.toUpperCase().slice(0, 20);
    return text.split("").map((character, index) => ({
      character,
      code: MORSE_CODE[character] || "?",
      index,
    }));
  }, [morseText]);

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
    return () => animation.stop();
  }, [isTransmitting, liveGlow]);

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
          Camera and flashlight permission is required.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

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
              onPress={() => setActiveMode("torch")}
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
              onPress={() => {
                if (interstitialLoaded) {
                  pendingMorseModeRef.current = true;
                  interstitial.show();
                } else {
                  pendingMorseModeRef.current = true;
                  interstitial.load();
                }
              }}
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

          {/* MAIN CONTAINER */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.mainArea}
          >
            {activeMode === "morse" ? (
              <MorseScreen
                morseText={morseText}
                setMorseText={setMorseText}
                isTransmitting={isTransmitting}
                morseSpeed={morseSpeed}
                setMorseSpeed={setMorseSpeed}
                transmitMorse={transmitMorse}
                morseCharacters={morseCharacters}
                currentMorseIndex={currentMorseIndex}
                currentMorseState={currentMorseState}
                morseSequenceRef={morseSequenceRef}
                liveGlow={liveGlow}
              />
            ) : (
              <FlashlightScreen
                isLightOn={isLightOn}
                toggleLight={toggleLight}
                ringAnim1={ringAnim1}
                ringAnim2={ringAnim2}
                ringAnim3={ringAnim3}
                sliderVal={sliderVal}
              />
            )}
          </KeyboardAvoidingView>

          {/* SLIDER SECTION */}
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
                    ? `${(1000 / (Math.max(80, 600 - sliderVal * 14) * 2)).toFixed(1)} Hz`
                    : `${Math.round((sliderVal / 35) * 100)}%`}
                </Text>
              </View>
              <View
                style={styles.sliderTrack}
                onLayout={(e) => {
                  sliderWidthRef.current = e.nativeEvent.layout.width;
                }}
                {...panResponder.panHandlers}
              >
                {Array.from({ length: 35 }).map((_, index) => (
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

          {/* BANNER AD */}
          <View style={styles.bannerContainer}>
            <BannerAd
              unitId={bannerAdUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
          </View>
        </View>

        <RateUsModal
          visible={rateUsVisible}
          onRate={respondRate}
          onLater={respondLater}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
