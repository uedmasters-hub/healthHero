# Plan: Create Treat Page

## Goal
Create a new "Treat" page that matches the provided design exactly — a care management hub showing the patient's active appointment, care timeline, quick care actions, and health insights.

## Files to Create
1. **`src/components/TreatPage.jsx`** — Main component
2. **`src/components/TreatPage.css`** — Styles

## Files to Modify
1. **`src/App.jsx`** — Add `/treat` route
2. **`src/components/BottomNav.jsx`** — Update nav items to include "Treat" (replace "Doctors" with "Treat")

---

## Design Analysis (from screenshot)

### Page Structure (top to bottom)
1. **Header** — "Treat" title + "Manage your ongoing care" subtitle + search & filter icons
2. **Active Appointment Card** — Doctor info, status chip, date/time, condition, "View Care Journey" CTA + direction/phone icons
3. **Care Timeline** — Section title + filter tabs (All, Upcoming, Active, Completed, Cancelled) + appointment cards
4. **Quick Care** — Section title + card with "Download Reports" and "View Lab Results" rows + "View All" link
5. **Health Insights** — Section title (partially visible, content cut off)
6. **Bottom Nav** — Home, Treat (active), Appointments, Calendar, Profile

### Active Appointment Card
- Doctor avatar (48px, gradient bg, initial) with verified badge (blue checkmark)
- Doctor name (bold) + specialty (secondary)
- Status chip: "Appointment in 3 days" (primary bg, white text, pill shape)
- Date/time/type line: "Tue, Sep 11, 2026 · 09:30 AM · In-Person"
- Condition: "Type 2 Diabetes Management"
- "View Care Journey" primary button (full-width-ish)
- Direction icon button + Phone icon button (circular, border, to the right)

### Care Timeline Cards
Each card has:
- Doctor avatar (40px) + name + specialty
- Status badge (top-right): Upcoming (yellow), Active (blue), Completed (gray), Cancelled (gray)
- Condition title (bold)
- Date/time or completion info
- "Next: Sep 14" or "Closed" / "Archived" (right-aligned)
- Active card has blue left border + blue border outline

### Filter Tabs
- Horizontal scrollable pills
- "All" selected (primary bg, white text)
- Others: border, white bg, secondary text

### Quick Care Card
- Two rows with icons:
  - Download Reports (document icon, blue bg circle)
  - View Lab Results (lab icon, blue bg circle)
- Each has title + subtitle
- Chevron right
- "View All" link below in primary color

### Bottom Nav
- 5 items: Home, Treat (active), Appointments, Calendar, Profile
- Treat uses a stethoscope icon and is the active tab (primary pill)

---

## Component Structure

```jsx
<TreatPage>
  {/* Header */}
  <div className="treat-header">
    <h1>Treat</h1>
    <p>Manage your ongoing care</p>
    <div className="treat-header-actions">
      <button>Search</button>
      <button>Filter</button>
    </div>
  </div>

  {/* Active Appointment Card */}
  <div className="treat-active-card">
    <div className="treat-active-top">
      <Avatar /> <Name + Specialty /> <Badge />
    </div>
    <StatusChip />
    <div className="treat-active-details">date · time · type</div>
    <div className="treat-active-condition">condition</div>
    <div className="treat-active-actions">
      <button>View Care Journey</button>
      <button>Direction</button>
      <button>Phone</button>
    </div>
  </div>

  {/* Care Timeline */}
  <div className="treat-section">
    <h2>Care Timeline</h2>
    <div className="treat-filters">
      <FilterPill active /> <FilterPill /> ...
    </div>
    <div className="treat-timeline">
      {appointments.map(card => <TimelineCard />)}
    </div>
  </div>

  {/* Quick Care */}
  <div className="treat-section">
    <h2>Quick Care</h2>
    <div className="treat-quick-card">
      <QuickRow icon title subtitle />
      <QuickRow icon title subtitle />
    </div>
    <button>View All</button>
  </div>

  {/* Health Insights */}
  <div className="treat-section">
    <h2>Health Insights</h2>
    {/* placeholder for now */}
  </div>

  <BottomNav />
</TreatPage>
```

---

## Mock Data

### Active Appointment
```js
{
  doctor: { name: 'Chris Glasser', specialty: 'Endocrinologist', initial: 'C', color: '#5B5FC6' },
  statusChip: 'Appointment in 3 days',
  date: 'Tue, Sep 11, 2026',
  time: '09:30 AM',
  type: 'In-Person',
  condition: 'Type 2 Diabetes Management',
}
```

### Care Timeline
```js
[
  { doctor: { name: 'Sarah Mitchell', specialty: 'Endocrinologist', initial: 'S', color: '#10B981' }, status: 'Upcoming', condition: 'Type 2 Diabetes - Follow-up', date: 'Sep 14, 2026 · 10:00 AM', next: 'Sep 14' },
  { doctor: { name: 'James Carter', specialty: 'Cardiologist', initial: 'J', color: '#3B5BDB' }, status: 'Active', condition: 'Hypertension Management', detail: 'Lisinopril 10mg', next: 'Sep 15, 2026' },
  { doctor: { name: 'Priya Sharma', specialty: 'Dermatologist', initial: 'P', color: '#8B5CF6' }, status: 'Completed', condition: 'Eczema Treatment', date: 'Completed Aug 28, 2026', next: 'Closed' },
  { doctor: { name: 'Ananya Rao', specialty: 'Ophthalmologist', initial: 'A', color: '#EC4899' }, status: 'Cancelled', condition: 'Vision Screening', date: 'Cancelled Jul 5, 2026', next: 'Archived' },
]
```

### Quick Care
```js
[
  { icon: 'document', title: 'Download Reports', subtitle: 'All medical summary documents' },
  { icon: 'lab', title: 'View Lab Results', subtitle: 'Blood tests, metabolic panels, and more' },
]
```

---

## Implementation Steps

1. Create `TreatPage.jsx` with all sections and mock data
2. Create `TreatPage.css` with styles matching the design
3. Add `/treat` route to `App.jsx`
4. Update `BottomNav.jsx` to replace "Doctors" with "Treat" (stethoscope icon)
5. Build and verify
