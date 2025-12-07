// --- MAIN APP INITIALIZATION AND NAVIGATION ---

/**
 * Switches between the Clinician, Patient, and Payment tabs/views.
 * FLOW FIX: Stops and starts the correct observers based on the view.
 */
function switchTab(tabName, matrixId = null, patientName = null, paymentType = null) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    
    stopAllObservers(); // Stop all observers first

    // Handle button activation/view state
    if (tabName !== 'payment') {
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    document.getElementById(`${tabName}-panel`).classList.add('active');

    const container = document.querySelector('.app-container');
    if (tabName === 'doctor') {
        container.classList.add('doctor-view');
        // Hide patient progress view when switching back to main doctor list
        document.getElementById('doctor-progress').classList.add('hidden'); 
        startPatientListObserver(); // Start list observer
    } else {
        container.classList.remove('doctor-view');
    }
    
    // Setup the payment form context if switching to payment
    if (tabName === 'payment' && matrixId && patientName && paymentType) {
        setupPaymentForm(matrixId, patientName, paymentType);
    }
    
    // Show the welcome modal if referral data is pending and we switch to patient view
    if (tabName === 'patient' && PENDING_PATIENT_DATA) {
        showPatientWelcomeModal(PENDING_PATIENT_DATA);
    }
}

/**
 * Initial application setup function.
 */
function initializeApp() {
    // Seed some mock patient data for immediate progress review:
    const initialPatient1 = getAndMarkAvailableCredential();
    const initialPatient2 = getAndMarkAvailableCredential();

    if (initialPatient1) {
        REFERRED_PATIENTS.push({
            name: 'Sarah Connor',
            email: 'sarah.connor@email.com',
            diagnosisId: 'SMT',
            regimenName: 'Hormonal Balance & Strength',
            matrixId: initialPatient1.matrixId,
            gymAccessCode: initialPatient1.gymAccessCode,
            status: 'PAID', // Already paid
            createdAt: Date.now() - 86400000 * 5, // 5 days ago
        });
        // Seed some mock RWE data for Sarah
        PATIENT_RESULTS.push(
            { patientMatrixId: initialPatient1.matrixId, machine: 'Recumbent Bike', exercise: 'Low Intensity Cardio 25 min', metrics: 'Distance: 1.5 mi, Avg HR: 130 BPM', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Leg Press', exercise: '3 Sets x 12 Reps', metrics: 'Weight: 60 lbs, Total Volume: 2160 lbs', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Diverging Seated Row', exercise: '3 Sets x 10 Reps', metrics: 'Weight: 45 lbs, Total Volume: 1350 lbs', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Recumbent Bike', exercise: 'Low Intensity Cardio 25 min', metrics: 'Distance: 1.6 mi, Avg HR: 132 BPM', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Leg Press', exercise: '3 Sets x 12 Reps', metrics: 'Weight: 60 lbs, Total Volume: 2160 lbs', completedAt: getMockPastDate().getTime() },
        );
    }

    if (initialPatient2) {
        REFERRED_PATIENTS.push({
            name: 'Jessica Jones',
            email: 'jessica.jones@email.com',
            diagnosisId: 'OSTE',
            regimenName: 'Bone Density & Balance',
            matrixId: initialPatient2.matrixId,
            gymAccessCode: initialPatient2.gymAccessCode,
            status: 'PENDING_PAYMENT', // Still pending payment
            createdAt: Date.now() - 86400000 * 2, // 2 days ago
        });
    }

    // Perform initial UI setups and start the main observer
    setupDoctorPortal(); // This starts the list observer
    setupPatientPortal();
}

// Attach the main initialization function to the window load event
window.onload = initializeApp;

// --- FIX: Expose necessary functions globally for HTML attributes (onclick) and data access ---
window.switchTab = switchTab;
window.DIAGNOSES = DIAGNOSES;
// Ensure all window functions needed by HTML elements are exposed (they already were, but including them here is safer)
window.closeLMNModal = closeLMNModal;
window.closePatientWelcomeModal = closePatientWelcomeModal;
window.openLMNModal = openLMNModal;
window.showDoctorProgress = showDoctorProgress;