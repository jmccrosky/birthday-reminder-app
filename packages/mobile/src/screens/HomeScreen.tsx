import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { birthdayApi, Birthday } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useFocusEffect } from '@react-navigation/native';
import {
  groupBirthdaysBySection,
  BirthdaySection,
  BirthdayWithNextDate,
  formatDaysUntil,
} from '../utils/birthdayCalculations';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [sections, setSections] = useState<BirthdaySection[]>([]);
  const [loading, setLoading] = useState(false);
  const { logout, token } = useAuth();

  const loadBirthdays = async () => {
    if (!token) return; // Don't load if no token yet

    setLoading(true);
    try {
      const data = await birthdayApi.getAll();
      setBirthdays(data);
      // Group birthdays into sections
      const grouped = groupBirthdaysBySection(data);
      setSections(grouped);
    } catch (error) {
      Alert.alert('Error', 'Could not load birthdays');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBirthdays();
    }, [token])
  );

  const handleDelete = async (id: string, name: string) => {
    Alert.alert('Delete Birthday', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await birthdayApi.delete(id);
            const updatedBirthdays = birthdays.filter((b) => b.id !== id);
            setBirthdays(updatedBirthdays);
            // Re-group after deletion
            const grouped = groupBirthdaysBySection(updatedBirthdays);
            setSections(grouped);
          } catch (error) {
            Alert.alert('Error', 'Could not delete birthday');
          }
        },
      },
    ]);
  };

  const renderBirthday = ({ item }: { item: BirthdayWithNextDate }) => {
    // Reconstruct date for display
    const year = item.birthYear || new Date().getFullYear();
    const dateObj = new Date(year, item.birthMonth - 1, item.birthDay);

    const dateDisplay = item.birthYear
      ? format(dateObj, 'MMMM d, yyyy')
      : format(dateObj, 'MMMM d');

    // Calculate age if year is known
    const age = item.birthYear ? new Date().getFullYear() - item.birthYear : null;
    const ageDisplay = age !== null ? ` (${age} years old)` : '';

    // Format days until text
    const daysUntilText = formatDaysUntil(item.daysUntil);

    return (
      <TouchableOpacity
        style={styles.birthdayCard}
        onPress={() => navigation.navigate('EditBirthday', { birthdayId: item.id })}
        onLongPress={() => handleDelete(item.id, item.name)}
      >
        <View style={styles.birthdayInfo}>
          <View style={styles.birthdayHeader}>
            <Text style={styles.birthdayName}>{item.name}</Text>
            <Text style={[
              styles.daysUntil,
              item.daysUntil === 0 && styles.daysUntilToday
            ]}>
              {daysUntilText}
            </Text>
          </View>
          <Text style={styles.birthdayDate}>
            {dateDisplay}{ageDisplay}
          </Text>
          {item.notes && <Text style={styles.birthdayNotes}>{item.notes}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: BirthdaySection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('AddBirthday')}>
            <Text style={styles.headerButton}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.headerButton}>Logout</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {birthdays.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No birthdays yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddBirthday')}
          >
            <Text style={styles.addButtonText}>Add Your First Birthday</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderBirthday}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={true}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBirthdays} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
    marginHorizontal: 10,
  },
  logoutButton: {
    marginLeft: 5,
  },
  list: {
    padding: 15,
  },
  birthdayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  birthdayInfo: {
    flex: 1,
  },
  birthdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  birthdayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  daysUntil: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 10,
  },
  daysUntilToday: {
    color: '#FF3B30',
    fontSize: 15,
  },
  birthdayDate: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 5,
  },
  birthdayNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    paddingHorizontal: 30,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
