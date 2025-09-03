// app/admin/upload-users/page.tsx
import TopicsSection from '../../components/TopicsSection';
import UsersSection from '../../components/UsersSection';
import RoomsSection from '../../components/RoomsSection';
import TimeSlotSection from '../../components/TimeSlotSection';
import ConstraintsSection from '../../components/ConstraintsSection';
import GenerateScheduleButton from '../../components/GenerateScheduleButton';





export default function UploadHubPage() {
  return (
    <main style={pageStyles.page}>
      {/* USERS */}
      <UsersSection />

      <div style={{ height: 24 }} />

      {/* TOPICS */}
      <TopicsSection />

      <div style={{ height: 24 }} />

      {/* Rooms */}
      <RoomsSection />

      <div style={{ height: 24 }} />

      {/* Rooms */}
      <TimeSlotSection />
      <div style={{ height: 24 }} />

      {/* Rooms */}
      <ConstraintsSection />
      <div style={{ height: 24 }} />

      {/* Rooms */}
      <GenerateScheduleButton />
    </main>
    
    
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f5f7fb', padding: '24px 0' },
};
