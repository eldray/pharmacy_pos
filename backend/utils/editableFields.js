// Role-scoped column allow-lists for PUT handlers.
//
// Several lab endpoints did `const updates = { ...req.body }`, which let any
// authenticated user rewrite prices and payment columns. These lists are the
// single place that decides who may write what.

const RESULT_FIELDS = [
  'status', 'results', 'resultSummary', 'resultInterpretation',
  'notes', 'sampleReceivedAt', 'sampleType', 'priority'
];

// Only lab staff and managers may change what a test is called or priced at.
const LAB_TEST_FIELDS = [...RESULT_FIELDS, 'testType', 'testCategory', 'testPrice', 'quantity'];

// paidAmount / paymentStatus / paymentMethod are set by the /pay route only.
const LAB_TRANSACTION_FIELDS = [
  'status', 'notes', 'patientName', 'patientPhone', 'patientEmail',
  'patientAge', 'patientGender', 'cancellationReason'
];

const LAB_ROLES = ['lab_tech', 'admin', 'manager'];

// LabTest columns writable by this role; empty array = not allowed to edit.
function labTestFieldsFor(role) {
  if (role === 'admin' || role === 'manager') return LAB_TEST_FIELDS;
  if (role === 'lab_tech') return RESULT_FIELDS;
  return [];
}

function isLabRole(role) {
  return LAB_ROLES.includes(role);
}

module.exports = {
  RESULT_FIELDS,
  LAB_TEST_FIELDS,
  LAB_TRANSACTION_FIELDS,
  labTestFieldsFor,
  isLabRole
};
