import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { format, parseISO } from 'date-fns';
import { birthdayApi } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type EditBirthdayScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'EditBirthday'
>;
type EditBirthdayScreenRouteProp = RouteProp<RootStackParamList, 'EditBirthday'>;

interface Props {
  navigation: EditBirthdayScreenNavigationProp;
  route: EditBirthdayScreenRouteProp;
}

export default function EditBirthdayScreen({ navigation, route }: Props) {
  const { birthdayId } = route.params;
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [daysBefore, setDaysBefore] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadBirthday();
  }, [birthdayId]);

  const loadBirthday = async () => {
    try {
      const birthday = await birthdayApi.getById(birthdayId);
      setName(birthday.name);
      setDate(parseISO(birthday.birthDate));
      setNotes(birthday.notes || '');
      setNotificationEnabled(birthday.notificationEnabled);
      setDaysBefore(String(birthday.notificationDaysBefore));
    } catch (error) {
      Alert.alert('Error', 'Could not load birthday');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setSaving(true);
    try {
      await birthdayApi.update(birthdayId, {
        name,
        birthDate: format(date, 'yyyy-MM-dd'),
        notes: notes || undefined,
        notificationEnabled,
        notificationDaysBefore: parseInt(daysBefore, 10) || 0,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Could not update birthday');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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
          editable={!saving}
        />

        <Text style={styles.label}>Birth Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          disabled={saving}
        >
          <Text style={styles.dateText}>{format(date, 'MMMM d, yyyy')}</Text>
        </TouchableOpacity>

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

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          editable={!saving}
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
              editable={!saving}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Update Birthday'}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
