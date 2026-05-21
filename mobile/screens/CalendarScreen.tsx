import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { AppointmentsProvider, useAppointments } from '../contexts/AppointmentsContext';
import CalendarHeader from '../components/calendar/CalendarHeader';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import AppointmentDetailsModal from '../components/modals/AppointmentDetailsModal';
import DatePickerModal from '../components/modals/DatePickerModal';
import { Appointment } from '../types/appointment';

function CalendarContent() {
  const { viewMode, selectedDate, setSelectedDate } = useAppointments();
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <CalendarHeader onOpenDatePicker={() => setShowDatePicker(true)} />

      <View style={styles.body}>
        {viewMode === 'day' ? (
          <DayView onPressAppointment={setSelectedApt} />
        ) : (
          <WeekView onPressAppointment={setSelectedApt} />
        )}
      </View>

      <AppointmentDetailsModal
        apt={selectedApt}
        onClose={() => setSelectedApt(null)}
      />

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

export default function CalendarScreen() {
  return (
    <AppointmentsProvider>
      <CalendarContent />
    </AppointmentsProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  body: { flex: 1 },
});
