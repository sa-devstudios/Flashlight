import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { styles } from "../styles/globalStyles";

export default function RateUsModal({ visible, onRate, onLater }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onLater}
    >
      <View style={styles.rateUsBackdrop}>
        <View style={styles.rateUsCard}>
          <View style={styles.rateUsIconCircle}>
            <Star size={26} color="#111111" fill="#FFC700" />
          </View>
          <Text style={styles.rateUsTitle}>Enjoying Flashlight?</Text>
          <Text style={styles.rateUsSubtitle}>
            A quick rating helps us keep improving the app and reach more
            people.
          </Text>
          <Pressable style={styles.rateUsPrimaryBtn} onPress={onRate}>
            <Text style={styles.rateUsPrimaryBtnText}>Yes, rate it</Text>
          </Pressable>
          <Pressable style={styles.rateUsSecondaryBtn} onPress={onLater}>
            <Text style={styles.rateUsSecondaryBtnText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
