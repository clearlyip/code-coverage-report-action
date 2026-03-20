'use strict';
// CJS stub for @actions/artifact.
// Tests that use this package mock DefaultArtifactClient via jest.mock().
// This stub only needs to export the class so the module resolves in CJS mode.

class DefaultArtifactClient {
  async uploadArtifact(name, files, rootDirectory, options) {
    throw new Error('DefaultArtifactClient.uploadArtifact not mocked');
  }

  async downloadArtifact(artifactId, options) {
    throw new Error('DefaultArtifactClient.downloadArtifact not mocked');
  }

  async listArtifacts(options) {
    throw new Error('DefaultArtifactClient.listArtifacts not mocked');
  }

  async getArtifact(artifactName, options) {
    throw new Error('DefaultArtifactClient.getArtifact not mocked');
  }

  async deleteArtifact(artifactName, options) {
    throw new Error('DefaultArtifactClient.deleteArtifact not mocked');
  }
}

module.exports = {
  DefaultArtifactClient,
};
