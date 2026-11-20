// Publish the exact artifact receipt returned by upload-pages-artifact.
// Uses the same Pages API and OIDC authorization as actions/deploy-pages.
module.exports = async function deployPages({github, context, core, artifactId,
  buildVersion, wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  artifactAttempts = 18, statusAttempts = 60}) {
  const id = Number(artifactId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Missing uploaded Pages artifact ID');
  if (!/^[0-9a-f]{40}$/i.test(buildVersion)) throw new Error('Missing checked-out source SHA');
  const repo = context.repo;
  const retryable = error => error.status === 404 || error.status >= 500;
  let artifact;
  for (let attempt = 0; attempt < artifactAttempts; attempt++) {
    try {
      artifact = (await github.rest.actions.getArtifact({...repo, artifact_id: id})).data;
      break;
    } catch (error) {
      if (!retryable(error) || attempt + 1 === artifactAttempts) throw error;
      core.info(`Waiting for uploaded Pages artifact (${attempt + 1}/${artifactAttempts})`);
      await wait(5000);
    }
  }
  if (!artifact || Number(artifact.id) !== id || artifact.name !== 'github-pages' || artifact.expired)
    throw new Error('Uploaded Pages artifact identity or availability mismatch');
  if (artifact.workflow_run?.id && Number(artifact.workflow_run.id) !== Number(context.runId))
    throw new Error('Pages artifact belongs to another workflow run');
  if (artifact.size_in_bytes > 1073741824) throw new Error('Pages artifact exceeds 1 GB');

  // Never print the OIDC token or the request payload.
  const oidcToken = await core.getIDToken();
  const created = (await github.request('POST /repos/{owner}/{repo}/pages/deployments', {
    ...repo, artifact_id: id, pages_build_version: buildVersion, oidc_token: oidcToken
  })).data;
  const deploymentId = created.id || created.status_url?.split('/').pop();
  if (!deploymentId) throw new Error('GitHub Pages returned no deployment identity');
  core.info(`Created Pages deployment ${deploymentId} for ${buildVersion}`);
  const failures = new Set(['deployment_failed', 'deployment_content_failed',
    'deployment_cancelled', 'deployment_lost']);
  let completed = false;
  try {
    for (let attempt = 0; attempt < statusAttempts; attempt++) {
      await wait(10000);
      let status;
      try {
        status = (await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}', {
          ...repo, deploymentId
        })).data;
      } catch (error) {
        if (!retryable(error)) throw error;
        continue;
      }
      core.info(`Pages deployment: ${status.status}`);
      if (status.status === 'succeed') {
        completed = true;
        const pageUrl = created.page_url || status.page_url || 'https://bernio.cz/vedator/';
        core.setOutput('page_url', pageUrl);
        core.setOutput('status', 'succeed');
        return {id: deploymentId, page_url: pageUrl};
      }
      if (failures.has(status.status)) {
        completed = true;
        throw new Error(`GitHub Pages: ${status.status}`);
      }
    }
    throw new Error('GitHub Pages deployment timed out');
  } finally {
    if (!completed) {
      await github.request('POST /repos/{owner}/{repo}/pages/deployments/{deploymentId}/cancel', {
        ...repo, deploymentId
      }).catch(() => {});
    }
  }
};
