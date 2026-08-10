import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const STORAGE_KEY = "@flashlight/rateUsState";
const ACTIVATIONS_TO_TRIGGER = 6;
const MIN_SESSIONS_TO_TRIGGER = 2;
const MAX_TIMES_SHOWN = 3;
const LATER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

const DEFAULT_STATE = {
  activationCount: 0,
  sessionCount: 0,
  timesShown: 0,
  status: "pending",
  laterAt: null,
};

export function useRateUsPrompt() {
  const [visible, setVisible] = useState(false);
  const stateRef = useRef(DEFAULT_STATE);
  const loadedRef = useRef(false);

  const persist = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      let saved = DEFAULT_STATE;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) saved = { ...DEFAULT_STATE, ...JSON.parse(raw) };
      } catch {}
      stateRef.current = { ...saved, sessionCount: saved.sessionCount + 1 };
      loadedRef.current = true;
      persist();
    })();
  }, [persist]);

  const maybeShow = useCallback(() => {
    if (!loadedRef.current) return;
    const s = stateRef.current;
    if (s.status === "answered" || s.timesShown >= MAX_TIMES_SHOWN) return;
    if (s.sessionCount < MIN_SESSIONS_TO_TRIGGER) return;
    if (s.activationCount < ACTIVATIONS_TO_TRIGGER) return;
    if (s.status === "later" && s.laterAt && Date.now() - s.laterAt < LATER_COOLDOWN_MS) {
      return;
    }

    stateRef.current = { ...s, timesShown: s.timesShown + 1 };
    persist();
    setVisible(true);
  }, [persist]);

  const recordActivation = useCallback(() => {
    if (!loadedRef.current) return;
    stateRef.current = {
      ...stateRef.current,
      activationCount: stateRef.current.activationCount + 1,
    };
    persist();
    maybeShow();
  }, [maybeShow, persist]);

  const respondRate = useCallback(async () => {
    setVisible(false);
    stateRef.current = { ...stateRef.current, status: "answered" };
    persist();
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) await StoreReview.requestReview();
    } catch {}
  }, [persist]);

  const respondLater = useCallback(() => {
    setVisible(false);
    const outOfChances = stateRef.current.timesShown >= MAX_TIMES_SHOWN;
    stateRef.current = {
      ...stateRef.current,
      status: outOfChances ? "answered" : "later",
      laterAt: Date.now(),
    };
    persist();
  }, [persist]);

  return { visible, recordActivation, respondRate, respondLater };
}
