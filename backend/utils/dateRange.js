// Shared createdAt range filter.
'use strict';

const { Op } = require('sequelize');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// "2026-11-05" parses as midnight, so an `Op.lte` on it silently drops the entire
// end day. Values that already carry a time are passed through untouched, because
// some screens deliberately send an exclusive next-day upper bound.
// End of day is computed in UTC to keep results independent of server timezone.
function inclusiveEnd(endDate) {
  if (DATE_ONLY.test(String(endDate).trim())) {
    return new Date(`${String(endDate).trim()}T23:59:59.999Z`);
  }
  return new Date(endDate);
}

function createdAtRange(startDate, endDate) {
  return { [Op.gte]: new Date(startDate), [Op.lte]: inclusiveEnd(endDate) };
}

module.exports = { createdAtRange, inclusiveEnd };
