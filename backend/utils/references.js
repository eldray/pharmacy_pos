// Sequential, human-readable document references.
//
// Numbers used to be `PREFIX-<epoch ms>-<6 random digits>`. A cashier could not
// read one back over the phone, they sorted by string in nothing like creation
// order, and they collided on the unique constraint often enough to fail a sale
// mid-payment with an opaque 500. They are now a per-prefix counter that starts
// at 1000001, so `MED-1000001` is both readable and obviously the first one.
//
// The counter lives in `document_sequences` and advances with
// `UPDATE ... RETURNING` inside the caller's transaction. Two tills billing at
// the same instant therefore serialise on that row instead of racing, and a sale
// that rolls back does not leave a hole in the numbering.
'use strict';

const { sequelize } = require('../config/database');

// First number issued for every prefix.
const START = 1000001;

// Prefixes the app issues. The comment is what each family covers, because a
// sale and the order it settled share one MED- counter by design.
const FAMILIES = {
  MED: 'POS medicine sale or order',
  LAB: 'lab order or individual lab test',
  REC: 'lab receipt',
  LSO: 'lab service order (legacy screen)',
  CLM: 'insurance claim',
};

/**
 * Issue the next number for `prefix`, e.g. `MED-1000002`.
 *
 * Pass the surrounding transaction so the number is consumed only if the document
 * that uses it is committed.
 *
 * @param {string} prefix
 * @param {{ transaction?: import('sequelize').Transaction }} [options]
 * @returns {Promise<string>}
 */
async function nextReference(prefix, { transaction } = {}) {
  // Self-register an unseen prefix so a new document type cannot 500 the till.
  await sequelize.query(
    `INSERT INTO "document_sequences" ("name", "next_value")
     VALUES (:prefix, :start)
     ON CONFLICT ("name") DO NOTHING`,
    { replacements: { prefix, start: START }, transaction }
  );

  const issued = await sequelize.query(
    `UPDATE "document_sequences"
        SET "next_value" = "next_value" + 1
      WHERE "name" = :prefix
      RETURNING "next_value"`,
    { replacements: { prefix }, transaction, type: sequelize.QueryTypes.SELECT }
  );

  const nextValue = Number(issued && issued[0] && issued[0].next_value);
  if (!Number.isFinite(nextValue)) {
    throw new Error(`Could not issue a ${prefix} document number`);
  }
  // RETURNING gives the post-increment value; the number we hand out is the one before it.
  return `${prefix}-${nextValue - 1}`;
}

module.exports = { nextReference, referenceFamilies: FAMILIES, SEQUENCE_START: START };
