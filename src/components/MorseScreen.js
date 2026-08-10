import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Send } from "lucide-react-native";
import {
  QUICK_MESSAGES,
  MORSE_SPEEDS,
  MAX_MORSE_LENGTH,
} from "../constants/morseData";
import { styles } from "../styles/globalStyles";

export default function MorseScreen({
  morseText,
  setMorseText,
  isTransmitting,
  morseSpeed,
  setMorseSpeed,
  transmitMorse,
  morseCharacters,
  currentMorseIndex,
  currentMorseState,
  morseSequenceRef,
  liveGlow,
}) {
  return (
    <ScrollView style={styles.morseScreen} showsVerticalScrollIndicator={false}>
      {/* MESSAGE CARD */}
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
            if (!isTransmitting && text.length <= MAX_MORSE_LENGTH)
              setMorseText(text);
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
              onPress={() => !isTransmitting && setMorseText(msg.id)}
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

      {/* SPEED SECTION */}
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
                  morseSpeed === speed && styles.speedButtonTextActive,
                ]}
              >
                {MORSE_SPEEDS[speed].label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {/* TRANSLATION SECTION */}
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
            <Text style={styles.transmitButtonText}>TRANSMIT SIGNAL</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
