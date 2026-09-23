import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function ProfileHubPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Profile Hub</div>
        <h1 className="ds-page-title">Profile Hub</h1>
        <p className="ds-page-description">
          Patient profile management with workspace-based navigation — personal details, medical
          history, records, insurance, and support.
        </p>
      </div>

      <Section title="Overview">
        <p>
          The Profile Hub is a comprehensive patient profile system organized into workspaces.
          Each workspace is a separate route under <code>/profile</code> and contains a
          <code>WorkspaceHeader</code> with a cover image and avatar, plus workspace-specific content.
        </p>
      </Section>

      <Section title="Workspaces">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, margin: '0 0 24px' }}>
          {[
            { icon: '👤', label: 'Personal', route: '/profile', desc: 'Name, gender, blood group, height, weight' },
            { icon: '🏥', label: 'Medical', route: '/profile/medical', desc: 'Allergies, conditions, medications, lifestyle' },
            { icon: '📋', label: 'Records', route: '/profile/records', desc: 'Medical records, reports, images' },
            { icon: '🛡️', label: 'Insurance', route: '/profile/insurance', desc: 'Insurance provider and policy details' },
            { icon: '💬', label: 'Support', route: '/profile/support', desc: 'Help center, FAQs, contact support' },
          ].map((ws) => (
            <div key={ws.route} style={{ padding: 16, background: 'white', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{ws.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{ws.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{ws.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontFamily: 'monospace' }}>{ws.route}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Route structure">
        <CodeBlock title="Router config (App.jsx)" code={`<Route path="/profile" element={<PatientProfile />}>
  <Route index element={<PersonalWorkspace />} />
  <Route path="medical" element={<MedicalWorkspace />} />
  <Route path="records" element={<RecordsWorkspace />} />
  <Route path="insurance" element={<InsuranceWorkspace />} />
  <Route path="support" element={<SupportWorkspace />} />
</Route>`} />
      </Section>

      <Section title="WorkspaceHeader">
        <p>
          Each workspace starts with a <code>WorkspaceHeader</code> containing a cover image,
          back button, avatar, workspace title, and description. This creates visual consistency
          across all profile workspaces.
        </p>
        <CodeBlock title="WorkspaceHeader structure" code={`<div className="profile-workspace-header">
  <div className="profile-workspace-cover" style={{ backgroundImage: \`url(\${coverUrl})\` }}>
    <button className="profile-workspace-back" aria-label="Back">
      <BackIcon />
    </button>
  </div>
  <div className="profile-workspace-avatar-row">
    <img className="profile-workspace-avatar" src={avatar} />
    <div className="profile-workspace-info">
      <h1 className="profile-workspace-name">{name}</h1>
      <p className="profile-workspace-meta">{meta}</p>
    </div>
  </div>
</div>`} />
      </Section>

      <Section title="PersonalWorkspace">
        <p>
          Displays personal details as editable rows. Fields include First Name, Last Name,
          Gender, Date of Birth, Blood Group, Height, Weight, and About Me. Each row has
          a label, value, and edit icon. Uses bottom sheets for editing.
        </p>
      </Section>

      <Section title="MedicalWorkspace">
        <p>
          Organized into sections: Medical Conditions, Current Medications, Allergies,
          Lifestyle (tobacco, alcohol, occupation). Each section is a list of tags with
          an "Add" button. Uses <code>AppBottomSheet</code> with single/multi-select.
        </p>
      </Section>

      <Section title="RecordsWorkspace">
        <p>
          Displays medical records organized by type (investigation, discharge_summary, prescription).
          Records are filterable by type using chip selectors. Each record is a tappable card
          that opens a detail view.
        </p>
      </Section>

      <Section title="InsuranceWorkspace">
        <p>
          Shows insurance provider, policy number, and member details. Supports adding
          new insurance with a multi-step form. Insurance cards are displayed with provider logos.
        </p>
      </Section>

      <Section title="SupportWorkspace">
        <p>
          Displays FAQs organized by category, support contact options, and emergency numbers.
          FAQs expand on tap with animated chevron rotation.
        </p>
      </Section>

      <Section title="Tokens used">
        <TokenTable tokens={[
          { token: '--space-4', value: '16px', usage: 'Workspace section padding' },
          { token: '--space-8', value: '32px', usage: 'Workspace horizontal padding' },
          { token: '--text-title-lg-size', value: '20px', usage: 'Workspace name font size' },
          { token: '--text-title-size', value: '16px', usage: 'Section title font size' },
          { token: '--text-body-size', value: '14px', usage: 'Row value font size' },
          { token: '--text-body-sm-size', value: '13px', usage: 'Row label font size' },
          { token: '--text-faint', value: '#9CA3AF', usage: 'Placeholder text color' },
          { token: '--icon-btn-size', value: '44px', usage: 'Row edit icon touch target' },
        ]} />
      </Section>

      <DoDont
        dos={[
          'Use the WorkspaceHeader consistently across all workspaces. This creates visual continuity.',
          'Group related fields into sections. Don\'t list every field in one flat list.',
          'Use bottom sheets for editing fields. This keeps the workspace as a read-only overview.',
        ]}
        donts={[
          'Mix editing and viewing modes in the same view. Keep it clean — read by default, edit via bottom sheet.',
          'Use different header styles for different workspaces. Consistency is key.',
          'Show all records at once. Use filters and pagination.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Bottom Sheets', path: '/design/rovo-ui/overlay-system' },
        { label: 'Cards', path: '/design/components/cards' },
        { label: 'Buttons', path: '/design/components/buttons' },
      ]} />
    </>
  )
}
