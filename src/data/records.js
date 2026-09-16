export const medicalRecords = {
  consultations: [
    { id: 'c1', title: 'General Checkup', date: '15 Sep 2026', doctor: 'Dr. Arun Iyer', details: 'Routine annual checkup. All vitals normal. Recommended regular exercise and a balanced diet.', attachments: ['Checkup_Summary.pdf'] },
    { id: 'c2', title: 'Follow-up Visit', date: '20 Aug 2026', doctor: 'Dr. Arjun Mehta', details: 'Follow-up for blood pressure monitoring. BP stable at 120/80.', attachments: ['BP_Report.pdf'] },
    { id: 'c3', title: 'Consultation', date: '10 Jul 2026', doctor: 'Dr. Kabir Sethi', details: 'Discussed dietary changes and vitamin D supplementation.', attachments: [] },
  ],
  reports: [
    { id: 'r1', title: 'CBC & Fasting Sugar', date: '20 Sep 2026', doctor: 'Thyrocare Diagnostics', details: 'Complete blood count with differential. All values within normal range.', attachments: ['Blood_Test_Report.pdf', 'Lab_Results.pdf'], image: '/img/reports/Axial-non-contrast-computed-tomography-of-head-showing-grade-II-hemorrhagic.png' },
    { id: 'r2', title: 'Chest X-Ray Report', date: '14 Aug 2026', doctor: 'Apollo Imaging Centre', details: 'Chest X-ray for routine screening. No abnormalities detected.', attachments: ['Xray_Report.pdf'], image: '/img/reports/MRI-T2-sequence-showing-intramedullary-spinal-tumor-extending-from-cervico-medullary.png' },
    { id: 'r3', title: 'Prescription - Jul 2026', date: '8 Jul 2026', doctor: 'Dr. Vivek Menon', details: 'Routine endocrinology follow-up. Blood sugar levels stable. Adjusted thyroxine prescription.', attachments: ['Prescription.pdf', 'Lab_Report.pdf'], image: '/img/reports/Axial-contrast-enhanced-computed-tomography-of-abdomen-and-pelvis-showing-a.png' },
  ],
  medications: [
    { id: 'm1', title: 'Metformin 500mg', date: 'Started Jun 2026', doctor: 'Dr. Vivek Menon', details: 'Take twice daily with meals. For blood sugar management.', attachments: ['Metformin_Prescription.pdf'] },
    { id: 'm2', title: 'Vitamin D3 1000IU', date: 'Started May 2026', doctor: 'Dr. Kabir Sethi', details: 'Take once daily in the morning. For vitamin D deficiency.', attachments: [] },
    { id: 'm3', title: 'Telmisartan 40mg', date: 'Started Apr 2026', doctor: 'Dr. Arjun Mehta', details: 'Take once daily in the morning. For blood pressure management.', attachments: ['Telmisartan_Prescription.pdf'] },
    { id: 'm4', title: 'Thyroxine 50mcg', date: 'Started Mar 2026', doctor: 'Dr. Vivek Menon', details: 'Take once daily on an empty stomach.', attachments: [] },
  ],
}

export const recordTabs = [
  { key: 'consultations', label: 'Previous Consultations' },
  { key: 'reports', label: 'Lab Reports' },
  { key: 'medications', label: 'Current Medications' },
]
