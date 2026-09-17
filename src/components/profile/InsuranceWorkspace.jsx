import { useRef, useState } from 'react'
import { displayHealthDate, useUser } from '../../user'
import { ProfileSheets } from './ProfileHealth'
import { GuidedEmpty, InfoCard, InfoRow, ProfilePage, SectionHead } from './ProfileChrome'
import RevealItem from '../RevealItem'

export default function InsuranceWorkspace() {
  const { insurancePolicies, saveInsurancePolicy } = useUser()
  const [sheet, setSheet] = useState(null)
  const fileRef = useRef(null)
  const policy = insurancePolicies[0] || null

  const addDocument = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !policy) return
    saveInsurancePolicy({
      ...policy,
      attachments: [...(policy.attachments || []), file.name],
    })
  }

  return (
    <ProfilePage title="Insurance" dataset="profile-insurance">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            {policy ? (
              <div className="ins-hero">
                <p>Active cover</p>
                <h2>{policy.provider}</h2>
                <strong>{policy.policyNo}</strong>
                <div className="ins-hero-meta">
                  <span>{policy.type || 'Health'}</span>
                  <span>{policy.validTill ? `Valid till ${displayHealthDate(policy.validTill) || policy.validTill}` : 'Add expiry'}</span>
                </div>
              </div>
            ) : (
              <GuidedEmpty
                title="Add your health insurance"
                body="Policy details stay on your profile so clinics can use them at check-in."
                cta="Add policy"
                onClick={() => setSheet({ mode: 'form', kind: 'insurancePolicies', item: null })}
              />
            )}
          </RevealItem>

          {policy ? (
            <RevealItem className="user-profile-section" revealed={isRevealed(1)} cached={isCached} ref={setItemRef(1)}>
              <SectionHead title="Policy details" action="Edit" onAction={() => setSheet({ mode: 'form', kind: 'insurancePolicies', item: policy })} />
              <InfoCard>
                <InfoRow label="Provider" value={policy.provider} />
                <InfoRow label="Policy no." value={policy.policyNo} />
                <InfoRow label="Type" value={policy.type} />
                <InfoRow label="Valid till" value={displayHealthDate(policy.validTill) || policy.validTill} emptyLabel="Add expiry date" />
              </InfoCard>
            </RevealItem>
          ) : null}

          <RevealItem className="user-profile-section" revealed={isRevealed(2)} cached={isCached} ref={setItemRef(2)}>
            <SectionHead title="Coverage" action={policy ? 'Replace' : null} onAction={() => setSheet({ mode: 'form', kind: 'insurancePolicies', item: policy })} />
            {policy ? (
              <div className="ins-coverage">
                <p>{policy.coverage || 'In-patient, day care, and cashless treatment as per your policy network. Add notes while editing the policy if you want specifics on file.'}</p>
              </div>
            ) : (
              <GuidedEmpty title="Coverage appears after a policy is saved" />
            )}
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(3)} cached={isCached} ref={setItemRef(3)}>
            <SectionHead
              title="Documents"
              action={policy ? 'Add' : null}
              onAction={() => fileRef.current?.click()}
            />
            {policy?.attachments?.length ? (
              <div className="ins-docs">
                {policy.attachments.map((name) => (
                  <div key={name} className="ins-doc-row">{name}</div>
                ))}
              </div>
            ) : (
              <GuidedEmpty
                title="Keep e-cards and policy PDFs here"
                body="Upload from this device. Files are saved to your insurance profile."
                cta={policy ? 'Add document' : null}
                onClick={() => fileRef.current?.click()}
              />
            )}
            <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" onChange={addDocument} />
          </RevealItem>

          <RevealItem className="user-profile-section" revealed={isRevealed(4)} cached={isCached} ref={setItemRef(4)}>
            <SectionHead title="Claims" />
            <GuidedEmpty
              title="No claims yet"
              body="When claims support goes live, you will track status here without leaving your profile."
            />
          </RevealItem>

          <ProfileSheets sheet={sheet} setSheet={setSheet} />
        </>
      )}
    </ProfilePage>
  )
}
