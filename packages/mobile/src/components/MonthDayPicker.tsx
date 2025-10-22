import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

interface MonthDayPickerProps {
  visible: boolean;
  month: number; // 1-12
  day: number; // 1-31
  onConfirm: (month: number, day: number) => void;
  onCancel: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function MonthDayPicker({
  visible,
  month,
  day,
  onConfirm,
  onCancel,
}: MonthDayPickerProps) {
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedDay, setSelectedDay] = useState(day);

  useEffect(() => {
    setSelectedMonth(month);
    setSelectedDay(day);
  }, [month, day, visible]);

  const handleConfirm = () => {
    // Ensure day is valid for selected month
    const maxDay = DAYS_IN_MONTH[selectedMonth - 1];
    const validDay = selectedDay > maxDay ? maxDay : selectedDay;
    onConfirm(selectedMonth, validDay);
  };

  const maxDays = DAYS_IN_MONTH[selectedMonth - 1];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Birthday</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Month</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {MONTHS.map((monthName, index) => {
                  const monthValue = index + 1;
                  const isSelected = selectedMonth === monthValue;
                  return (
                    <TouchableOpacity
                      key={monthValue}
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => setSelectedMonth(monthValue)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected,
                        ]}
                      >
                        {monthName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Day</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((dayValue) => {
                  const isSelected = selectedDay === dayValue;
                  return (
                    <TouchableOpacity
                      key={dayValue}
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => setSelectedDay(dayValue)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected,
                        ]}
                      >
                        {dayValue}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  scrollView: {
    maxHeight: 300,
  },
  pickerItem: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: '#007AFF',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
});
