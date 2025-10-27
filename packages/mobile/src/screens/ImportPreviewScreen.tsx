import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { parseCSV, ParsedBirthday, formatBirthday } from '../utils/csvParser';
import { getPendingImport, clearPendingImport } from '../utils/sharedStorage';
import { birthdayApi, Birthday } from '../services/api';

type ImportPreviewScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ImportPreview'
>;

interface Props {
  navigation: ImportPreviewScreenNavigationProp;
}

interface ImportResult {
  imported: ParsedBirthday[];
  skipped: ParsedBirthday[];
  errors: { line: number; error: string }[];
}

export default function ImportPreviewScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedBirthdays, setParsedBirthdays] = useState<ParsedBirthday[]>([]);
  const [parseErrors, setParseErrors] = useState<{ line: number; error: string }[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    loadPendingImport();
  }, []);

  const loadPendingImport = async () => {
    try {
      const pendingImport = await getPendingImport();

      if (!pendingImport) {
        Alert.alert('No Import Data', 'No CSV file to import was found.');
        navigation.goBack();
        return;
      }

      setFileName(pendingImport.fileName);

      // Parse the CSV
      const parseResult = parseCSV(pendingImport.csvContent);
      setParsedBirthdays(parseResult.valid);
      setParseErrors(parseResult.errors);
    } catch (error) {
      console.error('Error loading import:', error);
      Alert.alert('Error', 'Failed to load import data');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);

    try {
      // Get existing birthdays to check for duplicates
      const existingBirthdays = await birthdayApi.getAll();

      const imported: ParsedBirthday[] = [];
      const skipped: ParsedBirthday[] = [];

      // Process each parsed birthday
      for (const parsed of parsedBirthdays) {
        // Combine firstName and lastName for the name field
        const fullName = parsed.lastName
          ? `${parsed.firstName} ${parsed.lastName}`
          : parsed.firstName;

        // Check if duplicate exists (same name)
        const isDuplicate = existingBirthdays.some(
          (existing) => existing.name.toLowerCase() === fullName.toLowerCase()
        );

        if (isDuplicate) {
          skipped.push(parsed);
          continue;
        }

        // Create the birthday
        try {
          await birthdayApi.create({
            name: fullName,
            birthMonth: parsed.birthMonth,
            birthDay: parsed.birthDay,
            birthYear: parsed.birthYear,
            notificationEnabled: true,
            notificationDaysBefore: 0,
          });
          imported.push(parsed);
        } catch (error) {
          console.error(`Error creating birthday for ${fullName}:`, error);
          skipped.push(parsed);
        }
      }

      // Clear the pending import
      await clearPendingImport();

      // Show results
      setResult({
        imported,
        skipped,
        errors: parseErrors,
      });
    } catch (error) {
      console.error('Error during import:', error);
      Alert.alert('Import Failed', 'An error occurred during the import process');
    } finally {
      setImporting(false);
    }
  };

  const handleDone = () => {
    navigation.navigate('Home');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading import data...</Text>
      </View>
    );
  }

  if (result) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.title}>Import Complete</Text>
          <Text style={styles.subtitle}>From: {fileName}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Successfully Imported:</Text>
            <Text style={[styles.summaryValue, styles.successText]}>
              {result.imported.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Skipped (Duplicates):</Text>
            <Text style={[styles.summaryValue, styles.warningText]}>
              {result.skipped.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Errors:</Text>
            <Text style={[styles.summaryValue, styles.errorText]}>
              {result.errors.length}
            </Text>
          </View>
        </View>

        {result.imported.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imported Birthdays</Text>
            {result.imported.map((birthday) => (
              <View key={birthday.originalLine} style={styles.itemCard}>
                <Text style={styles.itemName}>
                  {birthday.firstName} {birthday.lastName}
                </Text>
                <Text style={styles.itemDate}>{formatBirthday(birthday)}</Text>
              </View>
            ))}
          </View>
        )}

        {result.skipped.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skipped (Already Exists)</Text>
            {result.skipped.map((birthday) => (
              <View key={birthday.originalLine} style={styles.itemCard}>
                <Text style={styles.itemName}>
                  {birthday.firstName} {birthday.lastName}
                </Text>
                <Text style={styles.itemDate}>{formatBirthday(birthday)}</Text>
              </View>
            ))}
          </View>
        )}

        {result.errors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Errors</Text>
            {result.errors.map((error) => (
              <View key={error.line} style={[styles.itemCard, styles.errorCard]}>
                <Text style={styles.errorLabel}>Line {error.line}:</Text>
                <Text style={styles.errorMessage}>{error.error}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Import Birthdays</Text>
        <Text style={styles.subtitle}>From: {fileName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Valid Entries:</Text>
          <Text style={[styles.summaryValue, styles.successText]}>
            {parsedBirthdays.length}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Errors:</Text>
          <Text style={[styles.summaryValue, styles.errorText]}>
            {parseErrors.length}
          </Text>
        </View>
      </View>

      <Text style={styles.infoText}>
        Birthdays will be checked for duplicates. Existing names will be skipped.
      </Text>

      {parsedBirthdays.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Preview ({parsedBirthdays.length} birthdays)
          </Text>
          {parsedBirthdays.slice(0, 10).map((birthday) => (
            <View key={birthday.originalLine} style={styles.itemCard}>
              <Text style={styles.itemName}>
                {birthday.firstName} {birthday.lastName}
              </Text>
              <Text style={styles.itemDate}>{formatBirthday(birthday)}</Text>
            </View>
          ))}
          {parsedBirthdays.length > 10 && (
            <Text style={styles.moreText}>
              ...and {parsedBirthdays.length - 10} more
            </Text>
          )}
        </View>
      )}

      {parseErrors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Errors ({parseErrors.length})</Text>
          <Text style={styles.errorInfo}>
            These rows will be skipped during import
          </Text>
          {parseErrors.slice(0, 5).map((error) => (
            <View key={error.line} style={[styles.itemCard, styles.errorCard]}>
              <Text style={styles.errorLabel}>Line {error.line}:</Text>
              <Text style={styles.errorMessage}>{error.error}</Text>
            </View>
          ))}
          {parseErrors.length > 5 && (
            <Text style={styles.moreText}>
              ...and {parseErrors.length - 5} more errors
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.importButton, importing && styles.importButtonDisabled]}
        onPress={handleImport}
        disabled={importing || parsedBirthdays.length === 0}
      >
        {importing ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.importButtonText}>
            Import {parsedBirthdays.length} Birthdays
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleDone}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultHeader: {
    padding: 20,
    backgroundColor: '#4CAF50',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  successText: {
    color: '#4CAF50',
  },
  warningText: {
    color: '#FF9800',
  },
  errorText: {
    color: '#F44336',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
  },
  errorInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
  },
  moreText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  importButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  importButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  doneButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginVertical: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
