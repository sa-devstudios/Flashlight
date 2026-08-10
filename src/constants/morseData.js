import { Hand, Check, AlertTriangle, LifeBuoy } from "lucide-react-native";
import { TestIds } from "react-native-google-mobile-ads";

export const MORSE_CODE = {
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

export const MAX_MORSE_LENGTH = 20;
export const BASE_DOT_DURATION = 180;

export const MORSE_SPEEDS = {
  slow: { label: "SLOW", multiplier: 1.8 },
  normal: { label: "NORMAL", multiplier: 1 },
  fast: { label: "FAST", multiplier: 0.55 },
};

export const QUICK_MESSAGES = [
  { id: "HELLO", icon: Hand },
  { id: "OK", icon: Check },
  { id: "SOS", icon: AlertTriangle },
  { id: "HELP", icon: LifeBuoy },
];

export const bannerAdUnitId = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-9085829824359714/7713067504";
export const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-9085829824359714/6399985830";
