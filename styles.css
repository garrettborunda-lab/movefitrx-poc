@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

body {
    font-family: 'Inter', sans-serif;
    background-color: #f7f7f7;
    min-height: 100vh;
    display: flex;
    justify-content: center;
}

.app-container {
    width: 100%;
    max-width: 420px;
    background-color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    position: relative;
    display: flex;
    flex-direction: column;
    transition: max-width 0.3s ease-in-out;
    min-height: 100vh;
}

/* New: Deeper, Professional Color Palette */
.color-primary-green { color: #059669; } /* Deep Emerald */
.bg-primary-green { background-color: #059669; }
.border-primary-green { border-color: #059669; }

.color-secondary-blue { color: #2563eb; } /* Royal Blue */
.bg-secondary-blue { background-color: #2563eb; }
.border-secondary-blue { border-color: #2563eb; }

@media (min-width: 768px) {
    .app-container.doctor-view {
        max-width: 90%;
        width: 1200px;
    }
}

.tab-button {
    padding: 1rem 0;
    cursor: pointer;
    transition: all 0.3s;
    color: #4a5568;
    border-bottom: 2px solid transparent;
}

.tab-button.active {
    /* Updated: Use new primary green */
    color: #059669;
    font-weight: 700;
    border-bottom: 3px solid #059669;
}

.panel {
    display: none;
    padding: 1.5rem;
    flex-grow: 1;
    overflow-y: auto;
}

.panel.active {
    display: block;
}

.card {
    border-radius: 0.75rem; /* Slightly more rounded */
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); /* Softer shadow */
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb; /* Subtle border for definition */
}

/* Patient Access Code Card Style */
.code-display {
    /* Updated: Cleaner display, slightly darker text */
    background-color: #f1f5f9;
    padding: 0.75rem;
    border-radius: 0.5rem;
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    color: #1f2937;
    letter-spacing: 0.05em;
    border: 1px dashed #d1d5db; /* Dashed border for visual interest */
}

.alert-card {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.alert-success { background-color: #d1fae5; color: #065f46; }
.alert-warning { background-color: #fef3c7; color: #92400e; }
.alert-error { background-color: #fee2e2; color: #991b1b; }

/* Doctor Portal Specific Styles */
.doctor-view #doctor-panel {
    padding: 2rem;
}

/* Modal Overlay Styling */
.modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background-color: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
    width: 100%;
    margin-left: 1rem;
    margin-right: 1rem;
    position: relative;
}

/* Progress Chart Styles (For Clinician View) */
.progress-chart {
    min-height: 200px;
    display: flex;
    align-items: flex-end;
    border-left: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    padding-left: 5px;
    padding-bottom: 5px;
}

.bar-wrapper {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    height: 100%;
    margin: 0 4px;
}

.bar {
    /* Updated: Use new primary green */
    width: 20px;
    background-color: #059669;
    transition: height 0.5s;
    border-radius: 2px 2px 0 0;
    position: relative;
}

.bar-label {
    position: absolute;
    top: -20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #4a5568;
}

.axis-label {
    font-size: 0.7rem;
    margin-top: 2px;
    text-align: center;
    color: #718096;
    width: 28px; /* Fixed width for alignment */
}

/* LMN Modal Markdown Styling for Readability */
.lmn-markdown-style h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 1.5rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
}

.lmn-markdown-style p {
    margin-bottom: 1rem;
    line-height: 1.5;
    color: #4b5563;
}

.lmn-markdown-style strong {
    font-weight: 700;
}

/* Patient Welcome Modal specific styles */
.welcome-email-card {
    background-color: #f8f8ff;
    border: 1px solid #e0e0f0;
    text-align: left;
}

/* Progress Bar for Clinician View */
.progress-container {
    background-color: #e5e7eb;
    border-radius: 9999px; /* Full rounded corners */
    height: 1.5rem;
    overflow: hidden;
    margin-top: 0.5rem;
}

.progress-bar-fill {
    height: 100%;
    /* Updated: Use new primary green */
    background-color: #059669;
    transition: width 0.3s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
}

.progress-text {
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
}

/* Security Seal for Binkey Pay */
.security-seal {
    font-size: 0.875rem;
    font-weight: 600;
    color: #4a5568;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 0;
    border-top: 1px solid #e2e8f0;
    margin-top: 1rem;
}