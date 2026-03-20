'use strict';
// CJS stub for @actions/github.
// Tests that use this package mock getOctokit and context via jest.mock().
// This stub only needs to export the symbols so the module resolves in CJS mode.

function getOctokit(_token, _options) {
  throw new Error('getOctokit not mocked');
}

const context = {
  job: '',
  runId: 0,
  runNumber: 0,
  actor: '',
  workflow: '',
  action: '',
  eventName: '',
  ref: '',
  sha: '',
  repo: { owner: '', repo: '' },
  issue: { owner: '', repo: '', number: 0 },
  payload: {},
};

module.exports = {
  getOctokit,
  context,
};
