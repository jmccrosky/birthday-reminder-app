import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { format } from 'date-fns';
import { birthdayApi } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import MonthDayPicker from '../components/MonthDayPicker';

type AddBirthdayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddBirthday'>;

interface Props {
  navigation: AddBirthdayScreenNavigationProp;
}

export default function AddBirthdayScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [daysBefore, setDaysBefore] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [yearUnknown, setYearUnknown] = useState(false);

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setLoading(true);
    try {
      await birthdayApi.create({
        name,
        birthMonth: date.getMonth() + 1, // 1-12
        birthDay: date.getDate(), // 1-31
        birthYear: yearUnknown ? null : date.getFullYear(),
        notes: notes || undefined,
        notificationEnabled,
        notificationDaysBefore: parseInt(daysBefore, 10) || 0,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Could not add birthday');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>I don't know the birth year</Text>
          <Switch value={yearUnknown} onValueChange={setYearUnknown} />
        </View>

        <Text style={styles.label}>Birth Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          disabled={loading}
        >
          <Text style={styles.dateText}>
            {yearUnknown ? format(date, 'MMMM d') : format(date, 'MMMM d, yyyy')}
          </Text>
        </TouchableOpacity>

        {yearUnknown ? (
          <MonthDayPicker
            visible={showDatePicker}
            month={date.getMonth() + 1}
            day={date.getDate()}
            onConfirm={(month, day) => {
              setShowDatePicker(false);
              const newDate = new Date(date);
              newDate.setMonth(month - 1);
              newDate.setDate(day);
              setDate(newDate);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        ) : (
          <DatePicker
            modal
            open={showDatePicker}
            date={date}
            mode="date"
            onConfirm={(selectedDate) => {
              setShowDatePicker(false);
              setDate(selectedDate);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        )}

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          editable={!loading}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable Notifications</Text>
          <Switch value={notificationEnabled} onValueChange={setNotificationEnabled} />
        </View>

        {notificationEnabled && (
          <>
            <Text style={styles.label}>Notify Days Before</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={daysBefore}
              onChangeText={setDaysBefore}
              keyboardType="number-pad"
              editable={!loading}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Birthday'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
